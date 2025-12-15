/**
 * Audit Logging Repository
 * 
 * Comprehensive audit logging system for tracking all critical operations.
 * Provides accountability and security monitoring capabilities.
 * 
 * Features:
 * - Action tracking for all CRUD operations
 * - Actor identification (owner, admin, system)
 * - Metadata storage for detailed context
 * - Query capabilities for security analysis
 * 
 * @module repositories/audit
 */

import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import type { AuditActor } from "../types.js";

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string;
  invitationId: string | null;
  actor: AuditActor;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Audit action categories
 */
export const AuditActions = {
  // Invitation actions
  INVITATION_CREATE: "invitation.create",
  INVITATION_UPDATE: "invitation.update",
  INVITATION_DELETE: "invitation.delete",
  INVITATION_PUBLISH: "invitation.publish",
  INVITATION_CLOSE: "invitation.close",
  
  // RSVP actions
  RSVP_SUBMIT: "rsvp.submit",
  RSVP_UPDATE: "rsvp.update",
  RSVP_DELETE: "rsvp.delete",
  
  // Guestbook actions
  GUESTBOOK_ADD: "guestbook.add",
  GUESTBOOK_DELETE: "guestbook.delete",
  GUESTBOOK_MODERATE: "guestbook.moderate",
  
  // Guest code actions
  GUEST_CODE_GENERATE: "guest_code.generate",
  GUEST_CODE_USE: "guest_code.use",
  GUEST_CODE_DELETE: "guest_code.delete",
  
  // Owner actions
  OWNER_LINK_ROTATE: "owner.link_rotate",
  OWNER_ACCESS: "owner.access",
  
  // Admin actions
  ADMIN_ACCESS: "admin.access",
  ADMIN_OVERRIDE: "admin.override",
  
  // Gift registry actions
  GIFT_ITEM_ADD: "gift.item_add",
  GIFT_ITEM_DELETE: "gift.item_delete",
  GIFT_ITEM_RESERVE: "gift.item_reserve",
  GIFT_ITEM_UNRESERVE: "gift.item_unreserve",
  GIFT_PREFERENCES_UPDATE: "gift.preferences_update",
  
  // Security actions
  RATE_LIMIT_EXCEEDED: "security.rate_limit",
  SUSPICIOUS_ACTIVITY: "security.suspicious",
  AUTH_FAILURE: "security.auth_failure",
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

/**
 * Options for creating an audit log entry
 */
export interface CreateAuditLogOptions {
  invitationId?: string | null;
  actor: AuditActor;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  userAgent?: string;
}

/**
 * Query options for listing audit logs
 */
export interface AuditLogQueryOptions {
  invitationId?: string;
  actor?: AuditActor;
  action?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(options: CreateAuditLogOptions): Promise<AuditLogEntry> {
  const id = uuidv4();
  const metadata = {
    ...options.metadata,
    ...(options.ipHash && { ipHash: options.ipHash }),
    ...(options.userAgent && { userAgent: options.userAgent }),
    timestamp: new Date().toISOString(),
  };

  const result = await pool.query(
    `INSERT INTO audit_logs (
      id, invitation_id, actor, action, target_type, target_id, meta_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      invitation_id as "invitationId",
      actor,
      action,
      target_type as "targetType",
      target_id as "targetId",
      meta_json as "metadata",
      created_at as "createdAt"`,
    [
      id,
      options.invitationId ?? null,
      options.actor,
      options.action,
      options.targetType ?? null,
      options.targetId ?? null,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0];
}

/**
 * Lists audit logs with filtering options
 */
export async function listAuditLogs(options: AuditLogQueryOptions = {}): Promise<{
  entries: AuditLogEntry[];
  total: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.invitationId) {
    conditions.push(`invitation_id = $${paramIndex++}`);
    params.push(options.invitationId);
  }

  if (options.actor) {
    conditions.push(`actor = $${paramIndex++}`);
    params.push(options.actor);
  }

  if (options.action) {
    conditions.push(`action LIKE $${paramIndex++}`);
    params.push(`${options.action}%`);
  }

  if (options.targetType) {
    conditions.push(`target_type = $${paramIndex++}`);
    params.push(options.targetType);
  }

  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate.toISOString());
  }

  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate.toISOString());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const [entriesResult, countResult] = await Promise.all([
    pool.query(
      `SELECT
        id,
        invitation_id as "invitationId",
        actor,
        action,
        target_type as "targetType",
        target_id as "targetId",
        meta_json as "metadata",
        created_at as "createdAt"
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int as total FROM audit_logs ${whereClause}`,
      params
    ),
  ]);

  return {
    entries: entriesResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
}

