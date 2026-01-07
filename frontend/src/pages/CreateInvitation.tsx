import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createInvitation } from "../api/client";
import type { InvitationFormData } from "../types";
import { useLocale } from "../hooks/useLocale";
import { useToast } from "../hooks/useToast";
import { getTemplatePreset, type TemplatePreset } from "../data/curatedTemplates";

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
  backgroundImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
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
  backgroundImageUrl: "",
  primaryColor: "#a855f7",
  secondaryColor: "#f472b6",
});

type WizardStep = 1 | 2 | 3;

const CreateInvitation: React.FC = () => {
  const { t } = useLocale();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  const steps = useMemo(() => [
    { number: 1, label: t("wizardStep1") },
    { number: 2, label: t("wizardStep2") },
    { number: 3, label: t("wizardStep3") },
  ], [t]);

  useEffect(() => {
    document.title = "Create Invitation · EverUndang";
  }, []);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) {
      setSelectedTemplate(null);
      return;
    }
    const preset = getTemplatePreset(templateId);
    if (!preset) {
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(preset);

    const base = defaultFormState();
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + (preset.eventDateOffsetDays ?? 60));

    setForm({
      ...base,
      slug: preset.slugSuggestion,
      headline: preset.headline,
      brideName: preset.brideName,
      groomName: preset.groomName,
      eventTitle: preset.eventTitle,
      eventDate: eventDate.toISOString().split("T")[0],
      eventTime: preset.eventTime,
      eventVenue: preset.eventVenue,
      eventAddress: preset.eventAddress ?? "",
      backgroundImageUrl: preset.backgroundImageUrl ?? "",
      primaryColor: preset.primaryColor ?? base.primaryColor,
      secondaryColor: preset.secondaryColor ?? base.secondaryColor,
    });
  }, [searchParams]);

  const handleClearTemplate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("template");
    setSearchParams(next, { replace: true });
    setSelectedTemplate(null);
    setForm(defaultFormState());
  };

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (step: WizardStep): boolean => {
    setError(null);
    switch (step) {
      case 1:
        if (!form.slug.trim()) {
          setError(t("formErrorSlug"));
          return false;
        }
        if (!form.brideName.trim() || !form.groomName.trim()) {
          setError(t("formErrorNames"));
          return false;
        }
        return true;
      case 2:
        if (!form.eventVenue.trim()) {
          setError(t("formErrorVenue"));
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validateStep(1) || !validateStep(2)) {
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
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          backgroundImageUrl: form.backgroundImageUrl.trim()
            ? form.backgroundImageUrl.trim()
            : null,
        },
        isPublished: false,
        status: "draft",
      };

      const response = await createInvitation(payload);
      toast.success(t("invitationCreated"));
      navigate(`/edit/${response.invitation.id}?k=${response.ownerToken}`);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create invitation.";
      toast.error(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <h1 className="page-title__main">✨ {t("createTitle")}</h1>
        <p className="page-title__sub">{t("createLead")}</p>
      </div>

      <div className="create-flow">
          {/* Step Indicator */}
          <nav className="wizard-steps" aria-label="Form progress">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`wizard-step ${currentStep === step.number ? "wizard-step--active" : ""} ${currentStep > step.number ? "wizard-step--completed" : ""}`}
              >
                <span className="wizard-step__number">{step.number}</span>
                <span className="wizard-step__label">{step.label}</span>
              </div>
            ))}
          </nav>

          <form className="create-form" onSubmit={handleSubmit}>
            {selectedTemplate ? (
              <aside className="template-banner" role="status">
                <div>
                  <p className="template-banner__title">
                    {t("templateApplied")}: <span>{selectedTemplate.name}</span>
                  </p>
                  <p className="template-banner__body">{t("templateAppliedDescription")}</p>
                </div>
                <button 
                  type="button" 
                  className="ui-button subtle" 
                  onClick={handleClearTemplate}
                  title={t("templateClearHelper")}
                >
                  {t("templateClear")}
                </button>
              </aside>
            ) : null}
            {error && <p className="form-message error">{error}</p>}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="wizard-content">
                <div className="grid two">
                  <label>
                    {t("formInvitationSlug")}
                    <input
                      value={form.slug}
                      onChange={(event) => updateField("slug", event.target.value)}
                      placeholder={t("formSlugPlaceholder")}
                      pattern="[a-z0-9\-]{3,}"
                      required
                    />
                    <span className="hint">{t("formInvitationSlugHint")}</span>
                  </label>
                  <label>
                    {t("formHeadline")}
                    <input
                      value={form.headline}
                      onChange={(event) => updateField("headline", event.target.value)}
                      placeholder={t("formHeadlinePlaceholder")}
                      required
                    />
                    <span className="hint">{t("formHeadlineHelper")}</span>
                  </label>
                </div>

                <fieldset>
                  <legend>{t("formCoupleFieldset")}</legend>
                  <div className="grid two">
                    <label>
                      {t("formFirstName")}
                      <input
                        value={form.brideName}
                        onChange={(event) => updateField("brideName", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {t("formSecondName")}
                      <input
                        value={form.groomName}
                        onChange={(event) => updateField("groomName", event.target.value)}
                        required
                      />
                    </label>
                  </div>
                </fieldset>
              </div>
            )}

            {/* Step 2: Event Details */}
            {currentStep === 2 && (
              <div className="wizard-content">
                <fieldset>
                  <legend>{t("formEventFieldset")}</legend>
                  <div className="grid two">
                    <label>
                      {t("formEventTitle")}
                      <input
                        value={form.eventTitle}
                        onChange={(event) => updateField("eventTitle", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {t("formEventVenue")}
                      <input
                        value={form.eventVenue}
                        onChange={(event) => updateField("eventVenue", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {t("formEventDate")}
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(event) => updateField("eventDate", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      {t("formEventTime")}
                      <input
                        type="time"
                        value={form.eventTime}
                        onChange={(event) => updateField("eventTime", event.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    {t("formEventAddress")}
                    <input
                      value={form.eventAddress}
                      onChange={(event) => updateField("eventAddress", event.target.value)}
                    />
                  </label>
                  <label>
                    {t("formEventMapLink")}
                    <input
                      value={form.eventMap}
                      onChange={(event) => updateField("eventMap", event.target.value)}
                      placeholder={t("formEventMapPlaceholder")}
                      type="url"
                    />
                  </label>
                </fieldset>

                <label>
                  {t("formBackgroundImage")}
                  <input
                    value={form.backgroundImageUrl}
                    onChange={(event) => updateField("backgroundImageUrl", event.target.value)}
                    placeholder={t("formBackgroundImagePlaceholder")}
                    type="url"
                  />
                  <span className="hint">
                    {t("formBackgroundImageHint")}
                  </span>
                </label>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="wizard-content wizard-review">
                <div className="review-section">
                  <h3>{t("wizardStep1")}</h3>
                  <dl className="review-grid">
                    <dt>{t("formInvitationSlug")}</dt>
                    <dd>{form.slug || "—"}</dd>
                    <dt>{t("formHeadline")}</dt>
                    <dd>{form.headline || "—"}</dd>
                    <dt>{t("formCoupleFieldset")}</dt>
                    <dd>{form.brideName} &amp; {form.groomName}</dd>
                  </dl>
                </div>
                <div className="review-section">
                  <h3>{t("wizardStep2")}</h3>
                  <dl className="review-grid">
                    <dt>{t("formEventTitle")}</dt>
                    <dd>{form.eventTitle || "—"}</dd>
                    <dt>{t("formEventVenue")}</dt>
                    <dd>{form.eventVenue || "—"}</dd>
                    <dt>{t("formEventDate")}</dt>
                    <dd>{form.eventDate}</dd>
                    <dt>{t("formEventTime")}</dt>
                    <dd>{form.eventTime || "—"}</dd>
                    {form.eventAddress && (
                      <>
                        <dt>{t("formEventAddress")}</dt>
                        <dd>{form.eventAddress}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            )}

            <footer className="form-actions wizard-actions">
              {currentStep > 1 && (
                <button type="button" className="ui-button subtle" onClick={handlePrevious}>
                  {t("wizardPrevious")}
                </button>
              )}
              {currentStep < 3 ? (
                <button type="button" className="ui-button primary" onClick={handleNext}>
                  {t("wizardNext")}
                </button>
              ) : (
                <button type="submit" className="ui-button primary" disabled={isSubmitting}>
                  {isSubmitting ? t("formCreatingButton") : t("formCreateButton")}
                </button>
              )}
            </footer>
          </form>
        </div>
    </>
  );
};

export default CreateInvitation;
