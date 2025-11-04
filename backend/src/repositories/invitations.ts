import { randomUUID } from "crypto";
import { pool } from "../db.js";
import type {
  GuestbookPayload,
  InvitationPayload,
  InvitationRecord,
} from "../types.js";

const mapInvitationRow = (row: any): InvitationRecord => ({
  id: row.id,
  slug: row.slug,
  headline: row.headline,
  couple: row.couple,
  event: row.event,
  sections: row.sections,
  theme: row.theme,
  isPublished: row.is_published,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listInvitations(): Promise<InvitationRecord[]> {
  const result = await pool.query("SELECT * FROM invitations ORDER BY created_at DESC");
  return result.rows.map(mapInvitationRow);
}

export async function listPublishedInvitations(): Promise<InvitationRecord[]> {
  const result = await pool.query(
    "SELECT * FROM invitations WHERE is_published = TRUE ORDER BY created_at DESC",
  );
  return result.rows.map(mapInvitationRow);
}

export async function getInvitationBySlug(slug: string): Promise<InvitationRecord | null> {
  const result = await pool.query("SELECT * FROM invitations WHERE slug = $1", [slug]);
  return result.rows[0] ? mapInvitationRow(result.rows[0]) : null;
}

export async function createInvitation(payload: InvitationPayload): Promise<InvitationRecord> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO invitations (id, slug, headline, couple, event, sections, theme, is_published)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8)
     RETURNING *`,
    [
      id,
      payload.slug,
      payload.headline,
      JSON.stringify(payload.couple),
      JSON.stringify(payload.event),
      JSON.stringify(payload.sections ?? []),
      JSON.stringify(payload.theme ?? {}),
      payload.isPublished ?? false,
    ],
  );
  return mapInvitationRow(result.rows[0]);
}

export async function updateInvitation(slug: string, payload: InvitationPayload): Promise<InvitationRecord | null> {
  const existing = await getInvitationBySlug(slug);
  if (!existing) return null;

  const updated = {
    headline: payload.headline ?? existing.headline,
    couple: payload.couple ?? existing.couple,
    event: payload.event ?? existing.event,
    sections: payload.sections ?? existing.sections,
    theme: payload.theme ?? existing.theme,
    isPublished: payload.isPublished ?? existing.isPublished,
  };

  const result = await pool.query(
    `UPDATE invitations
     SET headline = $2,
         couple = $3::jsonb,
         event = $4::jsonb,
         sections = $5::jsonb,
         theme = $6::jsonb,
         is_published = $7,
         updated_at = NOW()
     WHERE slug = $1
     RETURNING *`,
    [
      slug,
      updated.headline,
      JSON.stringify(updated.couple),
      JSON.stringify(updated.event),
      JSON.stringify(updated.sections),
      JSON.stringify(updated.theme),
      updated.isPublished,
    ],
  );
  return result.rows[0] ? mapInvitationRow(result.rows[0]) : null;
}

export async function upsertInvitation(payload: InvitationPayload): Promise<InvitationRecord> {
  const existing = await getInvitationBySlug(payload.slug);
  if (existing) {
    return updateInvitation(payload.slug, payload) as Promise<InvitationRecord>;
  }
  return createInvitation(payload);
}

export interface GuestbookEntryRecord {
  id: string;
  invitationId: string;
  guestName: string;
  message: string;
  createdAt: string;
}

const mapGuestbookRow = (row: any): GuestbookEntryRecord => ({
  id: row.id,
  invitationId: row.invitation_id,
  guestName: row.guest_name,
  message: row.message,
  createdAt: row.created_at,
});

export async function listGuestbookEntries(invitationId: string): Promise<GuestbookEntryRecord[]> {
  const result = await pool.query(
    "SELECT * FROM guestbook_entries WHERE invitation_id = $1 ORDER BY created_at DESC",
    [invitationId],
  );
  return result.rows.map(mapGuestbookRow);
}

export async function addGuestbookEntry(invitationId: string, payload: GuestbookPayload): Promise<GuestbookEntryRecord> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO guestbook_entries (id, invitation_id, guest_name, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, invitationId, payload.guestName, payload.message],
  );
  return mapGuestbookRow(result.rows[0]);
}
