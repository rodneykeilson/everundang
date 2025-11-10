import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";
import { getInvitations } from "../api/client";
import type { Invitation } from "../types";
import { useLocale } from "../hooks/useLocale";
import { curatedTemplates } from "../data/curatedTemplates";

const faqItems = [
  { titleKey: "faq01Title", bodyKey: "faq01Body" },
  { titleKey: "faq02Title", bodyKey: "faq02Body" },
  { titleKey: "faq03Title", bodyKey: "faq03Body" },
];

const Home: React.FC = () => {
  const { t } = useLocale();
  const location = useLocation();
  const invitationQuery = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => getInvitations(),
  });

  const published =
    invitationQuery.data?.filter((invitation) =>
      (invitation.status ?? (invitation.isPublished ? "published" : "draft")) === "published"
    ) ?? [];

  useEffect(() => {
    document.title = "EverUndang · Digital Invitations";
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }
    const targetId = location.hash.replace("#", "");
    if (!targetId) {
      return;
    }
    const scrollToSection = () => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    // Delay scrolling slightly to ensure layout has rendered
    const id = window.requestAnimationFrame(scrollToSection);
    return () => window.cancelAnimationFrame(id);
  }, [location.hash]);

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

            <div className="template-collection">
              <div className="template-group">
                <h3 className="template-subheading">{t("templatesCuratedLabel")}</h3>
                <div className="template-grid template-grid--curated">
                  {curatedTemplates.map((template) => (
                    <article key={template.id} className="template-card template-card--preset">
                      <div
                        className="template-card__preview"
                        style={{ backgroundImage: `url(${template.previewImage})` }}
                        role="presentation"
                        aria-hidden
                      />
                      <div className="template-card__body">
                        <span className="badge">{template.category}</span>
                        <h3>{template.name}</h3>
                        <p>{template.description}</p>
                        <div className="template-card__tags">
                          {template.tags.map((tag) => (
                            <span key={tag} className="template-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="template-card__actions">
                        <Link to={`/new?template=${template.id}`} className="ui-button primary">
                          {t("templateUseButton")}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="template-group">
                <h3 className="template-subheading">{t("templatesLiveLabel")}</h3>
                {invitationQuery.isLoading && <p className="loading">Loading…</p>}
                {published.length > 0 ? (
                  <div className="template-grid">
                    {published.map((invitation) => (
                      <Link
                        to={`/#/i/${invitation.slug}`}
                        key={invitation.id}
                        className="template-card"
                      >
                        <span className="badge">/#/i/{invitation.slug}</span>
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
                    ))}
                  </div>
                ) : (
                  !invitationQuery.isLoading && (
                    <article className="template-empty">
                      <p>{t("templatesEmptyMessage")}</p>
                      <Link to="/new" className="ui-button primary">
                        {t("dashboardCta")}
                      </Link>
                    </article>
                  )
                )}
              </div>
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
