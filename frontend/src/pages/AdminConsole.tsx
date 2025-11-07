import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { deleteInvitationAdmin, getInvitations } from "../api/client";
import type { Invitation } from "../types";

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

  const invitations = useMemo<Invitation[]>(
    () => (invitationsQuery.data ? [...invitationsQuery.data] : []),
    [invitationsQuery.data],
  );

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
                              <span className={`status-badge status-${statusLabel}`}>{statusLabel}</span>
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
