import { useParams } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { addGuestbookEntry, getInvitation } from "../api/client";
import type { InvitationDetail, LoveStoryItem, Section } from "../types";

dayjs.extend(relativeTime);

const formatDate = (value: string) => {
  const d = dayjs(value);
  return d.isValid() ? d.format("dddd, DD MMMM YYYY") : value;
};

const formatTime = (value?: string) =>
  value ? dayjs(value, ["HH:mm", "HH:mm:ss"]).format("HH:mm") : undefined;

const renderSection = (section: Section) => {
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
    case "rsvp":
      return <p>{String(section.content ?? "RSVP details will be provided soon.")}</p>;
    default:
      return <p>{String(section.content ?? "")}</p>;
  }
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

  const themeStyle = useMemo(() => {
    if (!invitation?.theme) return {};
    const { primaryColor, secondaryColor } = invitation.theme;
    return {
      "--primary-color": primaryColor ?? "#a855f7",
      "--secondary-color": secondaryColor ?? "#f472b6",
    } as React.CSSProperties;
  }, [invitation?.theme]);

  const sharePayload = useMemo(() => {
    if (!invitation) {
      return null;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/i/${invitation.slug}`;
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

  return (
    <div className="invite" style={themeStyle}>
      <header className="invite__hero">
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

      {invitation.sections.map((section, index) => (
        <section
          key={`${section.type}-${index}`}
          className="invite__section"
          aria-labelledby={`section-${index}`}
        >
          <div className="section-shell">
            <header>
              <h2 id={`section-${index}`}>{section.title}</h2>
            </header>
            {renderSection(section)}
          </div>
        </section>
      ))}

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
