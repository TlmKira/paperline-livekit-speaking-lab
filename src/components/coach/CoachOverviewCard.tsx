// FILE: src/components/coach/CoachOverviewCard.tsx
"use client";

import Link from "next/link";
import { Microphone } from "griddy-icons";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { useI18n } from "@/lib/i18n/client";
import type { AiCoachTurn, SavedAiCoachSession } from "@/lib/ai-coach";

interface CoachOverviewCardProps {
  completedTurns: AiCoachTurn[];
  averageScore: number;
  savedSessions: SavedAiCoachSession[];
}

export function CoachOverviewCard({ completedTurns, averageScore, savedSessions }: CoachOverviewCardProps) {
  const { t } = useI18n();

  return (
    <Card className="bg-hunter-green text-bright-snow">
      <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-yellow-green">
            <Microphone size={18} filled color="currentColor" />
            <span className="eyebrow text-sm">{t("coach.aiCoach")}</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-bright-snow sm:text-4xl lg:text-5xl">
              {t("coach.title")}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-bright-snow/78">
              {t("coach.body")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="rounded-3xl bg-white/10 px-4 py-4">
            <p className="eyebrow text-xs text-yellow-green/82">{t("coach.turnsScored")}</p>
            <p className="mt-2 text-2xl font-semibold text-bright-snow">
              {completedTurns.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 px-4 py-4">
            <p className="eyebrow text-xs text-yellow-green/82">{t("coach.averageScore")}</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressRing
                score={averageScore}
                size={52}
                strokeWidth={5}
                valueLabel={completedTurns.length === 0 ? "0" : `${averageScore}`}
                trackColor="rgba(255,255,255,0.18)"
                className="[&_span]:text-bright-snow shrink-0"
              />
              <p className="hidden text-sm leading-6 text-bright-snow/78 lg:block">
                {t("coach.averageBody")}
              </p>
            </div>
          </div>

          <div className="col-span-2 rounded-3xl bg-white/10 px-4 py-4 lg:col-span-1">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow text-xs text-yellow-green/82">{t("coach.savedConversations")}</p>
                <p className="text-2xl font-semibold text-bright-snow">{savedSessions.length}</p>
                <p className="hidden text-sm leading-6 text-bright-snow/78 sm:block">
                  {t("coach.savedBody")}
                </p>
              </div>
              <Link
                href="/coach/history"
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-yellow-green/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-yellow-green/20"
              >
                {t("common.seeMore")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
