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

interface RsvpSectionProps {
  slug: string;
  invitation: Invitation;
  description?: string;
}

const RsvpSection: React.FC<RsvpSectionProps> = ({ slug, invitation, description }) => {
  const toast = useToast();
  const { t } = useLocale();
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

  const RSVP_STATUS_OPTIONS: Array<{ value: RsvpStatusOption; label: string; helper: string }> = useMemo(() => [
    { value: "yes", label: t("rsvpYes"), helper: "" },
    { value: "maybe", label: t("rsvpMaybe"), helper: "" },
    { value: "no", label: t("rsvpNo"), helper: "" },
  ], [t]);

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
          {RSVP_STATUS_OPTIONS.map((option) => {
            const isActive = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`rsvp-status-button${isActive ? " is-active" : ""}`}
                onClick={() => setStatus(option.value)}
                aria-pressed={isActive}
              >
                <span>{option.label}</span>
                {option.helper && <small>{option.helper}</small>}
              </button>
            );
          })}
        </div>

        <div className="form-grid">
          <label>
            {t("formFullName")}
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder={t("guestbookNamePlaceholder")} />
          </label>
          <label>
            {t("formPhone")}
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("formPhonePlaceholder")} />
          </label>
          <label>
            {t("formPartySize")}
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
            {t("formMessage")}
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              placeholder={t("formMessagePlaceholder")}
            />
          </label>
        </div>

        <button type="submit" className="ui-button primary" disabled={mutation.isPending}>
          {mutation.isPending ? t("loading") : t("rsvpSubmit")}
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
  const { t, formatCurrency } = useLocale();
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
    return (
      <div className="invite-compact" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>💌</div>
          <p>{t("loadingInvitation")}</p>
        </div>
      </div>
    );
  }

  if (query.error instanceof Error) {
    const notFoundMessage =
      query.error.message === "Invitation not found"
        ? t("invitationNotFound")
        : query.error.message;
    return (
      <div className="invite-compact" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>❌</div>
          <p>{notFoundMessage}</p>
        </div>
      </div>
    );
  }

  if (!invitation || !invitation.isPublished) {
    return (
      <div className="invite-compact" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
          <p>{t("invitationNotPublished")}</p>
        </div>
      </div>
    );
  }

  const eventTime = formatTime(invitation.event.time);

  return (
    <div className="invite-compact" style={themeStyle}>
      {/* Compact Hero Banner */}
      <header className="invite-compact__hero" style={{
        ...heroStyle,
        padding: "40px 24px",
        textAlign: "center",
        borderRadius: 0,
        minHeight: "auto",
      }}>
        <div className="invite-compact__event-badge" style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          padding: "6px 16px",
          borderRadius: 20,
          fontSize: "0.85rem",
          marginBottom: 12,
        }}>
          {invitation.event.title}
        </div>
        <h1 style={{ fontSize: "2rem", margin: "0 0 8px", fontWeight: 700 }}>
          {invitation.couple.brideName} &amp; {invitation.couple.groomName}
        </h1>
        <p style={{ opacity: 0.9, margin: "0 0 8px" }}>{invitation.headline}</p>
        <p style={{ fontSize: "0.95rem", opacity: 0.8 }}>
          📅 {formatDate(invitation.event.date)} {eventTime ? `· ${eventTime} WIB` : ""}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
          {invitation.event.mapLink && (
            <a
              href={invitation.event.mapLink}
              className="ui-button primary"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.9rem" }}
            >
              📍 Open Maps
            </a>
          )}
          <button type="button" className="ui-button subtle" onClick={handleShare} style={{ fontSize: "0.9rem" }}>
            📤 Share
          </button>
        </div>
        {shareStatus && <p style={{ marginTop: 12, fontSize: "0.85rem" }}>{shareStatus}</p>}
      </header>

      {/* Main Content Grid */}
      <div className="invite-compact__content" style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
      }}>
        {/* Event Details Card */}
        <div className="invite-compact__card" style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--color-border)",
        }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            📍 Event Details
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Date</span>
              <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{formatDate(invitation.event.date)}</p>
            </div>
            {eventTime && (
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Time</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{eventTime} WIB</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Venue</span>
              <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{invitation.event.venue}</p>
            </div>
            {invitation.event.address && (
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Address</span>
                <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{invitation.event.address}</p>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" className="ui-button subtle" onClick={handleDownloadCalendar} style={{ fontSize: "0.85rem" }}>
              📅 Save to Calendar
            </button>
            {googleCalendarUrl && (
              <a className="ui-button subtle" href={googleCalendarUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.85rem" }}>
                Google Cal
              </a>
            )}
          </div>
        </div>

        {/* RSVP Card */}
        <div className="invite-compact__card" style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--color-border)",
        }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            ✉️ RSVP
          </h2>
          <RsvpSection
            slug={invitation.slug}
            invitation={invitation}
            description="Let us know if you can celebrate with us."
          />
        </div>

        {/* Gift Ideas Card */}
        <div className="invite-compact__card" style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--color-border)",
        }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🎁 Gift Ideas
          </h2>
          {giftSuggestionsQuery.isLoading ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t("loadingGiftIdeas")}</p>
          ) : giftSuggestionsQuery.data?.suggestions?.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {giftSuggestionsQuery.data.suggestions.slice(0, 3).map((gift) => (
                <div key={`${gift.name}-${gift.category}`} style={{
                  padding: 12,
                  background: "var(--color-surface-alt)",
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{gift.name}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--color-brand)" }}>{formatCurrency(gift.estimatedPrice, "IDR")}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>{gift.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Gift ideas will appear here soon.</p>
          )}
        </div>

        {/* Guestbook Card */}
        <div className="invite-compact__card" style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--color-border)",
        }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            💬 {t("guestbookSectionTitle")}
          </h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            style={{ marginBottom: 16 }}
          >
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder={t("guestbookFormNamePlaceholder")}
              required
              style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface-alt)" }}
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("guestbookFormMessagePlaceholder")}
              maxLength={500}
              required
              rows={3}
              style={{ width: "100%", marginBottom: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface-alt)", resize: "vertical" }}
            />
            <button type="submit" className="ui-button primary" disabled={mutation.isPending} style={{ fontSize: "0.9rem" }}>
              {mutation.isPending ? t("guestbookSending") : t("guestbookSend")}
            </button>
          </form>
          {submitError && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: 12 }}>{submitError}</p>}
          
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {detail?.guestbook?.length ? (
              detail.guestbook.slice(0, 5).map((entry) => (
                <div key={entry.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{entry.guestName}</span>
                    <time style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{dayjs(entry.createdAt).fromNow()}</time>
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: 0, color: "var(--color-text-muted)" }}>{entry.message}</p>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No messages yet. Share your blessings! 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Sections (collapsible) */}
      {invitation.sections.length > 0 && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" }}>
          {invitation.sections.filter(s => s.type !== "rsvp").map((section, index) => (
            <details key={`${section.type}-${index}`} style={{ marginBottom: 12 }}>
              <summary style={{
                cursor: "pointer",
                padding: "16px 20px",
                background: "var(--color-surface)",
                borderRadius: 12,
                fontWeight: 500,
                border: "1px solid var(--color-border)",
              }}>
                {section.type === "loveStory" && "💕 "}{section.type === "gallery" && "📷 "}{section.title}
              </summary>
              <div style={{
                padding: 20,
                background: "var(--color-surface)",
                borderRadius: "0 0 12px 12px",
                marginTop: -1,
                border: "1px solid var(--color-border)",
                borderTop: "none",
              }}>
                {renderGenericSection(section, invitation.currentEventId)}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitePage;
