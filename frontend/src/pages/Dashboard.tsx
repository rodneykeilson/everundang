import { useEffect, useMemo, useState, type FC } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInvitation, getInvitations, saveInvitation } from "../api/client";
import type {
  Invitation,
  InvitationFormData,
  LoveStoryItem,
  Theme,
} from "../types";

const emptyInvitation = (): InvitationFormData => ({
  slug: "",
  headline: "Celebrate Our Wedding",
  couple: {
    brideName: "",
    groomName: "",
    parents: {},
  },
  event: {
    title: "The Wedding of",
    date: new Date().toISOString().split("T")[0],
    time: "18:00",
    venue: "",
    address: "",
    mapLink: "",
  },
  sections: [],
  theme: {
    primaryColor: "#a855f7",
    secondaryColor: "#f472b6",
    backgroundPattern: "",
    musicUrl: "",
  },
  isPublished: false,
});

const loveStoryTemplate: LoveStoryItem = {
  title: "How it all began",
  description: "Share a little story here...",
  date: new Date().toISOString().split("T")[0],
};

const loadSecret = () => window.localStorage.getItem("everundang_admin_secret") ?? "";

const Dashboard: FC = () => {
  const [adminSecret, setAdminSecret] = useState<string>(loadSecret);
  const [form, setForm] = useState<InvitationFormData>(emptyInvitation);
  const [loveStoryItems, setLoveStoryItems] = useState<LoveStoryItem[]>([{ ...loveStoryTemplate }]);
  const [loveStoryTitle, setLoveStoryTitle] = useState("Our Love Story");
  const [galleryTitle, setGalleryTitle] = useState("Photo Gallery");
  const [gallery, setGallery] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [fetchError, setFetchError] = useState<string>("");

  const queryClient = useQueryClient();
  const invitationQuery = useQuery<Invitation[]>({
    queryKey: ["invitations", adminSecret || null],
    queryFn: () => getInvitations(adminSecret || undefined),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "Unauthorized") {
        return false;
      }
      return failureCount < 3;
    },
  });

  useEffect(() => {
    if (invitationQuery.error instanceof Error) {
      const messageText =
        invitationQuery.error.message === "Unauthorized"
          ? "Invalid admin secret. Showing published invitations only."
          : invitationQuery.error.message;
      setFetchError(messageText);
    } else {
      setFetchError("");
    }
  }, [invitationQuery.error]);

  const mutation = useMutation({
    mutationFn: async (payload: InvitationFormData) => {
      const invitations = invitationQuery.data ?? [];
      const existing = invitations.find((inv) => inv.slug === payload.slug);
      return existing
        ? saveInvitation(payload, adminSecret)
        : createInvitation(payload, adminSecret);
    },
    onSuccess: async (result: Invitation) => {
      setMessage(`Invitation "${result.slug}" saved successfully.`);
      await queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Failed to save invitation");
    },
  });

  useEffect(() => {
    if (adminSecret) {
      window.localStorage.setItem("everundang_admin_secret", adminSecret);
    }
  }, [adminSecret]);

  const combinedTheme = useMemo(() => form.theme ?? ({} as Theme), [form.theme]);

  const handleSelectInvitation = (invitation: Invitation) => {
    setSelectedSlug(invitation.slug);
    setForm({
      slug: invitation.slug,
      headline: invitation.headline,
      couple: {
        ...invitation.couple,
        parents: invitation.couple.parents ?? {},
      },
      event: invitation.event,
      sections: invitation.sections,
      theme: invitation.theme ?? {},
      isPublished: invitation.isPublished,
    });

    const storySection = invitation.sections.find((section) => section.type === "loveStory");
    const gallerySection = invitation.sections.find((section) => section.type === "gallery");

    setLoveStoryTitle(storySection?.title ?? "Our Love Story");
    setLoveStoryItems(
      Array.isArray(storySection?.content) && storySection?.content?.length
        ? (storySection?.content as LoveStoryItem[])
        : [{ ...loveStoryTemplate }],
    );
    setGalleryTitle(gallerySection?.title ?? "Photo Gallery");
    setGallery(Array.isArray(gallerySection?.content) ? (gallerySection?.content as string[]) : []);
  };

  const resetForm = () => {
    setSelectedSlug(null);
    setForm(emptyInvitation());
    setLoveStoryItems([{ ...loveStoryTemplate }]);
    setLoveStoryTitle("Our Love Story");
    setGalleryTitle("Photo Gallery");
    setGallery([]);
    setMessage("");
    setFetchError("");
  };

  const buildPayload = (): InvitationFormData => ({
    ...form,
    sections: [
      {
        type: "loveStory",
        title: loveStoryTitle,
        content: loveStoryItems,
      },
      {
        type: "gallery",
        title: galleryTitle,
        content: gallery,
      },
    ],
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!adminSecret) {
      setMessage("Please provide the admin secret to save edits.");
      return;
    }

    mutation.mutate(buildPayload());
  };

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <header>
          <h2>Invitations</h2>
          <button type="button" onClick={resetForm} className="link-btn">
            + New invitation
          </button>
        </header>
        <div className="secret-box">
          <label htmlFor="admin-secret">Admin Secret</label>
          <input
            id="admin-secret"
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            placeholder="Enter admin secret"
          />
          <p className="hint">Used for authenticated API requests.</p>
        </div>
        <div className="invitation-list">
          {invitationQuery.isLoading && <p>Loading invitations...</p>}
          {fetchError && !invitationQuery.isLoading && (
            <p className="form-message error">{fetchError}</p>
          )}
          {invitationQuery.data?.map((invitation) => (
            <button
              type="button"
              key={invitation.id}
              onClick={() => handleSelectInvitation(invitation)}
              className={`invitation-card ${
                selectedSlug === invitation.slug ? "active" : ""
              }`}
            >
              <span className="title">{invitation.headline}</span>
              <span className="slug">/{invitation.slug}</span>
              <span className={`badge ${invitation.isPublished ? "published" : "draft"}`}>
                {invitation.isPublished ? "Published" : "Draft"}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="dashboard-content">
        <form className="invitation-form" onSubmit={handleSubmit}>
          <header>
            <h1>{selectedSlug ? `Editing ${selectedSlug}` : "Create Invitation"}</h1>
            <div className="actions">
              <button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save invitation"}
              </button>
              <label className="publish-toggle">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isPublished: event.target.checked }))
                  }
                />
                <span>Published</span>
              </label>
            </div>
          </header>

          {message && <p className="form-message">{message}</p>}

          <section>
            <h2>Basic Information</h2>
            <div className="grid">
              <label>
                Slug
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slug: event.target.value.trim().toLowerCase() }))
                  }
                  required
                  pattern="[a-z0-9-]{3,}"
                  title="Use lowercase letters, numbers, and hyphen"
                />
              </label>
              <label>
                Headline
                <input
                  value={form.headline}
                  onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
                  required
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Couple Information</h2>
            <div className="grid three">
              <label>
                Bride Name
                <input
                  value={form.couple.brideName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      couple: { ...prev.couple, brideName: event.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label>
                Groom Name
                <input
                  value={form.couple.groomName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      couple: { ...prev.couple, groomName: event.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label>
                Bride Parents
                <input
                  value={form.couple.parents?.bride ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      couple: {
                        ...prev.couple,
                        parents: { ...(prev.couple.parents ?? {}), bride: event.target.value },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Groom Parents
                <input
                  value={form.couple.parents?.groom ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      couple: {
                        ...prev.couple,
                        parents: { ...(prev.couple.parents ?? {}), groom: event.target.value },
                      },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Event Details</h2>
            <div className="grid three">
              <label>
                Event Title
                <input
                  value={form.event.title}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, title: event.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label>
                Event Date
                <input
                  type="date"
                  value={form.event.date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, date: event.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label>
                Event Time
                <input
                  type="time"
                  value={form.event.time ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, time: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="span-2">
                Venue
                <input
                  value={form.event.venue}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, venue: event.target.value },
                    }))
                  }
                  required
                />
              </label>
              <label className="span-2">
                Address / Additional Info
                <textarea
                  value={form.event.address ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, address: event.target.value },
                    }))
                  }
                  rows={3}
                />
              </label>
              <label className="span-3">
                Google Maps Link
                <input
                  type="url"
                  value={form.event.mapLink ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, mapLink: event.target.value },
                    }))
                  }
                  placeholder="https://maps.google.com/..."
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Love Story Timeline</h2>
            <label className="span-3">
              Section Title
              <input value={loveStoryTitle} onChange={(event) => setLoveStoryTitle(event.target.value)} />
            </label>
            {loveStoryItems.map((item, index) => (
              <div className="timeline-row" key={`story-${index}`}>
                <div>
                  <label>
                    Title
                    <input
                      value={item.title ?? ""}
                      onChange={(event) =>
                        setLoveStoryItems((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], title: event.target.value };
                          return next;
                        })
                      }
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Date
                    <input
                      type="date"
                      value={item.date ?? ""}
                      onChange={(event) =>
                        setLoveStoryItems((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], date: event.target.value };
                          return next;
                        })
                      }
                    />
                  </label>
                </div>
                <div className="span-2">
                  <label>
                    Description
                    <textarea
                      rows={2}
                      value={item.description ?? ""}
                      onChange={(event) =>
                        setLoveStoryItems((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], description: event.target.value };
                          return next;
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="link-btn danger"
                  aria-label="Remove story item"
                  onClick={() =>
                    setLoveStoryItems((prev) => prev.filter((_, itemIdx) => itemIdx !== index))
                  }
                  disabled={loveStoryItems.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="link-btn"
              onClick={() => setLoveStoryItems((prev) => [...prev, { ...loveStoryTemplate }])}
            >
              + Add story item
            </button>
          </section>

          <section>
            <h2>Gallery</h2>
            <label className="span-3">
              Section Title
              <input value={galleryTitle} onChange={(event) => setGalleryTitle(event.target.value)} />
            </label>
            {gallery.map((url, index) => (
              <div className="gallery-row" key={`gallery-${index}`}>
                <input
                  value={url}
                  onChange={(event) =>
                    setGallery((prev) => {
                      const next = [...prev];
                      next[index] = event.target.value;
                      return next;
                    })
                  }
                  placeholder="https://example.com/photo.jpg"
                />
                <button
                  type="button"
                  className="link-btn danger"
                  onClick={() => setGallery((prev) => prev.filter((_, itemIdx) => itemIdx !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => setGallery((prev) => [...prev, ""]) }>
              + Add gallery image URL
            </button>
          </section>

          <section>
            <h2>Theme</h2>
            <div className="grid three">
              <label>
                Primary Color
                <input
                  type="color"
                  value={combinedTheme.primaryColor ?? "#a855f7"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      theme: { ...(prev.theme ?? {}), primaryColor: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Secondary Color
                <input
                  type="color"
                  value={combinedTheme.secondaryColor ?? "#f472b6"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      theme: { ...(prev.theme ?? {}), secondaryColor: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="span-2">
                Music URL (optional)
                <input
                  type="url"
                  value={combinedTheme.musicUrl ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      theme: { ...(prev.theme ?? {}), musicUrl: event.target.value },
                    }))
                  }
                  placeholder="https://..."
                />
              </label>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
};

export default Dashboard;
