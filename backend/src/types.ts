export type InvitationStatus = "draft" | "published" | "closed";
export type InvitationRsvpMode = "passcode" | "guest_codes" | "open";
export type RsvpStatus = "yes" | "maybe" | "no";
export type MediaKind = "cover" | "gallery";
export type AuditActor = "owner" | "admin" | "system";

export interface CoupleInfo {
  brideName: string;
  groomName: string;
  parents?: {
    bride?: string;
    groom?: string;
  };
}

export interface EventInfo {
  title: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  mapLink?: string;
}

export interface Section {
  type: "loveStory" | "gallery" | "countdown" | "rsvp" | "custom";
  title: string;
  content: unknown;
}

export interface Theme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundPattern?: string;
  backgroundImageUrl?: string | null;
  musicUrl?: string;
}

export interface InvitationRecord {
  id: string;
  slug: string;
  headline: string;
  couple: CoupleInfo;
  event: EventInfo;
  sections: Section[];
  theme: Theme;
  isPublished: boolean;
  title?: string | null;
  dateISO?: string | null;
  timeStr?: string | null;
  venue?: string | null;
  coverUrl?: string | null;
  themeJson?: Record<string, unknown>;
  status?: InvitationStatus;
  rsvpMode?: InvitationRsvpMode;
  rsvpPasscodeHash?: string | null;
  capacity?: number | null;
  ownerSecretHash?: string | null;
  currentEventId?: string | null;
  hasRsvpPasscode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationPayload {
  slug: string;
  headline: string;
  couple: CoupleInfo;
  event: EventInfo;
  sections?: Section[];
  theme?: Theme;
  isPublished?: boolean;
  title?: string | null;
  dateISO?: string | null;
  timeStr?: string | null;
  venue?: string | null;
  coverUrl?: string | null;
  themeJson?: Record<string, unknown>;
  status?: InvitationStatus;
  rsvpMode?: InvitationRsvpMode;
  rsvpPasscodeHash?: string | null;
  capacity?: number | null;
  ownerSecretHash?: string | null;
  currentEventId?: string | null;
}

export interface GuestbookPayload {
  guestName: string;
  message: string;
}

export interface RsvpRecord {
  id: string;
  invitationId: string;
  name: string;
  normalizedName: string;
  phone?: string | null;
  status: RsvpStatus;
  partySize: number;
  message?: string | null;
  deviceHash?: string | null;
  ipHash?: string | null;
  checkInToken?: string | null;
  checkedInAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestCodeRecord {
  id: string;
  invitationId: string;
  codeHash: string;
  issuedTo?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export interface MediaAssetRecord {
  id: string;
  invitationId: string;
  kind: MediaKind;
  url: string;
  metaJson: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  invitationId?: string | null;
  actor: AuditActor;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metaJson: Record<string, unknown>;
  createdAt: string;
}

export interface DenylistRecord {
  id: string;
  ipHash?: string | null;
  deviceHash?: string | null;
  reason?: string | null;
  createdAt: string;
}
