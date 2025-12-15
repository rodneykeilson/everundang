/**
 * Smart Rate Limiting Middleware
 * 
 * Advanced rate limiting system with behavioral analysis that adapts based on
 * user behavior patterns, not just fixed thresholds.
 * 
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Progressive delays for suspicious activity
 * - Device fingerprint correlation
 * - IP-based tracking with configurable limits
 * - Endpoint-specific rate limits
 * 
 * @module middleware/rateLimit
 */

import { Request, Response, NextFunction } from "express";

/**
 * Rate limit configuration for different endpoint categories
 */
export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Progressive delay multiplier for repeated violations */
  delayMultiplier?: number;
  /** Maximum delay in milliseconds */
  maxDelayMs?: number;
  /** Whether to skip rate limiting for this endpoint */
  skip?: boolean;
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string;
  /** Message to return when rate limited */
  message?: string;
}

/**
 * Request record for tracking rate limit state
 */
interface RequestRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
  violations: number;
  blocked: boolean;
  blockedUntil?: number;
}

/**
 * Behavioral analysis data for detecting suspicious patterns
 */
interface BehaviorRecord {
  requestTimes: number[];
  endpoints: Map<string, number>;
  userAgent: string | null;
  suspicionScore: number;
  lastAnalysis: number;
}

/**
 * In-memory store for rate limit records
 * In production, consider using Redis for distributed systems
 */
const requestStore = new Map<string, RequestRecord>();
const behaviorStore = new Map<string, BehaviorRecord>();

/**
 * Default rate limit configurations by endpoint category
 */
const defaultConfigs: Record<string, RateLimitConfig> = {
  // General API endpoints
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 1.5,
    maxDelayMs: 30000,
    message: "Too many requests. Please try again later.",
  },
  // RSVP submissions - stricter limits
  rsvp: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 2,
    maxDelayMs: 60000,
    message: "Too many RSVP attempts. Please wait before trying again.",
  },
  // Guestbook entries - moderate limits
  guestbook: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 2,
    maxDelayMs: 120000,
    message: "Please wait before adding another message.",
  },
  // Authentication endpoints - strict limits
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayMultiplier: 3,
    maxDelayMs: 300000, // 5 minutes
    message: "Too many authentication attempts. Please try again later.",
  },
  // Admin endpoints - moderate limits
  admin: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 1.5,
    maxDelayMs: 60000,
    message: "Admin rate limit exceeded.",
  },
  // Read-only endpoints - generous limits
  read: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 1.2,
    maxDelayMs: 10000,
    message: "Too many requests. Please slow down.",
  },
  // Guest code generation - very strict
  guestCodes: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
    delayMultiplier: 3,
    maxDelayMs: 180000, // 3 minutes
    message: "Please wait before generating more guest codes.",
  },
};

/**
 * Normalizes an IP address by removing IPv6-mapped IPv4 prefix
 */
const normalizeIp = (ip?: string): string => {
  if (!ip) return "unknown";
  return ip.replace(/^::ffff:/, "");
};

/**
 * Generates a unique key for rate limiting based on IP and optional fingerprint
 */
const generateKey = (req: Request, category: string): string => {
  const ip = normalizeIp(req.ip);
  const fingerprint = req.get("x-device-fingerprint") ?? "";
  return `${category}:${ip}:${fingerprint}`;
};

/**
 * Cleans up expired records from the stores
 */
const cleanupExpiredRecords = (): void => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [key, record] of requestStore) {
    if (now - record.lastRequest > maxAge) {
      requestStore.delete(key);
    }
  }

  for (const [key, record] of behaviorStore) {
    if (now - record.lastAnalysis > maxAge) {
      behaviorStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

/**
 * Analyzes request behavior to detect suspicious patterns
 */
const analyzeBehavior = (req: Request, key: string): number => {
  const now = Date.now();
  const ip = normalizeIp(req.ip);
  const behaviorKey = `behavior:${ip}`;
  
  let behavior = behaviorStore.get(behaviorKey);
  if (!behavior) {
    behavior = {
      requestTimes: [],
      endpoints: new Map(),
      userAgent: req.get("user-agent") ?? null,
      suspicionScore: 0,
      lastAnalysis: now,
    };
    behaviorStore.set(behaviorKey, behavior);
  }

  // Track request timing
  behavior.requestTimes.push(now);
  
  // Keep only last 100 requests for analysis
  if (behavior.requestTimes.length > 100) {
    behavior.requestTimes = behavior.requestTimes.slice(-100);
  }

  // Track endpoint access patterns
  const endpoint = req.path;
  behavior.endpoints.set(endpoint, (behavior.endpoints.get(endpoint) ?? 0) + 1);

  // Calculate suspicion score based on patterns
  let suspicionScore = 0;

  // Check for rapid-fire requests (more than 10 requests in 1 second)
  const recentRequests = behavior.requestTimes.filter(t => now - t < 1000);
  if (recentRequests.length > 10) {
    suspicionScore += 30;
  } else if (recentRequests.length > 5) {
    suspicionScore += 15;
  }

  // Check for consistent timing (bot-like behavior)
  if (behavior.requestTimes.length >= 5) {
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(10, behavior.requestTimes.length); i++) {
      intervals.push(behavior.requestTimes[i] - behavior.requestTimes[i - 1]);
    }
    
    if (intervals.length >= 4) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      
      // Very consistent timing (stdDev < 50ms) is suspicious
      if (stdDev < 50 && avgInterval < 500) {
        suspicionScore += 25;
      }
    }
  }

  // Check for missing or suspicious user agent
  if (!behavior.userAgent || behavior.userAgent.length < 10) {
    suspicionScore += 10;
  }

  // Decay suspicion score over time
  const timeSinceLastAnalysis = now - behavior.lastAnalysis;
  const decayFactor = Math.max(0, 1 - (timeSinceLastAnalysis / (5 * 60 * 1000))); // Decay over 5 minutes
  behavior.suspicionScore = Math.max(0, behavior.suspicionScore * decayFactor + suspicionScore);
  behavior.lastAnalysis = now;

  return behavior.suspicionScore;
};

