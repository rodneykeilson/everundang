import { Pool } from "pg";
import { DATABASE_URL } from "./config.js";

const shouldUseSsl =
  process.env.PGSSLMODE === "require" || DATABASE_URL.includes("render.com");

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

const quoteLiteral = (value: string) => value.replace(/'/g, "''");

async function ensureEnum(name: string, values: string[]) {
  const formattedValues = values.map((value) => `'${quoteLiteral(value)}'`).join(", ");
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${quoteLiteral(name)}') THEN
        CREATE TYPE ${name} AS ENUM (${formattedValues});
      END IF;
    END
    $$;
  `);
}

export async function initDatabase() {
  // Ensure enum types exist for upcoming feature work.
  await ensureEnum("invitation_status", ["draft", "published", "closed"]);
  await ensureEnum("invitation_rsvp_mode", ["passcode", "guest_codes", "open"]);
  await ensureEnum("rsvp_status", ["yes", "maybe", "no"]);
  await ensureEnum("media_kind", ["cover", "gallery"]);
  await ensureEnum("audit_actor", ["owner", "admin", "system"]);

  const statements: string[] = [
    `CREATE TABLE IF NOT EXISTS invitations (
       id UUID PRIMARY KEY,
       slug TEXT UNIQUE NOT NULL,
       headline TEXT NOT NULL,
       couple JSONB NOT NULL,
       event JSONB NOT NULL,
       sections JSONB NOT NULL DEFAULT '[]'::jsonb,
       theme JSONB NOT NULL DEFAULT '{}'::jsonb,
       is_published BOOLEAN NOT NULL DEFAULT FALSE,
       title TEXT,
       date_iso TEXT,
       time_str TEXT,
       venue TEXT,
       cover_url TEXT,
       theme_json JSONB NOT NULL DEFAULT '{}'::jsonb,
       status invitation_status NOT NULL DEFAULT 'draft',
       rsvp_mode invitation_rsvp_mode NOT NULL DEFAULT 'open',
       rsvp_passcode_hash TEXT,
       capacity INTEGER,
       owner_secret_hash TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `ALTER TABLE invitations
       ADD COLUMN IF NOT EXISTS title TEXT,
       ADD COLUMN IF NOT EXISTS date_iso TEXT,
       ADD COLUMN IF NOT EXISTS time_str TEXT,
       ADD COLUMN IF NOT EXISTS venue TEXT,
       ADD COLUMN IF NOT EXISTS cover_url TEXT,
       ADD COLUMN IF NOT EXISTS theme_json JSONB NOT NULL DEFAULT '{}'::jsonb,
       ADD COLUMN IF NOT EXISTS status invitation_status NOT NULL DEFAULT 'draft',
       ADD COLUMN IF NOT EXISTS rsvp_mode invitation_rsvp_mode NOT NULL DEFAULT 'open',
       ADD COLUMN IF NOT EXISTS rsvp_passcode_hash TEXT,
       ADD COLUMN IF NOT EXISTS capacity INTEGER,
       ADD COLUMN IF NOT EXISTS owner_secret_hash TEXT;`,
    `ALTER TABLE invitations
       ALTER COLUMN theme_json SET DEFAULT '{}'::jsonb,
       ALTER COLUMN status SET DEFAULT 'draft',
       ALTER COLUMN rsvp_mode SET DEFAULT 'open';`,
    `CREATE TABLE IF NOT EXISTS guestbook_entries (
       id UUID PRIMARY KEY,
       invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
       guest_name TEXT NOT NULL,
       message TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE TABLE IF NOT EXISTS rsvps (
       id UUID PRIMARY KEY,
       invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       normalized_name TEXT NOT NULL,
       phone TEXT,
       status rsvp_status NOT NULL DEFAULT 'yes',
       party_size INTEGER NOT NULL DEFAULT 1,
       message TEXT,
       device_hash TEXT,
       ip_hash TEXT,
       edit_token_hash TEXT,
       edit_token_expires_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rsvps_invitation_normalized_name_idx
       ON rsvps (invitation_id, normalized_name);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rsvps_invitation_phone_unique_idx
       ON rsvps (invitation_id, phone)
       WHERE phone IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS rsvps_device_hash_idx ON rsvps (invitation_id, device_hash);`,
    `CREATE INDEX IF NOT EXISTS rsvps_ip_hash_idx ON rsvps (invitation_id, ip_hash);`,
    `CREATE TABLE IF NOT EXISTS guest_codes (
       id UUID PRIMARY KEY,
       invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
       code_hash TEXT NOT NULL,
       issued_to TEXT,
       used_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS guest_codes_code_hash_idx
       ON guest_codes (invitation_id, code_hash);`,
    `CREATE TABLE IF NOT EXISTS media_assets (
       id UUID PRIMARY KEY,
       invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
       kind media_kind NOT NULL,
       url TEXT NOT NULL,
       meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE INDEX IF NOT EXISTS media_assets_invitation_kind_idx
       ON media_assets (invitation_id, kind);`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
       id UUID PRIMARY KEY,
       invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
       actor audit_actor NOT NULL,
       action TEXT NOT NULL,
       target_type TEXT,
       target_id TEXT,
       meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE INDEX IF NOT EXISTS audit_logs_invitation_idx ON audit_logs (invitation_id);`,
    `CREATE TABLE IF NOT EXISTS denylist (
       id UUID PRIMARY KEY,
       ip_hash TEXT,
       device_hash TEXT,
       reason TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `CREATE INDEX IF NOT EXISTS denylist_ip_hash_idx ON denylist (ip_hash);`,
    `CREATE INDEX IF NOT EXISTS denylist_device_hash_idx ON denylist (device_hash);`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}
