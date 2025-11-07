import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  deleteInvitationAdmin,
  getInvitations,
  rotateOwnerLinkAdmin,
  updateInvitationAdmin,
} from "../api/client";
import type { Invitation, InvitationStatus } from "../types";

const STORAGE_KEY = "everundang-admin-key";

const readStoredAdminKey = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const AdminConsole: React.FC = () => {
  const queryClient = useQueryClient();
  const [inputKey, setInputKey] = useState<string>(() => readStoredAdminKey());
  const [activeKey, setActiveKey] = useState<string>(() => readStoredAdminKey());
  const [formError, setFormError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingOwnerLinkId, setPendingOwnerLinkId] = useState<string | null>(null);

  const invitationsQuery = useQuery({
    queryKey: ["admin-invitations", activeKey],
    queryFn: () => getInvitations(activeKey),
    enabled: Boolean(activeKey),
    retry: false,
  });

  useEffect(() => {
    if (invitationsQuery.error instanceof Error) {
      setFormError(invitationsQuery.error.message);
    } else {
      setFormError(null);
    }
  }, [invitationsQuery.error]);

  const deleteMutation = useMutation({
    mutationFn: (invitationId: string) => deleteInvitationAdmin(invitationId, activeKey),
    onSuccess: () => {
      setActionFeedback("Invitation deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to delete invitation.";
      setActionFeedback(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      invitationId,
      status,
      adminSecret,
    }: {
      invitationId: string;
      status: InvitationStatus;
      adminSecret: string;
    }) =>
      updateInvitationAdmin(
        invitationId,
        { status, isPublished: status === "published" },
        adminSecret,
      ),
    onMutate: ({ invitationId }) => {
      setPendingStatusId(invitationId);
      setActionFeedback(null);
      setFormError(null);
    },
    onSuccess: (updated, { adminSecret }) => {
      queryClient.setQueryData(["admin-invitations", adminSecret], (current: Invitation[] | undefined) =>
        current?.map((inv) => (inv.id === updated.id ? updated : inv)) ?? current,
      );
      const updatedStatus = updated.status ?? (updated.isPublished ? "published" : "draft");
      setActionFeedback(`Status updated to ${updatedStatus}`);
      setFormError(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to update status.";
      setFormError(message);
    },
    onSettled: () => {
      setPendingStatusId(null);
    },
  });

  const ownerLinkMutation = useMutation({
    mutationFn: ({ invitationId, adminSecret }: { invitationId: string; adminSecret: string }) =>
      rotateOwnerLinkAdmin(invitationId, adminSecret),
    onMutate: ({ invitationId }) => {
      setPendingOwnerLinkId(invitationId);
      setActionFeedback(null);
      setFormError(null);
    },
    onSuccess: async ({ invitation: updatedInvitation, ownerLink }, { adminSecret }) => {
      queryClient.setQueryData(["admin-invitations", adminSecret], (current: Invitation[] | undefined) =>
        current?.map((inv) => (updatedInvitation && inv.id === updatedInvitation.id ? updatedInvitation : inv)) ??
        current,
      );
      const canCopy =
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard !== "undefined" &&
        typeof navigator.clipboard.writeText === "function";
      if (canCopy) {
        try {
          await navigator.clipboard.writeText(ownerLink);
          setActionFeedback("Owner link copied to clipboard");
          setFormError(null);
          return;
        } catch (error) {
          console.warn("Failed to copy owner link", error);
        }
      }
      setActionFeedback(`Owner link ready: ${ownerLink}`);
      setFormError(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to create owner link.";
      setFormError(message);
    },
    onSettled: () => {
      setPendingOwnerLinkId(null);
    },
  });

  const invitations = useMemo<Invitation[]>(
    () => (invitationsQuery.data ? [...invitationsQuery.data] : []),
    [invitationsQuery.data],
  );

  const statusOptions: InvitationStatus[] = ["draft", "published", "closed"];

  const handleStatusChange = (invitation: Invitation, nextStatus: InvitationStatus) => {
    if (!activeKey) {
      setFormError("Admin secret missing. Re-authenticate to continue.");
      return;
    }
    const currentStatus = invitation.status ?? (invitation.isPublished ? "published" : "draft");
    if (currentStatus === nextStatus || pendingStatusId === invitation.id) {
      return;
    }
    statusMutation.mutate({ invitationId: invitation.id, status: nextStatus, adminSecret: activeKey });
  };

  const handleCopyOwnerLink = (invitation: Invitation) => {
    if (!activeKey || pendingOwnerLinkId === invitation.id) {
      if (!activeKey) {
        setFormError("Admin secret missing. Re-authenticate to continue.");
      }
      return;
    }
    ownerLinkMutation.mutate({ invitationId: invitation.id, adminSecret: activeKey });
  };

  const handleConnect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionFeedback(null);

    const trimmed = inputKey.trim();
    if (!trimmed) {
      setFormError("Enter the admin secret to continue.");
      return;
    }

    setFormError(null);
    setActiveKey(trimmed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    }
  };

  const handleSignOut = () => {
    setActiveKey("");
    setInputKey("");
    setActionFeedback(null);
    setFormError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    queryClient.removeQueries({ queryKey: ["admin-invitations"] });
  };

  const handleDelete = (invitation: Invitation) => {
    if (!activeKey || deleteMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete invitation “${invitation.headline}”? This also removes RSVPs, guest codes, and guestbook entries.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(invitation.id);
  };

  const isAuthenticated = Boolean(activeKey);

  return (
    <div className="admin-console">
      <Header />
      <main className="admin-console__main">
        <div className="admin-console__container">
          <header>
            <p className="eyebrow">Administration</p>
            <h1>Invitation oversight</h1>
            <p className="section-shell__lead">
              Review every invitation in the system, prune spam submissions, and jump into public links quickly.
            </p>
          </header>

          {!isAuthenticated && (
            <section className="admin-console__card" aria-label="Admin authentication">
              <header>
                <h2>Authenticate</h2>
                <p className="hint">
                  Paste the shared admin secret to unlock full access. Your key is stored locally for convenience.
                </p>
              </header>
              <form className="owner-form" onSubmit={handleConnect}>
                <label>
                  Admin secret
                  <input
                    value={inputKey}
                    onChange={(event) => setInputKey(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </label>
                {formError && <p className="form-message error">{formError}</p>}
                <div className="admin-console__actions">
                  <button type="submit" className="ui-button primary">
                    Unlock console
                  </button>
                </div>
              </form>
            </section>
          )}

          {isAuthenticated && (
            <section className="admin-console__card" aria-label="Admin controls">
              <header>
                <h2>Controls</h2>
                <p className="hint">Current session is bound to the admin secret in local storage.</p>
              </header>
              <div className="admin-console__actions">
                <button type="button" className="ui-button subtle" onClick={handleSignOut}>
                  Sign out
                </button>
                <button
                  type="button"
                  className="ui-button"
                  onClick={() => invitationsQuery.refetch()}
                  disabled={invitationsQuery.isFetching}
                >
                  {invitationsQuery.isFetching ? "Refreshing…" : "Refresh list"}
                </button>
              </div>
              {formError && <p className="form-message error">{formError}</p>}
              {actionFeedback && <p className="form-message success">{actionFeedback}</p>}
            </section>
          )}

          {isAuthenticated && (
            <section className="admin-console__card" aria-label="Invitations overview">
              <header>
                <h2>All invitations</h2>
                <p className="hint">
                  Showing {invitations.length} record{invitations.length === 1 ? "" : "s"}. Delete spam or open
                  published links directly.
                </p>
              </header>
              {invitationsQuery.isLoading && <p>Loading invitations…</p>}
              {!invitationsQuery.isLoading && invitations.length === 0 && (
                <p className="admin-console__empty">No invitations exist yet.</p>
              )}
              {invitations.length > 0 && (
                <div className="table-wrapper" role="region" aria-live="polite">
                  <table className="admin-console__table">
                    <thead>
                      <tr>
                        <th scope="col">Headline</th>
                        <th scope="col">Slug</th>
                        <th scope="col">Status</th>
                        <th scope="col">Owner tools</th>
                        <th scope="col">Updated</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((invitation) => {
                        const statusLabel = invitation.status ?? (invitation.isPublished ? "published" : "draft");
                        return (
                          <tr key={invitation.id}>
                            <td>
                              <div>
                                <strong>{invitation.headline}</strong>
                                <div className="hint">Created {formatDate(invitation.createdAt)}</div>
                              </div>
                            </td>
                            <td>
                              <code>{invitation.slug}</code>
                            </td>
                            <td>
                              <div className="admin-console__status-control">
                                <span className={`status-badge status-${statusLabel}`}>{statusLabel}</span>
                                <label className="sr-only" htmlFor={`status-${invitation.id}`}>
                                  Invitation status
                                </label>
                                <select
                                  id={`status-${invitation.id}`}
                                  className="admin-console__status-select"
                                  value={statusLabel}
                                  onChange={(event) =>
                                    handleStatusChange(invitation, event.target.value as InvitationStatus)
                                  }
                                  disabled={!isAuthenticated || pendingStatusId === invitation.id}
                                >
                                  {statusOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => handleCopyOwnerLink(invitation)}
                                disabled={!isAuthenticated || pendingOwnerLinkId === invitation.id}
                              >
                                {pendingOwnerLinkId === invitation.id ? "Copying…" : "Copy owner link"}
                              </button>
                            </td>
                            <td>{formatDate(invitation.updatedAt)}</td>
                            <td>
                              <div className="admin-console__actions">
                                <a
                                  href={`/i/${invitation.slug}`}
                                  className="link-btn"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View public
                                </a>
                                <button
                                  type="button"
                                  className="link-btn danger"
                                  onClick={() => handleDelete(invitation)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminConsole;
