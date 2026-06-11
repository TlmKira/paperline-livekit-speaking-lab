import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/locales";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
}

export async function getI18n() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return {
    locale,
    dictionary,
  };
}
