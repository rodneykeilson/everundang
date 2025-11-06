import { Pool } from "pg";
import { DATABASE_URL } from "./config.js";

const shouldUseSsl =
  process.env.PGSSLMODE === "require" || DATABASE_URL.includes("render.com");

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invitations (
      id UUID PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      headline TEXT NOT NULL,
      couple JSONB NOT NULL,
      event JSONB NOT NULL,
      sections JSONB NOT NULL DEFAULT '[]'::jsonb,
      theme JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guestbook_entries (
      id UUID PRIMARY KEY,
      invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      guest_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
