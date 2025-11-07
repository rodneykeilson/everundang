import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";
import { getInvitations } from "../api/client";
import type { Invitation } from "../types";
import { useLocale } from "../hooks/useLocale";

const faqItems = [
  { titleKey: "faq01Title", bodyKey: "faq01Body" },
  { titleKey: "faq02Title", bodyKey: "faq02Body" },
  { titleKey: "faq03Title", bodyKey: "faq03Body" },
];

const Home: React.FC = () => {
  const { t } = useLocale();
  const invitationQuery = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => getInvitations(),
  });

  const published =
    invitationQuery.data?.filter((invitation) =>
      (invitation.status ?? (invitation.isPublished ? "published" : "draft")) === "published"
    ) ?? [];

  return (
    <div className="page">
      <Header />

      <main>
        <Hero />
        <Features />
        <HowItWorks />

        <section id="templates" className="section">
          <div className="container">
            <header className="section__header">
              <p className="eyebrow">Showcase</p>
              <h2>{t("sectionTemplatesTitle")}</h2>
              <p className="section__lead">{t("sectionTemplatesSubtitle")}</p>
            </header>

            {invitationQuery.isLoading && <p className="loading">Loading…</p>}

            <div className="template-grid">
              {published.length === 0 && !invitationQuery.isLoading ? (
                <article className="template-empty">
                  <p>No live invitations yet. Publish your first invitation to showcase it here.</p>
                  <Link to="/new" className="ui-button primary">
                    {t("dashboardCta")}
                  </Link>
                </article>
              ) : (
                published.map((invitation) => (
                  <Link
                    to={`/i/${invitation.slug}`}
                    key={invitation.id}
                    className="template-card"
                  >
                    <span className="badge">/i/{invitation.slug}</span>
                    <h3>{invitation.headline}</h3>
                    <p>
                      {invitation.couple.brideName} &amp; {invitation.couple.groomName}
                    </p>
                    <span className="meta">
                      {new Date(invitation.event.date).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <section id="faq" className="section section--muted">
          <div className="container">
            <header className="section__header">
              <p className="eyebrow">Help centre</p>
              <h2>{t("faqTitle")}</h2>
            </header>
            <div className="faq-grid">
              {faqItems.map((item) => (
                <article key={item.titleKey} className="faq-card">
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.bodyKey)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
