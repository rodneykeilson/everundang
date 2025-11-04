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
}

export interface GuestbookPayload {
  guestName: string;
  message: string;
}
