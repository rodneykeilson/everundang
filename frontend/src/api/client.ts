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

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

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
