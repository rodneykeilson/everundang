import { useCallback, useEffect, useMemo, useState } from "react";
import type { Theme } from "./ThemeContext";
import { ThemeContext } from "./ThemeContext";

const THEME_STORAGE_KEY = "everundang_theme";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  return prefersDark ? "dark" : "light";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return getInitialTheme();
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
