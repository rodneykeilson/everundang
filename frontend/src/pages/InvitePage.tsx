import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { addGuestbookEntry, getInvitation, submitRsvp } from "../api/client";
import type { Invitation, InvitationDetail, LoveStoryItem, Section, RsvpStats } from "../types";

dayjs.extend(relativeTime);

const formatDate = (value: string) => {
  const d = dayjs(value);
  return d.isValid() ? d.format("dddd, DD MMMM YYYY") : value;
};

const formatTime = (value?: string) => {
  if (!value) return undefined;
  const strictTime = dayjs(value, ["HH:mm", "HH:mm:ss"], true);
  if (strictTime.isValid()) {
    return strictTime.format("HH:mm");
  }
  const isoCandidate = dayjs(value);
  return isoCandidate.isValid() ? isoCandidate.format("HH:mm") : undefined;
};

const renderGenericSection = (section: Section) => {
  switch (section.type) {
    case "loveStory": {
      const timeline = Array.isArray(section.content)
        ? (section.content as LoveStoryItem[])
        : [];
      return (
        <div className="love-story">
          {timeline.map((item, idx) => (
            <div key={idx} className="love-story__item">
              <h4>{item.title ?? `Momen ${idx + 1}`}</h4>
              {item.date && <span className="love-story__date">{formatDate(item.date)}</span>}
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      );
    }
    case "gallery": {
      const images = Array.isArray(section.content) ? (section.content as string[]) : [];
      return (
        <div className="gallery">
          {images.map((url, idx) => (
            <img key={idx} src={url} alt={`Gallery ${idx + 1}`} loading="lazy" />
          ))}
        </div>
      );
    }
    case "countdown": {
      const target = (section.content as { date: string })?.date;
      return target ? <p>Countdown to {formatDate(target)}</p> : null;
    }
    default:
      return <p>{String(section.content ?? "")}</p>;
  }
};

type RsvpStatusOption = "yes" | "maybe" | "no";

const RSVP_STATUS_LABELS: Record<RsvpStatusOption, { label: string; helper: string }> = {
  yes: { label: "Yes", helper: "I will attend" },
  maybe: { label: "Maybe", helper: "Still deciding" },
  no: { label: "No", helper: "I can't make it" },
};

interface RsvpSectionProps {
  slug: string;
  invitation: Invitation;
  description?: string;
}

const RsvpSection: React.FC<RsvpSectionProps> = ({ slug, invitation, description }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<RsvpStatusOption>("yes");
  const [partySize, setPartySize] = useState("1");
  const [message, setMessage] = useState("");
  const [passcode, setPasscode] = useState("");
  const [guestCode, setGuestCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RsvpStats | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | undefined>();

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    const storageKey = `everundang:fp:${slug}`;
    try {
      const existing = window.localStorage.getItem(storageKey);
      if (existing) {
        setDeviceFingerprint(existing);
        return;
      }
      const generated = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      window.localStorage.setItem(storageKey, generated);
      setDeviceFingerprint(generated);
    } catch (fingerprintError) {
      console.warn("Unable to persist RSVP device fingerprint", fingerprintError);
    }
  }, [slug]);

  const rsvpMode = invitation.rsvpMode ?? "open";
  const requiresPasscode = rsvpMode === "passcode" || invitation.hasRsvpPasscode;
  const requiresGuestCode = rsvpMode === "guest_codes";

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof submitRsvp>[1]) => submitRsvp(slug, payload),
    onSuccess: (data) => {
      setFeedback("RSVP saved. Thank you!");
      setError(null);
      setStats(data.stats);
      setName(data.rsvp.name);
      setStatus(data.rsvp.status as RsvpStatusOption);
      setPartySize(String(data.rsvp.partySize));
      setMessage(data.rsvp.message ?? "");
    },
    onError: (submissionError: unknown) => {
      const message =
        submissionError instanceof Error ? submissionError.message : "Failed to submit RSVP";
      setError(message);
      setFeedback(null);
    },
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Name is required.");
        setFeedback(null);
        return;
      }

      if (requiresPasscode && !passcode.trim()) {
        setError("RSVP passcode is required.");
        setFeedback(null);
        return;
      }

      if (requiresGuestCode && !guestCode.trim()) {
        setError("Guest code is required.");
        setFeedback(null);
        return;
      }

      const parsedPartySize = Number.parseInt(partySize, 10);
      if (Number.isNaN(parsedPartySize) || parsedPartySize < 1) {
        setError("Party size must be at least 1.");
        setFeedback(null);
        return;
      }

      const payload: Parameters<typeof submitRsvp>[1] = {
        name: trimmedName,
        status,
        partySize: Math.min(parsedPartySize, 12),
        deviceFingerprint,
      };

      if (phone.trim()) {
        payload.phone = phone.trim();
      }
      if (message.trim()) {
        payload.message = message.trim();
      }
      if (requiresPasscode && passcode.trim()) {
        payload.passcode = passcode.trim();
      }
      if (requiresGuestCode && guestCode.trim()) {
        payload.guestCode = guestCode.trim();
      }

      setError(null);
      setFeedback(null);
      mutation.mutate(payload);
    },
    [deviceFingerprint, guestCode, message, mutation, name, partySize, passcode, phone, requiresGuestCode, requiresPasscode, status],
  );

  return (
    <div className="rsvp">
      {description ? <p className="section-shell__lead">{description}</p> : null}
      {invitation.capacity ? (
        <p className="hint" aria-live="polite">
          Capacity limited to {invitation.capacity} guest{invitation.capacity === 1 ? "" : "s"}. Please RSVP early.
        </p>
      ) : null}
      <form className="rsvp-form" onSubmit={handleSubmit}>
        <div className="rsvp-status-toggle" role="group" aria-label="RSVP status">
          {(Object.keys(RSVP_STATUS_LABELS) as RsvpStatusOption[]).map((option) => {
            const { label, helper } = RSVP_STATUS_LABELS[option];
            const isActive = status === option;
            return (
              <button
                key={option}
                type="button"
                className={`rsvp-status-button${isActive ? " is-active" : ""}`}
                onClick={() => setStatus(option)}
                aria-pressed={isActive}
              >
                <span>{label}</span>
                <small>{helper}</small>
              </button>
            );
          })}
        </div>

        <div className="form-grid">
          <label>
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Phone (optional)
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp number" />
          </label>
          <label>
            Party size
            <input
              type="number"
              min={1}
              max={12}
              value={partySize}
              onChange={(event) => setPartySize(event.target.value)}
            />
          </label>
          {requiresPasscode ? (
            <label>
              RSVP passcode
              <input value={passcode} onChange={(event) => setPasscode(event.target.value)} required />
            </label>
          ) : null}
          {requiresGuestCode ? (
            <label>
              Guest code
              <input value={guestCode} onChange={(event) => setGuestCode(event.target.value)} required />
            </label>
          ) : null}
          <label className="form-grid__full">
            Message (optional)
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              placeholder="Add a note for the couple"
            />
          </label>
        </div>

        <button type="submit" className="ui-button primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Submit RSVP"}
        </button>
      </form>

      {error ? (
        <p className="form-message error" role="alert">
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p className="form-message success" role="status">
          {feedback}
        </p>
      ) : null}
      {stats ? (
        <dl className="rsvp-stats" aria-live="polite">
          <div>
            <dt>Yes</dt>
            <dd>{stats.yesCount}</dd>
          </div>
          <div>
            <dt>Maybe</dt>
            <dd>{stats.maybeCount}</dd>
          </div>
          <div>
            <dt>No</dt>
            <dd>{stats.noCount}</dd>
          </div>
          <div>
            <dt>Total guests</dt>
            <dd>{stats.totalGuests}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
};

const InvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState<string>("");
  const [shareStatus, setShareStatus] = useState<string>("");

  const query = useQuery({
    queryKey: ["invitation", slug],
    queryFn: () => getInvitation(slug ?? ""),
    enabled: Boolean(slug),
  });

  const mutation = useMutation({
    mutationFn: () => addGuestbookEntry(slug ?? "", { guestName, message }),
    onSuccess: async () => {
      setGuestName("");
      setMessage("");
      setSubmitError("");
      await queryClient.invalidateQueries({ queryKey: ["invitation", slug] });
    },
    onError: (error: unknown) => {
      setSubmitError(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const detail = query.data as InvitationDetail | undefined;
  const invitation = detail?.invitation;

  useEffect(() => {
    if (!invitation) {
      return;
    }
    const pageTitle = `${invitation.couple.brideName} & ${invitation.couple.groomName} · EverUndang`;
    document.title = pageTitle;
    return () => {
      document.title = "EverUndang · Digital Invitations";
    };
  }, [invitation]);

  const themeStyle = useMemo<React.CSSProperties>(() => {
    if (!invitation?.theme) return {};
    const { primaryColor, secondaryColor, backgroundImageUrl } = invitation.theme;
    const style: React.CSSProperties = {
      "--primary-color": primaryColor ?? "#a855f7",
      "--secondary-color": secondaryColor ?? "#f472b6",
    } as React.CSSProperties;

    if (backgroundImageUrl) {
      style.backgroundImage = `url(${backgroundImageUrl})`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      style.backgroundRepeat = "no-repeat";
      style.backgroundAttachment = "fixed";
    }

    return style;
  }, [invitation?.theme]);

  const heroStyle = useMemo<React.CSSProperties | undefined>(() => {
    const backgroundImageUrl = invitation?.theme?.backgroundImageUrl;
    if (!backgroundImageUrl) return undefined;
    return {
      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.4)), url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }, [invitation?.theme?.backgroundImageUrl]);

  const sharePayload = useMemo(() => {
    if (!invitation) {
      return null;
    }
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/#/i/${invitation.slug}`;
    return {
      url,
      title: invitation.headline,
      text: `${invitation.couple.brideName} & ${invitation.couple.groomName}`,
    };
  }, [invitation]);

  const handleShare = useCallback(async () => {
    if (!sharePayload) return;
    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        setShareStatus("Shared successfully");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePayload.url);
        setShareStatus("Link copied to clipboard");
      } else {
        setShareStatus(sharePayload.url);
      }
    } catch (error) {
      console.error(error);
      setShareStatus("Unable to share link. Copy manually instead.");
    }
  }, [sharePayload]);

  if (query.isLoading) {
    return <div className="page-loading">Loading invitation...</div>;
  }

  if (query.error instanceof Error) {
    const notFoundMessage =
      query.error.message === "Invitation not found"
        ? "Invitation not found or not published."
        : query.error.message;
    return <div className="page-error">{notFoundMessage}</div>;
  }

  if (!invitation || !invitation.isPublished) {
    return <div className="page-error">This invitation is not published.</div>;
  }

  const eventTime = formatTime(invitation.event.time);
  const hasBackgroundImage = Boolean(invitation.theme?.backgroundImageUrl);
  const hasRsvpSection = invitation.sections.some((section) => section.type === "rsvp");

  return (
    <div className={`invite${hasBackgroundImage ? " invite--with-background" : ""}`} style={themeStyle}>
      <header className="invite__hero" style={heroStyle}>
        <div className="invite__meta">
          <span className="status-badge">{invitation.event.title}</span>
          <h1>
            {invitation.couple.brideName} &amp; {invitation.couple.groomName}
          </h1>
          <p className="invite__headline">{invitation.headline}</p>
          <p className="invite__date">
            {formatDate(invitation.event.date)}
            {eventTime ? ` · ${eventTime} WIB` : ""}
          </p>
        </div>
        <div className="invite__actions">
          {invitation.event.mapLink && (
            <a
              href={invitation.event.mapLink}
              className="ui-button primary"
              target="_blank"
              rel="noreferrer"
            >
              Open maps
            </a>
          )}
          <button type="button" className="ui-button subtle" onClick={handleShare}>
            Share invite
          </button>
          {shareStatus && <p className="hint" role="status">{shareStatus}</p>}
        </div>
      </header>

      <section className="invite__section" aria-labelledby="event-info-heading">
        <div className="section-shell">
          <header>
            <h2 id="event-info-heading">Event details</h2>
            <p className="section-shell__lead">
              Join us as we celebrate surrounded by family and friends. Save the date and location below.
            </p>
          </header>
          <dl className="event-summary">
            <div>
              <dt>Date</dt>
              <dd>{formatDate(invitation.event.date)}</dd>
            </div>
            {eventTime && (
              <div>
                <dt>Time</dt>
                <dd>{eventTime} WIB</dd>
              </div>
            )}
            <div>
              <dt>Venue</dt>
              <dd>{invitation.event.venue}</dd>
            </div>
            {invitation.event.address && (
              <div>
                <dt>Address</dt>
                <dd>{invitation.event.address}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {invitation.sections.map((section, index) => {
        const isRsvpSection = section.type === "rsvp";
        const description =
          isRsvpSection && typeof section.content === "string"
            ? section.content
            : undefined;

        return (
          <section
            key={`${section.type}-${index}`}
            className="invite__section"
            aria-labelledby={`section-${index}`}
          >
            <div className="section-shell">
              <header>
                <h2 id={`section-${index}`}>{section.title}</h2>
              </header>
              {isRsvpSection ? (
                <RsvpSection
                  slug={invitation.slug}
                  invitation={invitation}
                  description={description}
                />
              ) : (
                renderGenericSection(section)
              )}
            </div>
          </section>
        );
      })}

      {!hasRsvpSection ? (
        <section className="invite__section" aria-labelledby="default-rsvp-heading">
          <div className="section-shell">
            <header>
              <h2 id="default-rsvp-heading">RSVP</h2>
            </header>
            <RsvpSection
              slug={invitation.slug}
              invitation={invitation}
              description="Let us know if you can celebrate with us."
            />
          </div>
        </section>
      ) : null}

      <section className="invite__section" aria-labelledby="guestbook-heading">
        <div className="section-shell">
          <header>
            <h2 id="guestbook-heading">Guestbook</h2>
            <p className="section-shell__lead">Leave your blessings and keep the memories forever.</p>
          </header>
          <form
            className="guestbook-form"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="form-grid">
              <label>
                Name
                <input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="form-grid__full">
                Message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Share your wishes"
                  maxLength={500}
                  required
                />
              </label>
            </div>
            <button type="submit" className="ui-button primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send message"}
            </button>
          </form>
          {submitError && <p className="form-message error">{submitError}</p>}

          <div className="guestbook-list">
            {detail?.guestbook?.length ? (
              detail.guestbook.map((entry) => (
                <article key={entry.id} className="guestbook-entry">
                  <header>
                    <h3>{entry.guestName}</h3>
                    <time dateTime={entry.createdAt}>{dayjs(entry.createdAt).fromNow()}</time>
                  </header>
                  <p>{entry.message}</p>
                </article>
              ))
            ) : (
              <p className="empty">No messages yet. Be the first to congratulate!</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InvitePage;
