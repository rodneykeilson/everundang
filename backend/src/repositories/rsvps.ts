import { randomUUID, createHash } from "crypto";
import { pool } from "../db.js";
import type { GuestCodeRecord, RsvpRecord, RsvpStatus } from "../types.js";

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const hashGuestCode = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export interface RsvpInput {
  name: string;
  phone?: string;
  status?: RsvpStatus;
  partySize?: number;
  message?: string;
  deviceHash?: string | null;
  ipHash?: string | null;
}

const mapRsvpRow = (row: any): RsvpRecord => ({
  id: row.id,
  invitationId: row.invitation_id,
  name: row.name,
  normalizedName: row.normalized_name,
  phone: row.phone,
  status: row.status,
  partySize: row.party_size,
  message: row.message,
  deviceHash: row.device_hash,
  ipHash: row.ip_hash,
  checkInToken: row.check_in_token,
  checkedInAt: row.checked_in_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listRsvps(invitationId: string): Promise<RsvpRecord[]> {
  const result = await pool.query(
    `SELECT * FROM rsvps WHERE invitation_id = $1 ORDER BY created_at DESC`,
    [invitationId],
  );
  return result.rows.map(mapRsvpRow);
}

export async function upsertRsvp(invitationId: string, payload: RsvpInput): Promise<RsvpRecord> {
  const id = randomUUID();
  const checkInToken = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const normalizedName = normalizeName(payload.name);
  const status = payload.status ?? "yes";
  const partySize = payload.partySize ?? 1;

  const result = await pool.query(
    `INSERT INTO rsvps (
       id,
       invitation_id,
       name,
       normalized_name,
       phone,
       status,
       party_size,
       message,
       device_hash,
       ip_hash,
       check_in_token
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     )
     ON CONFLICT (invitation_id, normalized_name)
     DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       status = EXCLUDED.status,
       party_size = EXCLUDED.party_size,
       message = EXCLUDED.message,
       device_hash = COALESCE(EXCLUDED.device_hash, rsvps.device_hash),
       ip_hash = COALESCE(EXCLUDED.ip_hash, rsvps.ip_hash),
       check_in_token = COALESCE(rsvps.check_in_token, EXCLUDED.check_in_token),
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      invitationId,
      payload.name.trim(),
      normalizedName,
      payload.phone?.trim() ?? null,
      status,
      partySize,
      payload.message?.trim() ?? null,
      payload.deviceHash ?? null,
      payload.ipHash ?? null,
      checkInToken,
    ],
  );

  return mapRsvpRow(result.rows[0]);
}

export interface RsvpStats {
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalGuests: number;
}

export async function getRsvpStats(invitationId: string): Promise<RsvpStats> {
  const result = await pool.query(
    `SELECT
       SUM(CASE WHEN status = 'yes' THEN party_size ELSE 0 END) AS yes_guests,
       SUM(CASE WHEN status = 'maybe' THEN party_size ELSE 0 END) AS maybe_guests,
       SUM(CASE WHEN status = 'no' THEN party_size ELSE 0 END) AS no_guests,
       COUNT(*) FILTER (WHERE status = 'yes') AS yes_count,
       COUNT(*) FILTER (WHERE status = 'maybe') AS maybe_count,
       COUNT(*) FILTER (WHERE status = 'no') AS no_count
     FROM rsvps
     WHERE invitation_id = $1`,
    [invitationId],
  );

  const row = result.rows[0] ?? {};
  const yesCount = Number(row.yes_count ?? 0);
  const maybeCount = Number(row.maybe_count ?? 0);
  const noCount = Number(row.no_count ?? 0);
  const totalGuests = Number(row.yes_guests ?? 0) + Number(row.maybe_guests ?? 0);

  return { yesCount, maybeCount, noCount, totalGuests };
}

const mapGuestCodeRow = (row: any): GuestCodeRecord => ({
  id: row.id,
  invitationId: row.invitation_id,
  codeHash: row.code_hash,
  issuedTo: row.issued_to,
  usedAt: row.used_at,
  createdAt: row.created_at,
});

export interface GuestCodeSummary {
  id: string;
  issuedTo?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export async function listGuestCodes(invitationId: string): Promise<GuestCodeSummary[]> {
  const result = await pool.query(
    `SELECT id, issued_to, used_at, created_at
       FROM guest_codes
       WHERE invitation_id = $1
       ORDER BY created_at DESC`,
    [invitationId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    issuedTo: row.issued_to,
    usedAt: row.used_at,
    createdAt: row.created_at,
  }));
}

export interface GeneratedGuestCode {
  id: string;
  code: string;
  issuedTo?: string | null;
}

export async function generateGuestCodes(
  invitationId: string,
  quantity: number,
  options: { issuedTo?: string | null; prefix?: string } = {},
): Promise<GeneratedGuestCode[]> {
  const codes: GeneratedGuestCode[] = [];
  const rows: Array<{ id: string; code: string; issuedTo?: string | null }> = [];
  const prefix = options.prefix?.trim().toUpperCase() ?? "";

  for (let i = 0; i < quantity; i += 1) {
    const id = randomUUID();
    const rawCode = `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    codes.push({ id, code: rawCode, issuedTo: options.issuedTo ?? null });
    rows.push({ id, code: rawCode, issuedTo: options.issuedTo ?? null });
  }

  const insertValues: any[] = [];
  const placeholders: string[] = [];

  rows.forEach((row, index) => {
    const baseIndex = index * 4;
    insertValues.push(row.id, invitationId, hashGuestCode(row.code), row.issuedTo ?? null);
    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
  });

  if (insertValues.length) {
    await pool.query(
      `INSERT INTO guest_codes (id, invitation_id, code_hash, issued_to)
         VALUES ${placeholders.join(",")}
       ON CONFLICT DO NOTHING`,
      insertValues,
    );
  }

  return codes;
}

export async function consumeGuestCode(
  invitationId: string,
  code: string,
): Promise<GuestCodeRecord | null> {
  const hash = hashGuestCode(code);
  const result = await pool.query(
    `UPDATE guest_codes
       SET used_at = NOW()
       WHERE invitation_id = $1 AND code_hash = $2 AND used_at IS NULL
       RETURNING *`,
    [invitationId, hash],
  );
  return result.rows[0] ? mapGuestCodeRow(result.rows[0]) : null;
}

export async function deleteGuestCode(id: string, invitationId: string) {
  await pool.query(`DELETE FROM guest_codes WHERE id = $1 AND invitation_id = $2`, [id, invitationId]);
}

export async function resetGuestCodes(invitationId: string) {
  await pool.query(`DELETE FROM guest_codes WHERE invitation_id = $1`, [invitationId]);
}

export async function countYesGuests(invitationId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(SUM(party_size), 0) AS total
       FROM rsvps
       WHERE invitation_id = $1 AND status = 'yes'`,
    [invitationId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

export async function checkInGuest(invitationId: string, token: string): Promise<RsvpRecord | null> {
  const result = await pool.query(
    `UPDATE rsvps 
     SET checked_in_at = NOW() 
     WHERE invitation_id = $1 AND check_in_token = $2 
     RETURNING *`,
    [invitationId, token.trim().toUpperCase()],
  );

  if (result.rows.length === 0) return null;
  return mapRsvpRow(result.rows[0]);
}
