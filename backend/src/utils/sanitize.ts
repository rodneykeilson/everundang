/**
 * Input Sanitization Utilities
 * 
 * Comprehensive input sanitization for security.
 * Prevents XSS, SQL injection, and other injection attacks.
 * 
 * Features:
 * - HTML entity encoding
 * - XSS pattern removal
 * - SQL injection pattern detection
 * - Safe string normalization
 * - URL validation and sanitization
 * 
 * @module utils/sanitize
 */

/**
 * HTML entities for encoding
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Common XSS patterns to detect and remove
 */
const XSS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /livescript:/gi,
];

/**
 * SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
  /\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b/gi,
  /(\%3D)|(=)[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
];

/**
 * Encodes HTML entities in a string
 */
export function encodeHtmlEntities(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decodes HTML entities in a string
 */
export function decodeHtmlEntities(input: string): string {
  const textarea = {
    // Map of entities to characters
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
  };

  return Object.entries(textarea).reduce(
    (str, [entity, char]) => str.replace(new RegExp(entity, "g"), char),
    input
  );
}

/**
 * Removes potential XSS patterns from a string
 */
export function stripXss(input: string): string {
  let sanitized = input;

  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized;
}

/**
 * Checks if a string contains potential SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitizes a string for safe HTML display
 */
export function sanitizeForHtml(input: string): string {
  const stripped = stripXss(input);
  return encodeHtmlEntities(stripped);
}

/**
 * Sanitizes a string for safe database storage
 * Note: Parameterized queries should always be used, but this provides an extra layer
 */
export function sanitizeForDatabase(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return sanitized;
}

/**
 * Normalizes a name string (removes extra spaces, capitalizes properly)
 */
export function normalizeName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

/**
 * Normalizes a slug (lowercase, hyphens only, no special characters)
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validates and sanitizes a URL
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    // Check for javascript: in any part
    if (input.toLowerCase().includes("javascript:")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validates an email address
 */
export function isValidEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input.trim());
}

/**
 * Sanitizes an email address
 */
export function sanitizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Validates a phone number (basic validation)
 */
export function isValidPhone(input: string): boolean {
  // Remove common phone formatting
  const cleaned = input.replace(/[\s\-\(\)\+\.]/g, "");
  // Check if it's all digits and reasonable length
  return /^\d{6,15}$/.test(cleaned);
}

/**
 * Sanitizes a phone number
 */
export function sanitizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!isValidPhone(trimmed)) {
    return null;
  }
  // Keep the original format but remove dangerous characters
  return trimmed.replace(/[<>&"']/g, "");
}

/**
 * Truncates a string to a maximum length safely
 */
export function truncate(input: string, maxLength: number, suffix = "..."): string {
  if (input.length <= maxLength) {
    return input;
  }
  return input.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes control characters from a string
 */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Comprehensive sanitization for user input
 */
export function sanitizeUserInput(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    normalizeName?: boolean;
  } = {}
): string {
  const { maxLength = 1000, allowHtml = false, normalizeName: shouldNormalizeName = false } = options;

  let sanitized = input;

  // Remove control characters
  sanitized = stripControlChars(sanitized);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Strip XSS if HTML is not allowed
  if (!allowHtml) {
    sanitized = sanitizeForHtml(sanitized);
  }

  // Trim and normalize whitespace
  sanitized = sanitized.trim();

  // Normalize name if requested
  if (shouldNormalizeName) {
    sanitized = normalizeName(sanitized);
  }

  // Truncate if too long
  if (maxLength && sanitized.length > maxLength) {
    sanitized = truncate(sanitized, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes an object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxStringLength?: number;
    maxDepth?: number;
  } = {}
): T {
  const { maxStringLength = 10000, maxDepth = 10 } = options;

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) {
      return null;
    }

    if (typeof value === "string") {
      return sanitizeUserInput(value, { maxLength: maxStringLength });
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1));
    }

    if (value !== null && typeof value === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = sanitizeUserInput(key, { maxLength: 100 });
        sanitized[sanitizedKey] = sanitizeValue(val, depth + 1);
      }
      return sanitized;
    }

    return value;
  }

  return sanitizeValue(obj, 0) as T;
}

/**
 * Validates JSON string safely
 */
export function parseJsonSafe<T = unknown>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

/**
 * Escapes regex special characters in a string
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default {
  encodeHtmlEntities,
  decodeHtmlEntities,
  stripXss,
  containsSqlInjection,
  sanitizeForHtml,
  sanitizeForDatabase,
  normalizeName,
  normalizeSlug,
  sanitizeUrl,
  isValidEmail,
  sanitizeEmail,
  isValidPhone,
  sanitizePhone,
  truncate,
  stripControlChars,
  sanitizeUserInput,
  sanitizeObject,
  parseJsonSafe,
  escapeRegex,
};
