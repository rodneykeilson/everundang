import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { addGuestbookEntry, getGiftSuggestions, getInvitation, submitRsvp } from "../api/client";
import { useLocale } from "../hooks/useLocale";
import { useToast } from "../hooks/useToast";
import type { Invitation, InvitationDetail, LoveStoryItem, Section, RsvpStats, Rsvp } from "../types";
import DigitalPass from "../components/DigitalPass";

dayjs.extend(relativeTime);
dayjs.extend(utc);

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

const renderGenericSection = (section: Section, currentEventId?: string | null) => {
  switch (section.type) {
    case "loveStory": {
      const timeline = Array.isArray(section.content)
        ? (section.content as LoveStoryItem[])
        : [];
      return (
        <div className="love-story">
          {timeline.map((item, idx) => {
            const itemId = `event-${idx}`;
            const isLive = currentEventId === itemId;
            return (
              <div key={idx} className={`love-story__item${isLive ? " is-live" : ""}`}>
                {isLive && <span className="live-badge">LIVE NOW</span>}
                <h4>{item.title ?? `Momen ${idx + 1}`}</h4>
                {item.date && <span className="love-story__date">{formatDate(item.date)}</span>}
                <p>{item.description}</p>
              </div>
            );
          })}
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
  const toast = useToast();
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
  const [submittedRsvp, setSubmittedRsvp] = useState<Rsvp | null>(null);
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
      toast.success("RSVP submitted successfully! 🎉");
      setFeedback("RSVP saved. Thank you!");
      setError(null);
      setStats(data.stats);
      setSubmittedRsvp(data.rsvp);
      setName(data.rsvp.name);
      setStatus(data.rsvp.status as RsvpStatusOption);
      setPartySize(String(data.rsvp.partySize));
      setMessage(data.rsvp.message ?? "");
    },
    onError: (submissionError: unknown) => {
      const message =
        submissionError instanceof Error ? submissionError.message : "Failed to submit RSVP";
      toast.error(message);
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

      {submittedRsvp && submittedRsvp.status === "yes" && submittedRsvp.checkInToken && (
        <DigitalPass
          name={submittedRsvp.name}
          token={submittedRsvp.checkInToken}
          eventTitle={invitation.event.title}
          eventDate={formatDate(invitation.event.date)}
        />
      )}

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
  const { formatCurrency } = useLocale();
  const toast = useToast();
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
      toast.success("Message posted successfully! 🎉");
      await queryClient.invalidateQueries({ queryKey: ["invitation", slug] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
      setSubmitError(errorMessage);
    },
  });

  const detail = query.data as InvitationDetail | undefined;
  const invitation = detail?.invitation;

  const giftSuggestionsQuery = useQuery({
    queryKey: ["gift-suggestions", invitation?.id],
    queryFn: async () => {
      if (!invitation?.id) {
        throw new Error("Invitation id is missing");
      }
      return getGiftSuggestions(invitation.id, { count: 6 });
    },
    enabled: Boolean(invitation?.id),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

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

  const handleDownloadCalendar = useCallback(() => {
    if (!invitation) return;

    const escapeIcs = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");

    const date = invitation.event.date;
    const time = formatTime(invitation.event.time);
    const title = `${invitation.event.title} - ${invitation.couple.brideName} & ${invitation.couple.groomName}`;
    const location = [invitation.event.venue, invitation.event.address].filter(Boolean).join(", ");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/#/i/${invitation.slug}`;

    const toIcsDate = (d: string) => d.replace(/-/g, "");
    const toIcsDateTime = (d: string, hhmm: string) => `${toIcsDate(d)}T${hhmm.replace(":", "")}00`;

    let dtStartLine = "";
    let dtEndLine = "";

    if (!time) {
      const start = toIcsDate(date);
      const endDate = dayjs(date).add(1, "day").format("YYYY-MM-DD");
      const end = toIcsDate(endDate);
      dtStartLine = `DTSTART;VALUE=DATE:${start}`;
      dtEndLine = `DTEND;VALUE=DATE:${end}`;
    } else {
      const startDateTime = dayjs(`${date}T${time}`);
      const endDateTime = startDateTime.add(2, "hour");
      dtStartLine = `DTSTART:${toIcsDateTime(date, time)}`;
      dtEndLine = `DTEND:${endDateTime.format("YYYYMMDDTHHmmss")}`;
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EverUndang//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:everundang-${invitation.id}`,
      `DTSTAMP:${dayjs().format("YYYYMMDDTHHmmss")}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(`${invitation.headline}\\n${url}`)}`,
      location ? `LOCATION:${escapeIcs(location)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `everundang-${invitation.slug}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, [invitation]);

  const googleCalendarUrl = useMemo(() => {
    if (!invitation) return undefined;
    const title = `${invitation.event.title} - ${invitation.couple.brideName} & ${invitation.couple.groomName}`;
    const location = [invitation.event.venue, invitation.event.address].filter(Boolean).join(", ");
    const time = formatTime(invitation.event.time);

    const formatGoogleDate = (d: dayjs.Dayjs) => d.utc().format("YYYYMMDDTHHmmss[Z]");
    const start = time ? dayjs(`${invitation.event.date}T${time}`) : dayjs(invitation.event.date).startOf("day");
    const end = time ? start.add(2, "hour") : start.add(1, "day");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      location,
      details: invitation.headline,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [invitation]);

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

          <div className="calendar-actions" aria-label="Add to calendar">
            <button type="button" className="ui-button subtle" onClick={handleDownloadCalendar}>
              Download calendar (.ics)
            </button>
            {googleCalendarUrl ? (
              <a className="ui-button subtle" href={googleCalendarUrl} target="_blank" rel="noreferrer">
                Add to Google Calendar
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="invite__section" aria-labelledby="gift-ideas-heading">
        <div className="section-shell">
          <header>
            <h2 id="gift-ideas-heading">Gift ideas</h2>
            <p className="section-shell__lead">
              A curated list of gift ideas for guests who want inspiration.
            </p>
          </header>

          {giftSuggestionsQuery.isLoading ? (
            <p className="hint" aria-live="polite">Loading gift ideas…</p>
          ) : giftSuggestionsQuery.data?.suggestions?.length ? (
            <div className="gift-grid">
              {giftSuggestionsQuery.data.suggestions.map((gift) => (
                <article key={`${gift.name}-${gift.category}`} className="gift-card">
                  <header className="gift-card__header">
                    <h3>{gift.name}</h3>
                    <span className="gift-card__price">{formatCurrency(gift.estimatedPrice, "IDR")}</span>
                  </header>
                  <p className="gift-card__desc">{gift.description}</p>
                  <p className="gift-card__reason">{gift.reason}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty">Gift ideas will appear here soon.</p>
          )}
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
                renderGenericSection(section, invitation.currentEventId)
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
              <p className="empty">No messages yet. Share your blessings! 🎉</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InvitePage;
