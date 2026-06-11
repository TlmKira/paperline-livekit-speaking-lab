import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
} from "@/lib/i18n/locales";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { locale?: unknown }
    | null;
  const locale = payload?.locale;

  if (!isLocale(locale)) {
    return NextResponse.json(
      { error: "Invalid locale." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ locale: DEFAULT_LOCALE });
  response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
