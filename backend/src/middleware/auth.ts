import type { NextFunction, Request, Response } from "express";
import type { InvitationRecord } from "../types.js";
import {
  ADMIN_KEY_HEADER,
  isAdminKeyValid,
  readAdminKey,
  isIpAllowed,
  validateOwnerToken,
} from "../utils/auth.js";

export interface OwnerContext {
  invitation: InvitationRecord;
  token: { invId: string; sec: string; iat: number; exp: number };
}

declare module "express-serve-static-core" {
  interface Request {
    ownerContext?: OwnerContext;
    adminContext?: { key: string };
  }
}

const OWNER_TOKEN_HEADER = "x-owner-token";

function resolveAdminKey(req: Request) {
  const headerKey = readAdminKey(req.get(ADMIN_KEY_HEADER));
  const legacyHeaderKey = readAdminKey(req.get("x-admin-secret"));
  const queryParam = Array.isArray(req.query.k) ? req.query.k[0] : req.query.k;
  const queryKey = readAdminKey(queryParam);
  return headerKey ?? legacyHeaderKey ?? queryKey;
}

function extractOwnerToken(req: Request) {
  const headerToken = req.get(OWNER_TOKEN_HEADER);
  if (headerToken) return headerToken;
  const authHeader = req.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const queryToken = typeof req.query.k === "string" ? req.query.k : undefined;
  if (queryToken) return queryToken;
  return undefined;
}

export async function requireOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractOwnerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Owner token required" });
    }
    const { invitation, payload } = await validateOwnerToken(token);
    const targetId = req.params.id ?? req.params.invitationId ?? req.body?.invitationId ?? null;
    if (targetId && targetId !== payload.invId) {
      return res.status(403).json({ message: "Owner token not valid for resource" });
    }
    req.ownerContext = {
      invitation,
      token: payload,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Owner token invalid" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminKey = resolveAdminKey(req);
  if (!adminKey || !isAdminKeyValid(adminKey)) {
    return res.status(401).json({ message: "Admin key invalid" });
  }
  if (!isIpAllowed(req.ip)) {
    return res.status(403).json({ message: "IP not allowed" });
  }
  req.adminContext = { key: adminKey };
  return next();
}

export async function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const adminKey = resolveAdminKey(req);
  if (adminKey && isAdminKeyValid(adminKey)) {
    if (!isIpAllowed(req.ip)) {
      return res.status(403).json({ message: "IP not allowed" });
    }
    req.adminContext = { key: adminKey };
    return next();
  }
  return requireOwner(req, res, next);
}
