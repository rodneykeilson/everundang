import dotenv from "dotenv";

dotenv.config();

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "");

export const PORT = Number(process.env.PORT ?? "4000");
export const DATABASE_URL = required(process.env.DATABASE_URL, "DATABASE_URL");
export const ADMIN_SECRET = required(process.env.ADMIN_SECRET, "ADMIN_SECRET");
export const FRONTEND_URL = normalizeUrl(process.env.FRONTEND_URL ?? "http://localhost:5173");
export const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS ?? FRONTEND_URL)
  .split(",")
  .map((origin) => normalizeUrl(origin))
  .filter(Boolean);
export const INVITE_OWNER_JWT_SECRET = required(
  process.env.INVITE_OWNER_JWT_SECRET,
  "INVITE_OWNER_JWT_SECRET",
);
export const OWNER_TOKEN_TTL_SECONDS = Number(
  process.env.OWNER_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30,
);
export const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
