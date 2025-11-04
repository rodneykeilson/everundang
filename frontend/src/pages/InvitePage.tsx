import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
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
        <div className="section-body love-story">
          {timeline.map((item, idx) => (
            <div key={idx} className="story-item">
              <h4>{item.title ?? `Momen ${idx + 1}`}</h4>
              {item.date && <span className="story-date">{formatDate(item.date)}</span>}
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      );
    }
    case "gallery": {
      const images = Array.isArray(section.content) ? (section.content as string[]) : [];
      return (
        <div className="gallery-grid">
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
      await queryClient.invalidateQueries({ queryKey: ["invitation", slug] });
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

  if (query.isLoading) {
    return <div className="page-loading">Loading invitation...</div>;
  }

  if (!invitation || !invitation.isPublished) {
    return <div className="page-error">This invitation is not published.</div>;
  }

  const eventTime = formatTime(invitation.event.time);

  return (
    <div className="invitation-page" style={themeStyle}>
      <header className="invitation-hero">
        <p className="headline">{invitation.headline}</p>
        <h1>
          {invitation.couple.brideName} &amp; {invitation.couple.groomName}
        </h1>
        <p className="sub">{invitation.event.title}</p>
      </header>

      <section className="event-info">
        <h2>Event Details</h2>
        <p className="event-date">{formatDate(invitation.event.date)}</p>
        {eventTime && <p className="event-time">{eventTime} WIB</p>}
        <p className="event-venue">{invitation.event.venue}</p>
        {invitation.event.address && <p className="event-address">{invitation.event.address}</p>}
        {invitation.event.mapLink && (
          <a className="map-link" href={invitation.event.mapLink} target="_blank" rel="noreferrer">
            Lihat lokasi di Maps
          </a>
        )}
      </section>

      {invitation.sections.map((section, index) => (
        <section key={`${section.type}-${index}`} className={`invitation-section ${section.type}`}>
          <h2>{section.title}</h2>
          {renderSection(section)}
        </section>
      ))}

      <section className="guestbook-section">
        <h2>Guestbook</h2>
        <form
          className="guestbook-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Your name"
            required
          />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Send a message for the happy couple"
            maxLength={500}
            required
          />
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send Message"}
          </button>
        </form>

        <div className="guestbook-list">
          {detail?.guestbook?.length ? (
            detail.guestbook.map((entry) => (
              <article key={entry.id} className="guestbook-entry">
                <header>
                  <h4>{entry.guestName}</h4>
                  <span>{dayjs(entry.createdAt).fromNow()}</span>
                </header>
                <p>{entry.message}</p>
              </article>
            ))
          ) : (
            <p className="empty">No messages yet. Be the first to congratulate!</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default InvitePage;
