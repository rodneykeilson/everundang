import { useLocale } from "../hooks/useLocale";
import { useToast } from "../hooks/useToast";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const toast = useToast();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value as typeof locale;
    setLocale(newLocale);
    const langName = newLocale === "id" ? "Bahasa Indonesia" : "English";
    toast.success(t("languageChanged").replace("{language}", langName));
  };

  return (
    <label className="language-switcher">
      <span className="language-switcher__label">{t("languageLabel")}</span>
      <select
        value={locale}
        onChange={handleChange}
        className="ui-select"
      >
        <option value="en">English</option>
        <option value="id">Bahasa Indonesia</option>
      </select>
    </label>
  );
}
