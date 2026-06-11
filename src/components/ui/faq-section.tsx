// FILE: src/components/ui/faq-section.tsx
"use client";

import { useState } from "react";
import {
  Cursor,
  CursorFollow,
  CursorProvider,
} from "@/components/animate-ui/components/animate/cursor";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function FaqSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems = [
    {
      question: t("faq.items.scoreQuestion"),
      answer: t("faq.items.scoreAnswer"),
    },
    {
      question: t("faq.items.dailyQuestion"),
      answer: t("faq.items.dailyAnswer"),
    },
    {
      question: t("faq.items.trialQuestion"),
      answer: t("faq.items.trialAnswer"),
    },
    {
      question: t("faq.items.phonemeQuestion"),
      answer: t("faq.items.phonemeAnswer"),
    },
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
      <Card className="h-full bg-white">
        <div className="flex h-full flex-col space-y-2">
          <p className="eyebrow text-sm text-sage-green">{t("faq.eyebrow")}</p>
          <h2 className="max-w-md text-3xl font-semibold text-hunter-green">
            {t("faq.title")}
          </h2>
        </div>
      </Card>

      <div className="grid gap-3">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <CursorProvider key={item.question} className="w-full">
              <Cursor className="bg-hunter-green" />
              <CursorFollow
                side="top"
                sideOffset={18}
                align="center"
                className="bg-hunter-green text-white"
              >
                {isOpen ? t("faq.closeAnswer") : t("faq.openAnswer")}
              </CursorFollow>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className={cn(
                  "w-full cursor-pointer rounded-3xl p-0 text-left",
                  "focus-visible:outline-none focus-visible:ring-0",
                )}
              >
                <Card
                  className={cn(
                    "flex flex-col gap-4 p-5 sm:p-6",
                    isOpen
                      ? "bg-hunter-green text-white"
                      : "bg-white text-hunter-green",
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "eyebrow inline-flex rounded-full px-3 py-1.5 text-xs",
                          isOpen
                            ? "bg-white/10 text-yellow-green"
                            : "bg-vanilla-cream text-sage-green",
                        )}
                      >
                        0{index + 1}
                      </div>

                      <h3
                        className={cn(
                          "text-lg font-semibold sm:text-xl",
                          isOpen ? "text-white" : "text-hunter-green",
                        )}
                      >
                        {item.question}
                      </h3>
                    </div>

                    <div
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                        isOpen
                          ? "bg-white/10 text-white/84"
                          : "bg-bright-snow text-iron-grey",
                      )}
                    >
                      {isOpen ? t("faq.close") : t("faq.open")}
                    </div>
                  </div>

                  {isOpen ? (
                    <p className="max-w-3xl pr-2 text-sm leading-7 text-white/78">
                      {item.answer}
                    </p>
                  ) : null}
                </Card>
              </button>
            </CursorProvider>
          );
        })}
      </div>
    </section>
  );
}
