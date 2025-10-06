import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface EventData {
  title?: string;
  date?: string;
  venue?: string;
  isPublished?: boolean;
}

const InvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      if (!slug) return;
      const ref = doc(db, "tenants", slug, "events", "default");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as EventData;
        setEvent(data);
      } else {
        setEvent(null);
      }
      setLoading(false);
    }
    fetchEvent();
  }, [slug]);

  if (loading) return <div>Loading...</div>;

  if (!event || !event.isPublished) {
    return <div>This invitation is not published.</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>{event.title || "—"}</h2>
      <p>Date: {event.date || "—"}</p>
      <p>Venue: {event.venue || "—"}</p>
    </div>
  );
};

export default InvitePage;
