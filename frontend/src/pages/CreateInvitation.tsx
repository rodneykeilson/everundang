import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { createInvitation } from "../api/client";
import type { InvitationFormData } from "../types";
import { useLocale } from "../hooks/useLocale";

interface FormState {
  slug: string;
  headline: string;
  brideName: string;
  groomName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventAddress: string;
  eventMap: string;
}

const defaultFormState = (): FormState => ({
  slug: "",
  headline: "Celebrate With Us",
  brideName: "",
  groomName: "",
  eventTitle: "Wedding Ceremony",
  eventDate: new Date().toISOString().split("T")[0],
  eventTime: "18:00",
  eventVenue: "",
  eventAddress: "",
  eventMap: "",
});

const CreateInvitation: React.FC = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.slug.trim()) {
      setError("Please provide a slug for your invitation.");
      return;
    }
    if (!form.brideName.trim() || !form.groomName.trim()) {
      setError("Please add both names for the couple.");
      return;
    }
    if (!form.eventVenue.trim()) {
      setError("Please provide the main venue for the event.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: InvitationFormData = {
        slug: form.slug.trim().toLowerCase(),
        headline: form.headline.trim(),
        couple: {
          brideName: form.brideName.trim(),
          groomName: form.groomName.trim(),
        },
        event: {
          title: form.eventTitle.trim(),
          date: form.eventDate,
          time: form.eventTime.trim(),
          venue: form.eventVenue.trim(),
          address: form.eventAddress.trim() || undefined,
          mapLink: form.eventMap.trim() || undefined,
        },
        sections: [],
        theme: {
          primaryColor: "#a855f7",
          secondaryColor: "#f472b6",
        },
        isPublished: false,
        status: "draft",
      };

      const response = await createInvitation(payload);
      navigate(`/edit/${response.invitation.id}?k=${response.ownerToken}`);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create invitation.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="section">
        <div className="container create-flow">
          <header className="section__header">
            <p className="eyebrow">{t("heroPrimaryCta")}</p>
            <h1>Launch a new invitation</h1>
            <p className="section__lead">
              Share a few basics and we will generate a private owner link so you can continue crafting the perfect experience.
            </p>
          </header>

          <form className="create-form" onSubmit={handleSubmit}>
            {error && <p className="form-message error">{error}</p>}
            <div className="grid two">
              <label>
                Invitation slug
                <input
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="aditya-naya"
                  pattern="[a-z0-9-]{3,}"
                  required
                />
                <span className="hint">Slug appears in your public link: /i/your-slug</span>
              </label>
              <label>
                Headline
                <input
                  value={form.headline}
                  onChange={(event) => updateField("headline", event.target.value)}
                  placeholder="Celebrate Our Wedding"
                  required
                />
              </label>
            </div>

            <fieldset>
              <legend>Couple</legend>
              <div className="grid two">
                <label>
                  First name
                  <input
                    value={form.brideName}
                    onChange={(event) => updateField("brideName", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Second name
                  <input
                    value={form.groomName}
                    onChange={(event) => updateField("groomName", event.target.value)}
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Event</legend>
              <div className="grid two">
                <label>
                  Event title
                  <input
                    value={form.eventTitle}
                    onChange={(event) => updateField("eventTitle", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Event venue
                  <input
                    value={form.eventVenue}
                    onChange={(event) => updateField("eventVenue", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(event) => updateField("eventDate", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    value={form.eventTime}
                    onChange={(event) => updateField("eventTime", event.target.value)}
                  />
                </label>
              </div>
              <label>
                Address (optional)
                <input
                  value={form.eventAddress}
                  onChange={(event) => updateField("eventAddress", event.target.value)}
                />
              </label>
              <label>
                Map link (optional)
                <input
                  value={form.eventMap}
                  onChange={(event) => updateField("eventMap", event.target.value)}
                  placeholder="https://maps.google.com/..."
                  type="url"
                />
              </label>
            </fieldset>

            <footer className="form-actions">
              <button type="submit" className="ui-button primary" disabled={isSubmitting}>
                {isSubmitting ? "Generating owner link…" : "Create invitation"}
              </button>
            </footer>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateInvitation;
