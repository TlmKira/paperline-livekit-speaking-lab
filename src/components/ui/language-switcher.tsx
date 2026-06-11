"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

const baseClass =
  "inline-flex min-h-11 items-center rounded-full p-1 text-sm font-semibold whitespace-nowrap";

const variants = {
  default: "bg-vanilla-cream text-hunter-green",
  dark: "bg-white/10 text-bright-snow",
  sidebar: "bg-vanilla-cream text-hunter-green",
};

export function LanguageSwitcher({
  variant = "default",
  className,
}: {
  variant?: "default" | "dark" | "sidebar";
  className?: string;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [optimisticLocale, setOptimisticLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();
  const activeLocale = isPending ? optimisticLocale : locale;

  function handleChange(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;

    setOptimisticLocale(nextLocale);
    startTransition(async () => {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (response.ok) {
        router.refresh();
        window.location.reload();
      } else {
        setOptimisticLocale(locale);
      }
    });
  }

  return (
    <div
      className={cn(baseClass, variants[variant], className)}
      aria-label={t("common.language")}
    >
      {LOCALES.map((nextLocale) => {
        const isActive = activeLocale === nextLocale;
        return (
          <button
            key={nextLocale}
            type="button"
            className={cn(
              "min-h-9 rounded-full px-3 transition-colors",
              isActive
                ? "bg-yellow-green text-hunter-green"
                : variant === "dark"
                  ? "text-bright-snow/76 hover:bg-white/10"
                  : "text-hunter-green/72 hover:bg-white/60",
            )}
            aria-pressed={isActive}
            onClick={() => handleChange(nextLocale)}
          >
            {nextLocale === "en" ? t("common.english") : t("common.chinese")}
          </button>
        );
      })}
    </div>
  );
}
