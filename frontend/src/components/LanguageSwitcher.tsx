import { useLocale } from "../hooks/useLocale";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="language-switcher">
      <span className="language-switcher__label">{t("languageLabel")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="ui-select"
      >
        <option value="en">English</option>
        <option value="id">Bahasa Indonesia</option>
      </select>
    </label>
  );
}
