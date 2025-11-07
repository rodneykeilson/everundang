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

export type SectionType = "loveStory" | "gallery" | "countdown" | "rsvp" | "custom";

export interface Section {
  type: SectionType;
  title: string;
  content: unknown;
}

export interface LoveStoryItem {
  title?: string;
  description?: string;
  date?: string;
}

export interface Theme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundPattern?: string;
  backgroundImageUrl?: string | null;
  musicUrl?: string;
}

export type InvitationStatus = "draft" | "published" | "closed";
export type InvitationRsvpMode = "passcode" | "guest_codes" | "open";

export interface Invitation {
  id: string;
  slug: string;
  headline: string;
  couple: CoupleInfo;
  event: EventInfo;
  sections: Section[];
  theme: Theme;
  isPublished: boolean;
  status?: InvitationStatus;
  rsvpMode?: InvitationRsvpMode;
  capacity?: number | null;
  hasRsvpPasscode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationDetail {
  invitation: Invitation;
  guestbook: GuestbookEntry[];
}

export interface GuestbookEntry {
  id: string;
  invitationId: string;
  guestName: string;
  message: string;
  createdAt: string;
}

export interface InvitationFormData {
  slug: string;
  headline: string;
  couple: CoupleInfo;
  event: EventInfo;
  sections: Section[];
  theme: Theme;
  isPublished: boolean;
  status?: InvitationStatus;
  rsvpMode?: InvitationRsvpMode;
  capacity?: number | null;
}

export type InvitationManageResponse = InvitationDetail;

export interface OwnerLinkResponse {
  invitation: Invitation;
  ownerToken: string;
  ownerLink: string;
}

export interface Rsvp {
  id: string;
  name: string;
  phone?: string;
  status: "yes" | "maybe" | "no";
  partySize: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpStats {
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalGuests: number;
}

export interface GuestCodeSummary {
  id: string;
  issuedTo?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export interface OwnerRsvpManageResponse {
  invitation: Invitation;
  stats: RsvpStats;
  rsvps: Rsvp[];
  guestCodes: GuestCodeSummary[];
}

export interface GeneratedGuestCode {
  id: string;
  code: string;
  issuedTo?: string | null;
}
