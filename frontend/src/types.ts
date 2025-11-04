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
  musicUrl?: string;
}

export interface Invitation {
  id: string;
  slug: string;
  headline: string;
  couple: CoupleInfo;
  event: EventInfo;
  sections: Section[];
  theme: Theme;
  isPublished: boolean;
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
}
