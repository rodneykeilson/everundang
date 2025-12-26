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
  id?: string;
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
  currentEventId?: string | null;
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
  currentEventId?: string | null;
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
  checkInToken?: string;
  checkedInAt?: string;
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

// ============================================================================
// Gift Registry Types
// ============================================================================

export type GiftCategory =
  | "home_decor"
  | "kitchen"
  | "electronics"
  | "experiences"
  | "charity"
  | "cash"
  | "travel"
  | "fashion"
  | "wellness"
  | "custom";

export type PriceRange = "budget" | "moderate" | "premium" | "luxury";

export interface GiftItem {
  id: string;
  invitationId: string;
  name: string;
  description: string | null;
  category: GiftCategory;
  priceRange: PriceRange;
  estimatedPrice: number | null;
  imageUrl: string | null;
  purchaseUrl: string | null;
  priority: number;
  reserved: boolean;
  reservedBy: string | null;
  reservedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftPreference {
  id: string;
  invitationId: string;
  categories: GiftCategory[];
  preferredPriceRanges: PriceRange[];
  notes: string | null;
  acceptsCash: boolean;
  cashNote: string | null;
  charityPreference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftSuggestion {
  name: string;
  description: string;
  category: GiftCategory;
  priceRange: PriceRange;
  estimatedPrice: number;
  reason: string;
  popularity: number;
}

export interface GiftRegistryStats {
  totalItems: number;
  reservedItems: number;
  totalValue: number;
  reservedValue: number;
  byCategory: Record<string, { count: number; reserved: number }>;
}

export interface GiftRegistryResponse {
  items: GiftItem[];
  preferences: Pick<GiftPreference, "acceptsCash" | "cashNote" | "charityPreference"> | null;
  stats: GiftRegistryStats;
}

export interface GiftSuggestionsResponse {
  suggestions: GiftSuggestion[];
  preferences: GiftPreference | null;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface RsvpTrendPoint {
  date: string;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalResponses: number;
  cumulativeGuests: number;
}

export interface DailyActivity {
  date: string;
  rsvpCount: number;
  guestbookCount: number;
  giftReservations: number;
}

export interface ResponseTimeAnalysis {
  averageResponseDays: number;
  fastestResponseDays: number;
  slowestResponseDays: number;
  responsesByDayOfWeek: Record<string, number>;
  responsesByHourOfDay: Record<string, number>;
}

export interface EngagementMetrics {
  totalRsvps: number;
  totalGuestbookEntries: number;
  totalGiftReservations: number;
  rsvpConversionRate: number;
  averagePartySize: number;
  peakActivityDay: string | null;
  peakActivityHour: number | null;
}

export interface AttendancePrediction {
  predictedAttendees: number;
  confidenceLevel: "low" | "medium" | "high";
  basedOnResponses: number;
  maybeConversionRate: number;
  notes: string[];
}

export interface AnalyticsSummary {
  totalInvited: number | null;
  totalResponded: number;
  responseRate: number;
  confirmedGuests: number;
  maybeGuests: number;
  declinedGuests: number;
}

export interface AnalyticsDashboard {
  invitationId: string;
  slug: string;
  summary: AnalyticsSummary;
  trends: RsvpTrendPoint[];
  dailyActivity: DailyActivity[];
  responseAnalysis: ResponseTimeAnalysis;
  engagement: EngagementMetrics;
  prediction: AttendancePrediction;
}

