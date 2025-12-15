import { randomUUID } from "crypto";
import { pool } from "../db.js";
import type {
  GuestbookPayload,
  InvitationPayload,
  InvitationRecord,
  InvitationStatus,
} from "../types.js";
import {
  invitationCache,
  CacheKeys,
  CacheTags,
  CacheTTL,
  invalidateInvitationCaches,
} from "../utils/cache.js";

const mapInvitationRow = (row: any): InvitationRecord => ({
  id: row.id,
  slug: row.slug,
  headline: row.headline,
  couple: row.couple,
  event: row.event,
  sections: row.sections,
  theme: row.theme ?? row.theme_json ?? {},
  isPublished: row.is_published,
  title: row.title ?? null,
  dateISO: row.date_iso ?? null,
  timeStr: row.time_str ?? null,
  venue: row.venue ?? null,
  coverUrl: row.cover_url ?? null,
  themeJson: row.theme_json ?? null,
  status: row.status ?? null,
  rsvpMode: row.rsvp_mode ?? null,
  rsvpPasscodeHash: row.rsvp_passcode_hash ?? null,
  capacity: row.capacity ?? null,
  ownerSecretHash: row.owner_secret_hash ?? null,
  hasRsvpPasscode: Boolean(row.rsvp_passcode_hash),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeStatus = (
  requestedStatus: InvitationStatus | undefined | null,
  requestedIsPublished: boolean | undefined,
  existingStatus: InvitationStatus | null | undefined,
  existingIsPublished: boolean,
) => {
  const baseStatus = existingStatus ?? (existingIsPublished ? "published" : "draft");
  let status: InvitationStatus;

  if (requestedStatus) {
    status = requestedStatus;
  } else if (requestedIsPublished !== undefined) {
    if (requestedIsPublished) {
      status = baseStatus === "closed" ? "published" : "published";
    } else {
      status = baseStatus === "closed" ? "closed" : "draft";
    }
  } else {
    status = baseStatus;
  }

  const normalizedStatus: InvitationStatus =
    status === "closed" ? "closed" : status === "published" ? "published" : "draft";

  return {
    status: normalizedStatus,
    isPublished: normalizedStatus === "published",
  };
};

const buildUpdatedInvitation = (
  existing: InvitationRecord,
  payload: Partial<InvitationPayload> & { slug?: string },
) => {
  const { status, isPublished } = normalizeStatus(
    payload.status,
    payload.isPublished,
    existing.status,
    existing.isPublished,
  );

  return {
    slug: payload.slug ?? existing.slug,
    headline: payload.headline ?? existing.headline,
    couple: payload.couple ?? existing.couple,
    event: payload.event ?? existing.event,
    sections: payload.sections ?? existing.sections,
    theme: payload.theme ?? existing.theme,
    isPublished,
    title: payload.title ?? existing.title ?? existing.event.title,
    dateISO: payload.dateISO ?? existing.dateISO ?? null,
    timeStr: payload.timeStr ?? existing.timeStr ?? existing.event.time ?? null,
    venue: payload.venue ?? existing.venue ?? existing.event.venue ?? null,
    coverUrl: payload.coverUrl ?? existing.coverUrl ?? null,
    themeJson: payload.themeJson ?? existing.themeJson ?? existing.theme ?? {},
    status,
    rsvpMode: payload.rsvpMode ?? existing.rsvpMode ?? "open",
    rsvpPasscodeHash: payload.rsvpPasscodeHash ?? existing.rsvpPasscodeHash ?? null,
    capacity:
      payload.capacity === null
        ? null
        : payload.capacity ?? existing.capacity ?? null,
    ownerSecretHash: payload.ownerSecretHash ?? existing.ownerSecretHash ?? null,
  };
};

const applyInvitationUpdate = async (
  identifier: "slug" | "id",
  identifierValue: string,
  payload: Partial<InvitationPayload> & { slug?: string },
): Promise<InvitationRecord | null> => {
  const existing =
    identifier === "id"
      ? await getInvitationById(identifierValue)
      : await getInvitationBySlug(identifierValue);

  if (!existing) return null;

  const updated = buildUpdatedInvitation(existing, payload);

  const result = await pool.query(
    `UPDATE invitations
     SET slug = $2,
         headline = $3,
         couple = $4::jsonb,
         event = $5::jsonb,
         sections = $6::jsonb,
         theme = $7::jsonb,
         is_published = $8,
         title = $9,
         date_iso = $10,
         time_str = $11,
         venue = $12,
         cover_url = $13,
         theme_json = $14::jsonb,
         status = $15,
         rsvp_mode = $16,
         rsvp_passcode_hash = $17,
         capacity = $18,
         owner_secret_hash = $19,
         updated_at = NOW()
     WHERE ${identifier === "id" ? "id" : "slug"} = $1
     RETURNING *`,
    [
      identifierValue,
      updated.slug,
      updated.headline,
      JSON.stringify(updated.couple),
      JSON.stringify(updated.event),
      JSON.stringify(updated.sections),
      JSON.stringify(updated.theme),
      updated.isPublished,
      updated.title,
      updated.dateISO,
      updated.timeStr,
      updated.venue,
      updated.coverUrl,
      JSON.stringify(updated.themeJson),
      updated.status,
      updated.rsvpMode,
      updated.rsvpPasscodeHash,
      updated.capacity,
      updated.ownerSecretHash,
    ],
  );

  if (result.rows[0]) {
    const invitation = mapInvitationRow(result.rows[0]);
    // Invalidate caches for this invitation
    invalidateInvitationCaches(invitation.id, existing.slug);
    // Also invalidate if slug changed
    if (updated.slug !== existing.slug) {
      invitationCache.delete(CacheKeys.invitationBySlug(updated.slug));
    }
    return invitation;
  }
  return null;
};

export async function listInvitations(): Promise<InvitationRecord[]> {
  // List all invitations - short cache TTL since admin may need fresh data
  return invitationCache.getOrSet(
    "invitations:all",
    async () => {
      const result = await pool.query("SELECT * FROM invitations ORDER BY created_at DESC");
      return result.rows.map(mapInvitationRow);
    },
    { ttl: CacheTTL.SHORT, tags: [CacheTags.invitations] }
  );
}

export async function listPublishedInvitations(): Promise<InvitationRecord[]> {
  return invitationCache.getOrSet(
    "invitations:published",
    async () => {
      const result = await pool.query(
        "SELECT * FROM invitations WHERE status = 'published' ORDER BY created_at DESC",
      );
      return result.rows.map(mapInvitationRow);
    },
    { ttl: CacheTTL.MEDIUM, tags: [CacheTags.invitations] }
  );
}

export async function getInvitationBySlug(slug: string): Promise<InvitationRecord | null> {
  return invitationCache.getOrSet(
    CacheKeys.invitationBySlug(slug),
    async () => {
      const result = await pool.query("SELECT * FROM invitations WHERE slug = $1", [slug]);
      const row = result.rows[0];
      if (!row) return null;
      const invitation = mapInvitationRow(row);
      // Also cache by ID for cross-reference
      invitationCache.set(CacheKeys.invitation(invitation.id), invitation, {
        ttl: CacheTTL.MEDIUM,
        tags: [CacheTags.invitation(invitation.id)],
      });
      return invitation;
    },
    { ttl: CacheTTL.MEDIUM }
  );
}

export async function getInvitationById(id: string): Promise<InvitationRecord | null> {
  return invitationCache.getOrSet(
    CacheKeys.invitation(id),
    async () => {
      const result = await pool.query("SELECT * FROM invitations WHERE id = $1", [id]);
      const row = result.rows[0];
      if (!row) return null;
      const invitation = mapInvitationRow(row);
      // Also cache by slug for cross-reference
      invitationCache.set(CacheKeys.invitationBySlug(invitation.slug), invitation, {
        ttl: CacheTTL.MEDIUM,
        tags: [CacheTags.invitation(id)],
      });
      return invitation;
    },
    { ttl: CacheTTL.MEDIUM, tags: [CacheTags.invitation(id)] }
  );
}

export async function createInvitation(payload: InvitationPayload): Promise<InvitationRecord> {
  const id = randomUUID();
  const { status, isPublished } = normalizeStatus(
    payload.status ?? null,
    payload.isPublished,
    "draft",
    false,
  );
  const result = await pool.query(
    `INSERT INTO invitations (
       id,
       slug,
       headline,
       couple,
       event,
       sections,
       theme,
       is_published,
       title,
       date_iso,
       time_str,
       venue,
       cover_url,
       theme_json,
       status,
       rsvp_mode,
       rsvp_passcode_hash,
       capacity,
       owner_secret_hash
     )
     VALUES (
       $1,
       $2,
       $3,
       $4::jsonb,
       $5::jsonb,
       $6::jsonb,
       $7::jsonb,
       $8,
       $9,
       $10,
       $11,
       $12,
       $13,
       $14::jsonb,
       $15,
       $16,
       $17,
       $18,
       $19
     )
     RETURNING *`,
    [
      id,
      payload.slug,
      payload.headline,
      JSON.stringify(payload.couple),
      JSON.stringify(payload.event),
      JSON.stringify(payload.sections ?? []),
      JSON.stringify(payload.theme ?? {}),
  isPublished,
      payload.title ?? payload.event?.title ?? null,
      payload.dateISO ?? null,
      payload.timeStr ?? payload.event?.time ?? null,
      payload.venue ?? payload.event?.venue ?? null,
      payload.coverUrl ?? null,
      JSON.stringify(payload.themeJson ?? payload.theme ?? {}),
  status,
      payload.rsvpMode ?? "open",
      payload.rsvpPasscodeHash ?? null,
      payload.capacity ?? null,
      payload.ownerSecretHash ?? null,
    ],
  );
  return mapInvitationRow(result.rows[0]);
}

export async function updateInvitation(slug: string, payload: InvitationPayload): Promise<InvitationRecord | null> {
  return applyInvitationUpdate("slug", slug, payload);
}

export async function upsertInvitation(payload: InvitationPayload): Promise<InvitationRecord> {
  const existing = await getInvitationBySlug(payload.slug);
  if (existing) {
    return (await updateInvitation(payload.slug, payload)) as InvitationRecord;
  }
  return createInvitation(payload);
}

export async function updateInvitationById(
  id: string,
  payload: Partial<InvitationPayload> & { slug?: string },
): Promise<InvitationRecord | null> {
  return applyInvitationUpdate("id", id, payload);
}

export async function deleteInvitationById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM invitations WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateOwnerSecret(
  invitationId: string,
  ownerSecretHash: string,
): Promise<InvitationRecord | null> {
  const result = await pool.query(
    `UPDATE invitations
       SET owner_secret_hash = $2,
           updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [invitationId, ownerSecretHash],
  );
  return result.rows[0] ? mapInvitationRow(result.rows[0]) : null;
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
