import { createContext } from "react";

export type Locale = "en" | "id";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  translations: Record<string, string>;
}

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
