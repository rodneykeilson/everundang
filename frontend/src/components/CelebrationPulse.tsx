import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGlobalActivity } from "../api/client";
import { useLocale } from "../hooks/useLocale";
import "./CelebrationPulse.css";

const CelebrationPulse: React.FC = () => {
  const { t } = useLocale();
  const { data } = useQuery({
    queryKey: ["globalActivity"],
    queryFn: getGlobalActivity,
    refetchInterval: 30000, // Refresh every 30s
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const activities = React.useMemo(() => {
    if (!data) return [];
    const items: Array<{ type: string; text: string; time: string }> = [];

    data.invitations.forEach((inv) => {
      items.push({
        type: "invitation",
        text: `${t("pulseNewInvitation")}: "${inv.headline}"`,
        time: inv.created_at,
      });
    });

    data.rsvps.forEach((rsvp) => {
      items.push({
        type: "rsvp",
        text: `${rsvp.name} ${t("pulseNewRsvp")} to "${rsvp.headline}"`,
        time: rsvp.created_at,
      });
    });

    data.guestbook.forEach((gb) => {
      items.push({
        type: "guestbook",
        text: `${gb.guest_name} ${t("pulseNewGuestbook")} for "${gb.headline}"`,
        time: gb.created_at,
      });
    });

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [data, t]);

  useEffect(() => {
    if (activities.length === 0) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [activities]);

  if (activities.length === 0) return null;

  const current = activities[currentIndex];

  return (
    <div className="celebration-pulse">
      <div className="container">
        <div className={`pulse-content ${isVisible ? "visible" : ""}`}>
          <span className="pulse-dot" />
          <span className="pulse-label">{t("pulseLive")}</span>
          <span className="pulse-text">{current.text}</span>
        </div>
      </div>
    </div>
  );
};

export default CelebrationPulse;
