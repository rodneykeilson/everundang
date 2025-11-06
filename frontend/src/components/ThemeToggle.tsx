import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";

const THEME_LABELS = {
  light: {
    en: "Light",
    id: "Terang",
  },
  dark: {
    en: "Dark",
    id: "Gelap",
  },
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { locale, t } = useLocale();

  const modeLabel = THEME_LABELS[theme]?.[locale] ?? theme;

  return (
    <button
      type="button"
      className="ui-button subtle"
      onClick={toggleTheme}
      aria-label={`${t("themeLabel")}: ${modeLabel}`}
    >
      <span aria-hidden="true">{theme === "light" ? "🌞" : "🌜"}</span>
      <span className="ui-button__label">{modeLabel}</span>
    </button>
  );
}
