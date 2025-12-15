/**
 * Audit Logging Middleware
 * 
 * Express middleware for automatic audit logging of API requests.
 * Tracks request/response details and integrates with the audit repository.
 * 
 * @module middleware/audit
 */

import { Request, Response, NextFunction } from "express";
import { createAuditLog, AuditActions, type AuditAction } from "../repositories/audit.js";
import type { AuditActor } from "../types.js";
import { createHash } from "crypto";

/**
 * Hashes sensitive data for logging
 */
const hashSensitive = (value: string): string => {
  return createHash("sha256").update(value).digest("hex").substring(0, 16);
};

/**
 * Extracts actor type from request context
 */
const getActorFromRequest = (req: Request): AuditActor => {
  if (req.get("x-admin-k") || req.get("x-admin-secret")) {
    return "admin";
  }
  if (req.get("x-owner-token") || req.ownerContext) {
    return "owner";
  }
  return "system";
};

/**
 * Gets safe metadata from request for logging
 */
const getSafeMetadata = (req: Request): Record<string, unknown> => {
  const ip = req.ip?.replace(/^::ffff:/, "") ?? "unknown";
  return {
    method: req.method,
    path: req.path,
    userAgent: req.get("user-agent")?.substring(0, 200),
    ipHash: hashSensitive(ip),
    contentLength: req.get("content-length"),
    referer: req.get("referer"),
  };
};

/**
 * Audit configuration for specific routes
 */
interface AuditRouteConfig {
  action: AuditAction;
  extractInvitationId?: (req: Request) => string | null;
  extractTargetId?: (req: Request) => string | null;
  extractTargetType?: (req: Request) => string;
  extractMetadata?: (req: Request, res: Response) => Record<string, unknown>;
  skipCondition?: (req: Request, res: Response) => boolean;
}

/**
 * Creates an audit logging middleware for a specific action
 */
export const auditAction = (config: AuditRouteConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    let responseBody: unknown = null;

    // Override json to capture response
    res.json = function(body: unknown) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Override end to log after response
    const wrappedEnd: typeof originalEnd = function(
      this: Response,
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void
    ) {
      // Restore original functions
      res.end = originalEnd;
      res.json = originalJson;

      // Skip logging if condition is met
      if (config.skipCondition?.(req, res)) {
        return originalEnd.call(this, chunk, encodingOrCallback as BufferEncoding, callback);
      }

      // Only log successful or specific responses
      const shouldLog = res.statusCode < 500;
      
      if (shouldLog) {
        const actor = getActorFromRequest(req);
        const invitationId = config.extractInvitationId?.(req) ?? 
          req.params.id ?? 
          req.params.invitationId ?? 
          null;
        
        const metadata = {
          ...getSafeMetadata(req),
          statusCode: res.statusCode,
          ...config.extractMetadata?.(req, res),
        };

        // Log asynchronously (fire and forget)
        createAuditLog({
          invitationId,
          actor,
          action: config.action,
          targetType: config.extractTargetType?.(req),
          targetId: config.extractTargetId?.(req) ?? undefined,
          metadata,
        }).catch((error) => {
          console.error("Failed to create audit log:", error);
        });
      }

      return originalEnd.call(this, chunk, encodingOrCallback as BufferEncoding, callback);
    } as typeof originalEnd;

    res.end = wrappedEnd;

    next();
  };
};

/**
 * Pre-configured audit middleware for common actions
 */
export const auditMiddleware = {
  /**
   * Audit invitation creation
   */
  invitationCreate: auditAction({
    action: AuditActions.INVITATION_CREATE,
    extractMetadata: (req) => ({
      slug: req.body?.slug,
      headline: req.body?.headline,
    }),
  }),

  /**
   * Audit invitation update
   */
  invitationUpdate: auditAction({
    action: AuditActions.INVITATION_UPDATE,
    extractInvitationId: (req) => req.params.id ?? req.params.slug,
    extractMetadata: (req) => ({
      fields: Object.keys(req.body ?? {}),
    }),
  }),

  /**
   * Audit invitation deletion
   */
  invitationDelete: auditAction({
    action: AuditActions.INVITATION_DELETE,
    extractInvitationId: (req) => req.params.id,
  }),

  /**
   * Audit RSVP submission
   */
  rsvpSubmit: auditAction({
    action: AuditActions.RSVP_SUBMIT,
    extractTargetType: () => "rsvp",
    extractMetadata: (req) => ({
      guestName: req.body?.name,
      status: req.body?.status,
      partySize: req.body?.partySize,
    }),
  }),

  /**
   * Audit guestbook entry
   */
  guestbookAdd: auditAction({
    action: AuditActions.GUESTBOOK_ADD,
    extractTargetType: () => "guestbook",
    extractMetadata: (req) => ({
      guestName: req.body?.guestName,
    }),
  }),

  /**
   * Audit guest code generation
   */
  guestCodeGenerate: auditAction({
    action: AuditActions.GUEST_CODE_GENERATE,
    extractTargetType: () => "guest_code",
    extractMetadata: (req) => ({
      quantity: req.body?.quantity,
      prefix: req.body?.prefix,
    }),
  }),

  /**
   * Audit owner link rotation
   */
  ownerLinkRotate: auditAction({
    action: AuditActions.OWNER_LINK_ROTATE,
    extractInvitationId: (req) => req.params.id,
  }),

  /**
   * Audit owner access
   */
  ownerAccess: auditAction({
    action: AuditActions.OWNER_ACCESS,
    extractInvitationId: (req) => req.params.id,
    skipCondition: (_, res) => res.statusCode >= 400,
  }),

  /**
   * Audit admin access
   */
  adminAccess: auditAction({
    action: AuditActions.ADMIN_ACCESS,
    extractMetadata: (req) => ({
      endpoint: req.path,
    }),
  }),

  /**
   * Audit gift item addition
   */
  giftItemAdd: auditAction({
    action: AuditActions.GIFT_ITEM_ADD,
    extractTargetType: () => "gift_item",
    extractMetadata: (req) => ({
      name: req.body?.name,
      category: req.body?.category,
    }),
  }),

  /**
   * Audit gift reservation
   */
  giftReserve: auditAction({
    action: AuditActions.GIFT_ITEM_RESERVE,
    extractTargetType: () => "gift_item",
    extractTargetId: (req) => req.params.itemId,
    extractMetadata: (req) => ({
      guestName: req.body?.guestName,
    }),
  }),
};

/**
 * Global request logging middleware
 * Logs all API requests for monitoring purposes
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log on response finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? "warn" : "info";
    
    // Skip health check endpoints
    if (req.path === "/health") {
      return;
    }

    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip?.replace(/^::ffff:/, ""),
    };

    if (logLevel === "warn") {
      console.warn("Request completed with error:", logData);
    }
  });

  next();
};

export default {
  auditAction,
  auditMiddleware,
  requestLogger,
};
