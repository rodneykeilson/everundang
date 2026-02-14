import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { Sun, Moon } from "lucide-react";

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

interface ThemeToggleProps {
  hideLabel?: boolean;
}

export function ThemeToggle({ hideLabel }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale, t } = useLocale();

  const modeLabel = THEME_LABELS[theme]?.[locale] ?? theme;

  return (
    <button
      type="button"
      className="ui-button subtle"
      onClick={toggleTheme}
      aria-label={`${t("themeLabel")}: ${modeLabel}`}
      title={hideLabel ? modeLabel : undefined}
    >
      <span aria-hidden="true" style={{ display: "flex", alignItems: "center" }}>
        {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
      </span>
      {!hideLabel && <span className="ui-button__label">{modeLabel}</span>}
    </button>
  );
}