/**
 * Gets audit logs for a specific invitation
 */
export async function getInvitationAuditLogs(
  invitationId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const result = await pool.query(
    `SELECT
      id,
      invitation_id as "invitationId",
      actor,
      action,
      target_type as "targetType",
      target_id as "targetId",
      meta_json as "metadata",
      created_at as "createdAt"
    FROM audit_logs
    WHERE invitation_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [invitationId, limit]
  );

  return result.rows;
}

/**
 * Gets recent security-related audit logs
 */
export async function getSecurityLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const result = await pool.query(
    `SELECT
      id,
      invitation_id as "invitationId",
      actor,
      action,
      target_type as "targetType",
      target_id as "targetId",
      meta_json as "metadata",
      created_at as "createdAt"
    FROM audit_logs
    WHERE action LIKE 'security.%'
    ORDER BY created_at DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Gets audit summary statistics
 */
export async function getAuditStats(invitationId?: string): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByActor: Record<string, number>;
  recentActivity: AuditLogEntry[];
}> {
  const whereClause = invitationId ? "WHERE invitation_id = $1" : "";
  const params = invitationId ? [invitationId] : [];

  const [totalResult, byTypeResult, byActorResult, recentResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int as total FROM audit_logs ${whereClause}`,
      params
    ),
    pool.query(
      `SELECT action, COUNT(*)::int as count 
       FROM audit_logs ${whereClause}
       GROUP BY action 
       ORDER BY count DESC 
       LIMIT 20`,
      params
    ),
    pool.query(
      `SELECT actor, COUNT(*)::int as count 
       FROM audit_logs ${whereClause}
       GROUP BY actor`,
      params
    ),
    pool.query(
      `SELECT
        id,
        invitation_id as "invitationId",
        actor,
        action,
        target_type as "targetType",
        target_id as "targetId",
        meta_json as "metadata",
        created_at as "createdAt"
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 10`,
      params
    ),
  ]);

  const actionsByType: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    actionsByType[row.action] = row.count;
  }

  const actionsByActor: Record<string, number> = {};
  for (const row of byActorResult.rows) {
    actionsByActor[row.actor] = row.count;
  }

  return {
    totalActions: totalResult.rows[0]?.total ?? 0,
    actionsByType,
    actionsByActor,
    recentActivity: recentResult.rows,
  };
}

/**
 * Cleans up old audit logs (retention policy)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await pool.query(
    `DELETE FROM audit_logs WHERE created_at < $1`,
    [cutoffDate.toISOString()]
  );

  return result.rowCount ?? 0;
}

/**
 * Helper function to log invitation actions
 */
export function logInvitationAction(
  invitationId: string,
  action: AuditAction,
  actor: AuditActor,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return createAuditLog({
    invitationId,
    actor,
    action,
    targetType: "invitation",
    targetId: invitationId,
    metadata,
  });
}

/**
 * Helper function to log RSVP actions
 */
export function logRsvpAction(
  invitationId: string,
  rsvpId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return createAuditLog({
    invitationId,
    actor: "system",
    action,
    targetType: "rsvp",
    targetId: rsvpId,
    metadata,
  });
}

/**
 * Helper function to log security events
 */
export function logSecurityEvent(
  action: AuditAction,
  metadata: Record<string, unknown>
): Promise<AuditLogEntry> {
  return createAuditLog({
    actor: "system",
    action,
    targetType: "security",
    metadata,
  });
}

export default {
  AuditActions,
  createAuditLog,
  listAuditLogs,
  getInvitationAuditLogs,
  getSecurityLogs,
  getAuditStats,
  cleanupOldAuditLogs,
  logInvitationAction,
  logRsvpAction,
  logSecurityEvent,
};
