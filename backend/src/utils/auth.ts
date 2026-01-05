import crypto from "crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import {
  ADMIN_SECRET,
  ADMIN_IP_ALLOWLIST,
  INVITE_OWNER_JWT_SECRET,
  OWNER_TOKEN_TTL_SECONDS,
} from "../config.js";
import { getInvitationById } from "../repositories/invitations.js";

export interface OwnerTokenPayload {
  invId: string;
  sec: string;
  iat: number;
  exp: number;
}

export const generateOwnerSecret = () => crypto.randomBytes(32).toString("base64url");

export const hashSecret = (raw: string) =>
  argon2.hash(raw, { type: argon2.argon2id, memoryCost: 64 * 1024 });

export const verifySecret = (hash: string, raw: string) => argon2.verify(hash, raw);

export const signOwnerToken = (invId: string, secret: string) =>
  jwt.sign({ invId, sec: secret }, INVITE_OWNER_JWT_SECRET, {
    expiresIn: OWNER_TOKEN_TTL_SECONDS,
  });

export const verifyOwnerToken = (token: string) =>
  jwt.verify(token, INVITE_OWNER_JWT_SECRET) as OwnerTokenPayload;

export const isIpAllowed = (ip: string | undefined) => {
  if (!ADMIN_IP_ALLOWLIST.length) {
    return true;
  }
  if (!ip) {
    return false;
  }
  const normalized = ip.replace(/^::ffff:/, "");
  return ADMIN_IP_ALLOWLIST.includes(normalized);
};

export async function validateOwnerToken(token: string) {
  const payload = verifyOwnerToken(token);
  const invitation = await getInvitationById(payload.invId);
  if (!invitation || !invitation.ownerSecretHash) {
    throw new Error("Invitation not found or owner secret missing");
  }
  const matches = await verifySecret(invitation.ownerSecretHash, payload.sec);
  if (!matches) {
    throw new Error("Owner token invalid");
  }
  return { payload, invitation };
}

export const ADMIN_KEY_HEADER = "x-admin-k";

export const readAdminKey = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const isAdminKeyValid = (key: string | undefined) => key === ADMIN_SECRET;
