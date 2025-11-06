import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";

const Hero: React.FC = () => {
  const { t } = useLocale();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">EverUndang</p>
          <h1 id="hero-title" className="hero__title">
            {t("heroTitle")}
          </h1>
          <p className="hero__lead">{t("heroSubtitle")}</p>
          <div className="hero__actions">
            <Link to="/dashboard" className="ui-button primary">
              {t("heroPrimaryCta")}
            </Link>
            <Link to="/#templates" className="ui-button subtle">
              {t("heroSecondaryCta")}
            </Link>
          </div>
        </div>
        <div className="hero__visual" aria-hidden>
          <div className="hero-preview-grid">
            <article className="hero-preview-card wedding">
              <span className="badge">Wedding</span>
              <h3>Aditya &amp; Naya</h3>
              <p>15 · 02 · 2026 • Jakarta</p>
            </article>
            <article className="hero-preview-card birthday">
              <span className="badge">Birthday</span>
              <h3>Kara turns 7</h3>
              <p>Playful illustrated timeline themed invite.</p>
            </article>
            <article className="hero-preview-card corporate">
              <span className="badge">Corporate</span>
              <h3>Product Launch</h3>
              <p>Hybrid event with live RSVP and analytics.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
