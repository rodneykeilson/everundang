import { useLocale } from "../hooks/useLocale";
import type { TranslationKey } from "../i18n";

const featureList: Array<{ key: TranslationKey; icon: string; descriptionKey: TranslationKey }> = [
  {
    key: "featureTemplates",
    icon: "🎨",
    descriptionKey: "featureTemplatesDesc",
  },
  {
    key: "featureAnalytics",
    icon: "📊",
    descriptionKey: "featureAnalyticsDesc",
  },
  {
    key: "featureSecurity",
    icon: "🔒",
    descriptionKey: "featureSecurityDesc",
  },
];

const Features: React.FC = () => {
  const { t } = useLocale();

  return (
    <section className="section" aria-labelledby="features-heading">
      <div className="container">
        <header className="section__header">
          <p className="eyebrow">{t("eyebrowProductPillars")}</p>
          <h2 id="features-heading">{t("featuresSectionTitle")}</h2>
          <p className="section__lead">
            {t("featuresSectionLead")}
          </p>
        </header>
        <div className="feature-grid">
          {featureList.map((feature) => (
            <article key={feature.key} className="feature-card">
              <span className="feature-card__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{t(feature.key)}</h3>
              <p>{t(feature.descriptionKey)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