/**
 * Calculates progressive delay based on violations and suspicion score
 */
const calculateDelay = (
  violations: number,
  suspicionScore: number,
  config: RateLimitConfig
): number => {
  const baseDelay = 1000; // 1 second base delay
  const multiplier = config.delayMultiplier ?? 1.5;
  const maxDelay = config.maxDelayMs ?? 30000;
  
  // Exponential backoff based on violations
  let delay = baseDelay * Math.pow(multiplier, violations);
  
  // Add extra delay based on suspicion score
  delay += (suspicionScore / 100) * 5000;
  
  return Math.min(delay, maxDelay);
};

/**
 * Creates a rate limiting middleware for a specific endpoint category
 */
export const createRateLimiter = (category: string = "default") => {
  const config = defaultConfigs[category] ?? defaultConfigs.default;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting if configured
    if (config.skip) {
      next();
      return;
    }

    const now = Date.now();
    const key = config.keyGenerator ? config.keyGenerator(req) : generateKey(req, category);

    // Get or create request record
    let record = requestStore.get(key);
    if (!record) {
      record = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        violations: 0,
        blocked: false,
      };
      requestStore.set(key, record);
    }

    // Check if currently blocked
    if (record.blocked && record.blockedUntil) {
      if (now < record.blockedUntil) {
        const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", record.blockedUntil.toString());
        res.status(429).json({
          message: config.message,
          retryAfter,
        });
        return;
      }
      // Block period expired, reset
      record.blocked = false;
      record.blockedUntil = undefined;
    }

    // Reset window if expired
    if (now - record.firstRequest > config.windowMs) {
      record.count = 0;
      record.firstRequest = now;
      // Gradually reduce violations over time
      record.violations = Math.max(0, record.violations - 1);
    }

    // Increment request count
    record.count++;
    record.lastRequest = now;

    // Analyze behavior for suspicious patterns
    const suspicionScore = analyzeBehavior(req, key);

    // Calculate remaining requests
    const remaining = Math.max(0, config.maxRequests - record.count);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", (record.firstRequest + config.windowMs).toString());

    // Check if over limit
    if (record.count > config.maxRequests) {
      record.violations++;
      
      // Calculate block duration based on violations and suspicion
      const blockDuration = calculateDelay(record.violations, suspicionScore, config);
      record.blocked = true;
      record.blockedUntil = now + blockDuration;

      const retryAfter = Math.ceil(blockDuration / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        message: config.message,
        retryAfter,
        violations: record.violations,
      });
      return;
    }

    // Add artificial delay for suspicious requests
    if (suspicionScore > 50) {
      const delay = Math.min(suspicionScore * 10, 2000); // Max 2 second delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    next();
  };
};

/**
 * Get rate limit statistics (for monitoring)
 */
export const getRateLimitStats = (): {
  activeRecords: number;
  blockedIps: number;
  behaviorRecords: number;
  highSuspicionCount: number;
} => {
  let blockedCount = 0;
  let highSuspicionCount = 0;
  const now = Date.now();

  for (const record of requestStore.values()) {
    if (record.blocked && record.blockedUntil && now < record.blockedUntil) {
      blockedCount++;
    }
  }

  for (const behavior of behaviorStore.values()) {
    if (behavior.suspicionScore > 50) {
      highSuspicionCount++;
    }
  }

  return {
    activeRecords: requestStore.size,
    blockedIps: blockedCount,
    behaviorRecords: behaviorStore.size,
    highSuspicionCount,
  };
};

/**
 * Clear rate limit records for a specific key (for testing/admin)
 */
export const clearRateLimitRecord = (ip: string): void => {
  const normalizedIp = normalizeIp(ip);
  
  for (const key of requestStore.keys()) {
    if (key.includes(normalizedIp)) {
      requestStore.delete(key);
    }
  }
  
  behaviorStore.delete(`behavior:${normalizedIp}`);
};

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** General API rate limiter */
  general: createRateLimiter("default"),
  /** RSVP submission rate limiter */
  rsvp: createRateLimiter("rsvp"),
  /** Guestbook entry rate limiter */
  guestbook: createRateLimiter("guestbook"),
  /** Authentication rate limiter */
  auth: createRateLimiter("auth"),
  /** Admin endpoint rate limiter */
  admin: createRateLimiter("admin"),
  /** Read-only endpoint rate limiter */
  read: createRateLimiter("read"),
  /** Guest code generation rate limiter */
  guestCodes: createRateLimiter("guestCodes"),
};

export default rateLimiters;
