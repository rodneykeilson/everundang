import { useLocale } from "../hooks/useLocale";
import type { TranslationKey } from "../i18n";

const steps: Array<{
  number: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  {
    number: "01",
    titleKey: "workflowStep1Title",
    bodyKey: "workflowStep1Body",
  },
  {
    number: "02",
    titleKey: "workflowStep2Title",
    bodyKey: "workflowStep2Body",
  },
  {
    number: "03",
    titleKey: "workflowStep3Title",
    bodyKey: "workflowStep3Body",
  },
];

const HowItWorks: React.FC = () => {
  const { t } = useLocale();

  return (
    <section className="section" aria-labelledby="workflow-heading">
      <div className="container">
        <header className="section__header">
          <p className="eyebrow">{t("eyebrowWorkflow")}</p>
          <h2 id="workflow-heading">{t("workflowSectionTitle")}</h2>
          <p className="section__lead">
            {t("workflowSectionLead")}
          </p>
        </header>
        <ol className="workflow-grid">
          {steps.map((step) => (
            <li key={step.number} className="workflow-card">
              <span className="workflow-card__index" aria-hidden="true">
                {step.number}
              </span>
              <h3>{t(step.titleKey)}</h3>
              <p>{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
