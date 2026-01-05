import { useCallback, useMemo, useState } from "react";
import { LocaleContext, type Locale } from "./LocaleContext";
import {
  translate,
  formatDate as i18nFormatDate,
  formatTime as i18nFormatTime,
  formatRelativeTime,
  formatNumber as i18nFormatNumber,
  formatCurrency as i18nFormatCurrency,
  isValidLocale,
  type TranslationKey,
} from "../i18n";

const LOCALE_STORAGE_KEY = "everundang_locale";

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isValidLocale(stored)) {
    return stored;
  }
  const browser = window.navigator.language?.toLowerCase();
  if (browser.startsWith("id")) {
    return "id";
  }
  return "en";
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      return getInitialLocale();
    } catch {
      return "en";
    }
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      // Update document lang attribute for accessibility
      document.documentElement.lang = next;
    }
  }, []);

  const value = useMemo(() => {
    const t = (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locale, key, params);

    const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      i18nFormatDate(locale, date, options);

    const formatTime = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      i18nFormatTime(locale, date, options);

    const formatRelative = (date: Date | string) => formatRelativeTime(locale, date);

    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) =>
      i18nFormatNumber(locale, num, options);

    const formatCurrency = (amount: number, currency?: string) =>
      i18nFormatCurrency(locale, amount, currency);

    return {
      locale,
      setLocale,
      t,
      formatDate,
      formatTime,
      formatRelative,
      formatNumber,
      formatCurrency,
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
