import type {
  GuestbookEntry,
  Invitation,
  InvitationDetail,
  InvitationFormData,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getInvitations(adminSecret?: string) {
  return request<Invitation[]>("/api/invitations", {
    headers: adminSecret
      ? {
          "x-admin-secret": adminSecret,
        }
      : undefined,
  });
}

export function getInvitation(slug: string, adminSecret?: string) {
  return request<InvitationDetail>(`/api/invitations/${slug}`, {
    headers: adminSecret
      ? {
          "x-admin-secret": adminSecret,
        }
      : undefined,
  });
}

export function saveInvitation(data: InvitationFormData, adminSecret: string) {
  return request<Invitation>(`/api/invitations/${data.slug}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
}

export function createInvitation(data: InvitationFormData, adminSecret: string) {
  return request<Invitation>(`/api/invitations`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });
}

export function addGuestbookEntry(slug: string, payload: { guestName: string; message: string }) {
  return request<GuestbookEntry>(`/api/invitations/${slug}/guestbook`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
