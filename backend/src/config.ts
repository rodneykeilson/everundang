import dotenv from "dotenv";

dotenv.config();

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const PORT = Number(process.env.PORT ?? "4000");
export const DATABASE_URL = required(process.env.DATABASE_URL, "DATABASE_URL");
export const ADMIN_SECRET = required(process.env.ADMIN_SECRET, "ADMIN_SECRET");
export const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
export const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS ?? FRONTEND_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
