import type {
  GeneratedGuestCode,
  GuestbookEntry,
  Invitation,
  InvitationDetail,
  InvitationFormData,
  InvitationManageResponse,
  InvitationRsvpMode,
  OwnerLinkResponse,
  OwnerRsvpManageResponse,
  Rsvp,
  RsvpStats,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type RequestExpectation = "json" | "blob" | "text";

interface RequestOptions extends RequestInit {
  expect?: RequestExpectation;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { expect = "json", ...init } = options;
  const headers = new Headers(init.headers ?? {});
  const hasBody = init.body !== undefined;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (expect === "json" && !headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  if (requestInit.cache === undefined) {
    requestInit.cache = "no-store";
  }

  const response = await fetch(`${API_URL}${path}`, requestInit);

  if (!response.ok) {
    let message = response.statusText;
    const contentType = response.headers.get("Content-Type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data && typeof data === "object" && "message" in data) {
          message = String((data as { message?: unknown }).message ?? message);
        }
      } else {
        message = await response.text();
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        message = error.message;
      }
    }
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (expect === "blob") {
    return (await response.blob()) as T;
  }

  if (expect === "text") {
    return (await response.text()) as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

function withAdminHeaders(adminSecret?: string): HeadersInit | undefined {
  if (!adminSecret) return undefined;
  return {
    "x-admin-k": adminSecret,
    "x-admin-secret": adminSecret,
  };
}

function withOwnerHeaders(ownerToken: string): HeadersInit {
  return {
    "x-owner-token": ownerToken,
  };
}

export function getInvitations(adminSecret?: string) {
  return request<Invitation[]>("/api/invitations", {
    headers: withAdminHeaders(adminSecret),
  });
}

export function getInvitation(slug: string, adminSecret?: string) {
  return request<InvitationDetail>(`/api/invitations/${slug}`, {
    headers: withAdminHeaders(adminSecret),
  });
}

export function saveInvitationAdmin(data: InvitationFormData, adminSecret: string) {
  return request<Invitation>(`/api/invitations/${data.slug}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: withAdminHeaders(adminSecret),
  });
}

export function createInvitationAdmin(data: InvitationFormData, adminSecret: string) {
  return request<Invitation>(`/api/invitations`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: withAdminHeaders(adminSecret),
  });
}

export function deleteInvitationAdmin(id: string, adminSecret: string) {
  return request<void>(`/api/invitations/${id}`, {
    method: "DELETE",
    headers: withAdminHeaders(adminSecret),
  });
}

export function updateInvitationAdmin(
  id: string,
  payload: Partial<InvitationFormData> & {
    status?: Invitation["status"];
    isPublished?: boolean;
    rsvpMode?: InvitationRsvpMode;
    rsvpPasscode?: string | null;
    capacity?: number | null;
  },
  adminSecret: string,
) {
  return request<Invitation>(`/api/invitations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: withAdminHeaders(adminSecret),
  });
}

export function createInvitation(data: InvitationFormData) {
  return request<OwnerLinkResponse>(`/api/invitations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getInvitationManage(id: string, ownerToken: string) {
  return request<InvitationManageResponse>(`/api/invitations/${id}/manage`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

export function updateInvitationOwner(
  id: string,
  payload: Partial<InvitationFormData> & {
    status?: Invitation["status"];
    isPublished?: boolean;
    rsvpMode?: InvitationRsvpMode;
    rsvpPasscode?: string | null;
  },
  ownerToken: string,
) {
  return request<Invitation>(`/api/invitations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: withOwnerHeaders(ownerToken),
  });
}

export function rotateOwnerLink(id: string, ownerToken: string) {
  return request<OwnerLinkResponse>(`/api/invitations/${id}/rotate-owner-link`, {
    method: "POST",
    headers: withOwnerHeaders(ownerToken),
  });
}

export function rotateOwnerLinkAdmin(id: string, adminSecret: string) {
  return request<OwnerLinkResponse>(`/api/invitations/${id}/rotate-owner-link`, {
    method: "POST",
    headers: withAdminHeaders(adminSecret),
  });
}

export function fetchInvitationQr(id: string, ownerToken: string) {
  return request<Blob>(`/api/invitations/${id}/manage/qrcode`, {
    headers: withOwnerHeaders(ownerToken),
    expect: "blob",
  });
}

export function getInvitationRsvpManage(id: string, ownerToken: string) {
  return request<OwnerRsvpManageResponse>(`/api/invitations/${id}/manage/rsvp`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

export function generateGuestCodes(
  id: string,
  ownerToken: string,
  payload: { quantity: number; prefix?: string; issuedTo?: string },
) {
  return request<{ codes: GeneratedGuestCode[] }>(`/api/invitations/${id}/manage/guest-codes`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: withOwnerHeaders(ownerToken),
  });
}

export function deleteGuestCode(id: string, codeId: string, ownerToken: string) {
  return request<void>(`/api/invitations/${id}/manage/guest-codes/${codeId}`, {
    method: "DELETE",
    headers: withOwnerHeaders(ownerToken),
  });
}

export function addGuestbookEntry(slug: string, payload: { guestName: string; message: string }) {
  return request<GuestbookEntry>(`/api/invitations/${slug}/guestbook`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitRsvp(
  slug: string,
  payload: {
    name: string;
    phone?: string;
    status: "yes" | "maybe" | "no";
    partySize: number;
    message?: string;
    passcode?: string;
    guestCode?: string;
    deviceFingerprint?: string;
  },
) {
  return request<{ rsvp: Rsvp; stats: RsvpStats }>(`/api/invitations/${slug}/rsvp`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ============================================================================
// Gift Registry API
// ============================================================================

import type {
  GiftItem,
  GiftPreference,
  GiftRegistryResponse,
  GiftSuggestionsResponse,
  GiftRegistryStats,
  GiftCategory,
  PriceRange,
} from "../types";

/**
 * Get curated gift suggestions for an invitation
 */
export function getGiftSuggestions(
  invitationId: string,
  options?: {
    categories?: GiftCategory[];
    priceRanges?: PriceRange[];
    count?: number;
    acceptsCash?: boolean;
  }
) {
  const params = new URLSearchParams();
  if (options?.categories?.length) {
    params.set("categories", options.categories.join(","));
  }
  if (options?.priceRanges?.length) {
    params.set("priceRanges", options.priceRanges.join(","));
  }
  if (options?.count) {
    params.set("count", String(options.count));
  }
  if (options?.acceptsCash !== undefined) {
    params.set("acceptsCash", String(options.acceptsCash));
  }
  const query = params.toString();
  const url = `/api/gifts/${invitationId}/suggestions${query ? `?${query}` : ""}`;
  return request<GiftSuggestionsResponse>(url);
}

/**
 * Get gift preferences for an invitation (owner only)
 */
export function getGiftPreferences(invitationId: string, ownerToken: string) {
  return request<{ preferences: GiftPreference | null }>(`/api/gifts/${invitationId}/preferences`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Update gift preferences for an invitation (owner only)
 */
export function updateGiftPreferences(
  invitationId: string,
  ownerToken: string,
  preferences: Partial<Omit<GiftPreference, "id" | "invitationId" | "createdAt" | "updatedAt">>
) {
  return request<{ preferences: GiftPreference }>(`/api/gifts/${invitationId}/preferences`, {
    method: "PUT",
    body: JSON.stringify(preferences),
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get the public gift registry for an invitation
 */
export function getGiftRegistry(invitationId: string) {
  return request<GiftRegistryResponse>(`/api/gifts/${invitationId}/registry`);
}

/**
 * Get the gift registry with full management details (owner only)
 */
export function getGiftRegistryManage(invitationId: string, ownerToken: string) {
  return request<{
    items: GiftItem[];
    preferences: GiftPreference | null;
    stats: GiftRegistryStats;
  }>(`/api/gifts/${invitationId}/registry/manage`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Add a gift item to the registry (owner only)
 */
export function addGiftItem(
  invitationId: string,
  ownerToken: string,
  item: {
    name: string;
    description?: string | null;
    category: GiftCategory;
    priceRange: PriceRange;
    estimatedPrice?: number | null;
    imageUrl?: string | null;
    purchaseUrl?: string | null;
    priority?: number;
  }
) {
  return request<{ item: GiftItem }>(`/api/gifts/${invitationId}/registry`, {
    method: "POST",
    body: JSON.stringify(item),
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Reserve a gift item (public)
 */
export function reserveGiftItem(invitationId: string, itemId: string, guestName: string) {
  return request<{ item: GiftItem }>(`/api/gifts/${invitationId}/registry/${itemId}/reserve`, {
    method: "POST",
    body: JSON.stringify({ guestName }),
  });
}

/**
 * Unreserve a gift item (owner only)
 */
export function unreserveGiftItem(invitationId: string, itemId: string, ownerToken: string) {
  return request<{ item: GiftItem }>(`/api/gifts/${invitationId}/registry/${itemId}/unreserve`, {
    method: "POST",
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Delete a gift item from the registry (owner only)
 */
export function deleteGiftItemApi(invitationId: string, itemId: string, ownerToken: string) {
  return request<void>(`/api/gifts/${invitationId}/registry/${itemId}`, {
    method: "DELETE",
    headers: withOwnerHeaders(ownerToken),
  });
}

// ============================================================================
// Analytics API
// ============================================================================

import type {
  AnalyticsDashboard,
  RsvpTrendPoint,
  DailyActivity,
  ResponseTimeAnalysis,
  EngagementMetrics,
  AttendancePrediction,
} from "../types";

/**
 * Get complete analytics dashboard for an invitation (owner only)
 */
export function getAnalyticsDashboard(invitationId: string, ownerToken: string) {
  return request<AnalyticsDashboard>(`/api/analytics/${invitationId}/dashboard`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get RSVP trends over time (owner only)
 */
export function getRsvpTrends(invitationId: string, ownerToken: string, days?: number) {
  const params = days ? `?days=${days}` : "";
  return request<{ trends: RsvpTrendPoint[] }>(`/api/analytics/${invitationId}/trends${params}`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get daily activity summary (owner only)
 */
export function getDailyActivity(invitationId: string, ownerToken: string, days?: number) {
  const params = days ? `?days=${days}` : "";
  return request<{ activity: DailyActivity[] }>(`/api/analytics/${invitationId}/activity${params}`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get response time analysis (owner only)
 */
export function getResponseAnalysis(invitationId: string, ownerToken: string) {
  return request<{ analysis: ResponseTimeAnalysis }>(`/api/analytics/${invitationId}/response-analysis`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get engagement metrics (owner only)
 */
export function getEngagementMetrics(invitationId: string, ownerToken: string) {
  return request<{ engagement: EngagementMetrics }>(`/api/analytics/${invitationId}/engagement`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get attendance prediction (owner only)
 */
export function getAttendancePrediction(invitationId: string, ownerToken: string) {
  return request<{ prediction: AttendancePrediction }>(`/api/analytics/${invitationId}/prediction`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

// ============================================================================
// Export API
// ============================================================================

/**
 * Download RSVPs as CSV (owner only)
 */
export async function downloadRsvpsCsv(invitationId: string, ownerToken: string): Promise<Blob> {
  return request<Blob>(`/api/exports/${invitationId}/rsvps/csv`, {
    headers: withOwnerHeaders(ownerToken),
    expect: "blob",
  });
}

/**
 * Download guestbook as CSV (owner only)
 */
export async function downloadGuestbookCsv(invitationId: string, ownerToken: string): Promise<Blob> {
  return request<Blob>(`/api/exports/${invitationId}/guestbook/csv`, {
    headers: withOwnerHeaders(ownerToken),
    expect: "blob",
  });
}

/**
 * Download full event report as JSON (owner only)
 */
export async function downloadEventReportJson(invitationId: string, ownerToken: string): Promise<Blob> {
  return request<Blob>(`/api/exports/${invitationId}/report/json`, {
    headers: withOwnerHeaders(ownerToken),
    expect: "blob",
  });
}

/**
 * Download event summary as text (owner only)
 */
export async function downloadEventSummaryText(invitationId: string, ownerToken: string): Promise<Blob> {
  return request<Blob>(`/api/exports/${invitationId}/summary/text`, {
    headers: withOwnerHeaders(ownerToken),
    expect: "blob",
  });
}

/**
 * Get RSVP summary statistics (owner only, inline data)
 */
export interface RsvpSummary {
  totalResponses: number;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalGuests: number;
  responseRate: string;
}

export function getRsvpSummary(invitationId: string, ownerToken: string) {
  return request<RsvpSummary>(`/api/exports/${invitationId}/rsvps/summary`, {
    headers: withOwnerHeaders(ownerToken),
  });
}

/**
 * Get global activity for the landing page pulse
 */
export interface GlobalActivity {
  invitations: Array<{ slug: string; headline: string; created_at: string }>;
  rsvps: Array<{ slug: string; headline: string; name: string; status: string; created_at: string }>;
  guestbook: Array<{
    slug: string;
    headline: string;
    guest_name: string;
    message: string;
    created_at: string;
  }>;
}

export function getGlobalActivity() {
  return request<GlobalActivity>("/api/analytics/global/activity");
}

/**
 * Helper to trigger file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

