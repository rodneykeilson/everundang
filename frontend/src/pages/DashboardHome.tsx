import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getInvitations } from "../api/client";
import type { Invitation } from "../types";
import { useLocale } from "../hooks/useLocale";
import { curatedTemplates } from "../data/curatedTemplates";

const DashboardHome: React.FC = () => {
  const { t } = useLocale();
  const invitationQuery = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => getInvitations(),
  });

  const invitations = invitationQuery.data ?? [];
  const published = invitations.filter((i) =>
    (i.status ?? (i.isPublished ? "published" : "draft")) === "published"
  );
  const drafts = invitations.filter((i) =>
    (i.status ?? (i.isPublished ? "published" : "draft")) === "draft"
  );

  useEffect(() => {
    document.title = "EverUndang · Dashboard";
  }, []);

  return (
    <>
      {/* Page Title */}
      <div className="page-title">
        <h1 className="page-title__main">
          👋 {t("welcomeBack")}
        </h1>
        <p className="page-title__sub">
          {t("dashboardSubtitle")}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/new" className="quick-action-btn quick-action-btn--primary">
          ✨ {t("heroPrimaryCta")}
        </Link>
        <a href="#templates" className="quick-action-btn">
          📚 {t("navTemplates")}
        </a>
        <Link to="/admin" className="quick-action-btn">
          ⚙️ {t("navAdmin")}
        </Link>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card animate-slide-up">
          <div className="stat-card__value">{invitations.length}</div>
          <div className="stat-card__label">{t("statTotalInvitations")}</div>
        </div>
        <div className="stat-card animate-slide-up">
          <div className="stat-card__value">{published.length}</div>
          <div className="stat-card__label">{t("statPublished")}</div>
        </div>
        <div className="stat-card animate-slide-up">
          <div className="stat-card__value">{drafts.length}</div>
          <div className="stat-card__label">{t("statDrafts")}</div>
        </div>
        <div className="stat-card animate-slide-up">
          <div className="stat-card__value">{curatedTemplates.length}</div>
          <div className="stat-card__label">{t("statTemplates")}</div>
        </div>
      </div>

      {/* Recent Invitations */}
      <section>
        <div className="section-header">
          <div>
            <h2 className="section-header__title">{t("recentInvitations")}</h2>
            <p className="section-header__subtitle">{t("recentInvitationsDesc")}</p>
          </div>
        </div>

        {invitationQuery.isLoading ? (
          <div className="dashboard-card">
            <div className="dashboard-card__content">
              <p>{t("loading")}</p>
            </div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="empty-state animate-slide-up">
            <div className="empty-state__icon">💌</div>
            <h3 className="empty-state__title">{t("emptyInvitationsTitle")}</h3>
            <p className="empty-state__text">{t("emptyInvitationsDesc")}</p>
            <Link to="/new" className="ui-button primary">
              {t("heroPrimaryCta")}
            </Link>
          </div>
        ) : (
          <div className="invitation-grid">
            {invitations.slice(0, 6).map((invitation, index) => {
              const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
              return (
                <Link
                  to={status === "published" ? `/i/${invitation.slug}` : `/edit/${invitation.id}`}
                  key={invitation.id}
                  className="invitation-card animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="invitation-card__image">
                    💒
                  </div>
                  <div className="invitation-card__body">
                    <h3 className="invitation-card__title">{invitation.headline}</h3>
                    <p className="invitation-card__meta">
                      {invitation.couple.brideName} & {invitation.couple.groomName}
                    </p>
                    <span className={`invitation-card__status invitation-card__status--${status}`}>
                      {status === "published" ? (
                        <>
                          <span className="pulse-glow" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                          {t("statusPublished")}
                        </>
                      ) : (
                        <>📝 {t("statusDraft")}</>
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Templates Section */}
      <section id="templates" style={{ marginTop: 48 }}>
        <div className="section-header">
          <div>
            <h2 className="section-header__title">{t("templatesCuratedLabel")}</h2>
            <p className="section-header__subtitle">{t("sectionTemplatesSubtitle")}</p>
          </div>
        </div>

        <div className="template-showcase">
          {curatedTemplates.map((template, index) => (
            <Link
              to={`/new?template=${template.id}`}
              key={template.id}
              className="template-showcase-card animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className="template-showcase-card__preview"
                style={{ backgroundImage: `url(${template.previewImage})` }}
              >
                <div className="template-showcase-card__overlay">
                  <span className="ui-button primary small">{t("templateUseButton")}</span>
                </div>
              </div>
              <div className="template-showcase-card__body">
                <span className="template-showcase-card__category">{template.category}</span>
                <h3 className="template-showcase-card__title">{template.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Cards */}
      <section style={{ marginTop: 48 }}>
        <div className="section-header">
          <div>
            <h2 className="section-header__title">{t("featuresSectionTitle")}</h2>
            <p className="section-header__subtitle">{t("featuresSectionSubtitle")}</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">
                <span className="dashboard-card__icon">🎨</span>
                {t("featureTemplates")}
              </h3>
            </div>
            <p className="dashboard-card__content">{t("featureTemplatesDesc")}</p>
          </div>

          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">
                <span className="dashboard-card__icon">📊</span>
                {t("featureAnalytics")}
              </h3>
            </div>
            <p className="dashboard-card__content">{t("featureAnalyticsDesc")}</p>
          </div>

          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">
                <span className="dashboard-card__icon">🔒</span>
                {t("featureSecurity")}
              </h3>
            </div>
            <p className="dashboard-card__content">{t("featureSecurityDesc")}</p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section style={{ marginTop: 48, marginBottom: 32 }}>
        <div className="section-header">
          <div>
            <h2 className="section-header__title">{t("faqTitle")}</h2>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t("faq01Title")}</h3>
            </div>
            <p className="dashboard-card__content">{t("faq01Body")}</p>
          </div>

          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t("faq02Title")}</h3>
            </div>
            <p className="dashboard-card__content">{t("faq02Body")}</p>
          </div>

          <div className="dashboard-card animate-slide-up">
            <div className="dashboard-card__header">
              <h3 className="dashboard-card__title">{t("faq03Title")}</h3>
            </div>
            <p className="dashboard-card__content">{t("faq03Body")}</p>
          </div>
        </div>
      </section>

      {/* Floating Action Button for Mobile */}
      <Link to="/new" className="fab" aria-label={t("heroPrimaryCta")}>
        +
      </Link>
    </>
  );
};

export default DashboardHome;
