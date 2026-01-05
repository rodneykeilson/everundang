/**
 * EverUndang i18n System
 *
 * This module provides internationalization support with:
 * - Type-safe translation keys
 * - Interpolation support for dynamic values
 * - Pluralization support
 * - Date/time formatting utilities
 */

import { en, type TranslationKey } from "./en";
import { id } from "./id";

export type Locale = "en" | "id";

export type Translations = Record<TranslationKey, string>;

export const translations: Record<Locale, Translations> = {
  en: en as Translations,
  id: id as Translations,
};

export type { TranslationKey };

/**
 * Get a translation with optional interpolation
 * @param locale - Current locale
 * @param key - Translation key
 * @param params - Optional parameters for interpolation
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dictionary = translations[locale] ?? translations.en;
  let text: string = dictionary[key] ?? key;

  // Handle interpolation
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    });
  }

  return text;
}

/**
 * Pluralization helper
 * @param locale - Current locale
 * @param count - Number to determine plural form
 * @param singular - Key for singular form
 * @param plural - Key for plural form
 */
export function pluralize(
  locale: Locale,
  count: number,
  singular: TranslationKey,
  plural: TranslationKey
): string {
  const key = count === 1 ? singular : plural;
  return translate(locale, key, { count });
}

/**
 * Format a relative time string
 * @param locale - Current locale
 * @param date - Date to format
 */
export function formatRelativeTime(locale: Locale, date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return translate(locale, "timeJustNow");
  }
  if (diffMinutes < 60) {
    return translate(locale, "timeMinutesAgo", { minutes: diffMinutes });
  }
  if (diffHours < 24) {
    return translate(locale, "timeHoursAgo", { hours: diffHours });
  }
  if (diffDays === 0) {
    return translate(locale, "dateToday");
  }
  if (diffDays === 1) {
    return translate(locale, "dateYesterday");
  }
  if (diffDays < 30) {
    return translate(locale, "dateDaysAgo", { days: diffDays });
  }

  // For older dates, use locale-specific formatting
  return then.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date for display
 * @param locale - Current locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
  locale: Locale,
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeCode = locale === "id" ? "id-ID" : "en-US";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return d.toLocaleDateString(localeCode, defaultOptions);
}

/**
 * Format a time for display
 * @param locale - Current locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatTime(
  locale: Locale,
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeCode = locale === "id" ? "id-ID" : "en-US";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...options,
  };

  return d.toLocaleTimeString(localeCode, defaultOptions);
}

/**
 * Format a number for display
 * @param locale - Current locale
 * @param number - Number to format
 * @param options - Intl.NumberFormatOptions
 */
export function formatNumber(
  locale: Locale,
  number: number,
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === "id" ? "id-ID" : "en-US";
  return number.toLocaleString(localeCode, options);
}

/**
 * Format currency for display
 * @param locale - Current locale
 * @param amount - Amount to format
 * @param currency - Currency code (default: locale-specific)
 */
export function formatCurrency(
  locale: Locale,
  amount: number,
  currency?: string
): string {
  const localeCode = locale === "id" ? "id-ID" : "en-US";
  const defaultCurrency = locale === "id" ? "IDR" : "USD";

  return amount.toLocaleString(localeCode, {
    style: "currency",
    currency: currency ?? defaultCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Get all supported locales with display names
 */
export function getSupportedLocales(): Array<{ code: Locale; name: string; nativeName: string }> {
  return [
    { code: "en", name: "English", nativeName: "English" },
    { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  ];
}

/**
 * Detect user's preferred locale from browser
 */
export function detectLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const browserLang = window.navigator.language?.toLowerCase();

  if (browserLang.startsWith("id")) {
    return "id";
  }

  return "en";
}

/**
 * Validate that a locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locale === "en" || locale === "id";
}
