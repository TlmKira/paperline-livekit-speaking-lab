"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getDictionary,
  translate,
  type Dictionary,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  dictionary,
}: {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dictionary,
      t: (key) => translate(dictionary, key),
    }),
    [dictionary, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (value) return value;

  const dictionary = getDictionary(DEFAULT_LOCALE);
  return {
    locale: DEFAULT_LOCALE,
    dictionary,
    t: (key: TranslationKey) => translate(dictionary, key),
  };
}
