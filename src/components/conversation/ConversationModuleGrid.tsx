// FILE: src/components/conversation/ConversationModuleGrid.tsx
"use client";

import Image from "next/image";
import type { ConversationModuleWithProgress } from "@/lib/conversation";
import { ConversationModuleCard } from "@/components/conversation/ConversationModuleCard";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";

interface ConversationModuleGridProps {
  modules: ConversationModuleWithProgress[];
}

export function ConversationModuleGrid({
  modules,
}: ConversationModuleGridProps) {
  const { t } = useI18n();
  const completed = modules.filter((module) => module.isCompleted).length;
  const unlocked = modules.filter((module) => module.isUnlocked).length;
  const completionRate = Math.round(
    (completed / Math.max(modules.length, 1)) * 100,
  );
  const currentModule =
    modules.find((module) => module.isUnlocked && !module.isCompleted) ??
    modules[0] ??
    null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="bg-hunter-green text-bright-snow">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="eyebrow text-sm text-yellow-green/82">{t("conversation.trackStructure")}</p>
              <h1 className="text-3xl font-semibold text-bright-snow sm:text-4xl lg:text-5xl">
                {t("conversation.title")}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-bright-snow/78">
                {t("conversation.body")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("conversation.conversationModules")}</p>
                <p className="mt-2 text-2xl font-semibold text-bright-snow">
                  {completed}/{modules.length}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("conversation.unlockedNow")}</p>
                <p className="mt-2 text-2xl font-semibold text-bright-snow">
                  {unlocked}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("conversation.passStandard")}</p>
                <p className="mt-2 text-2xl font-semibold text-bright-snow">
                  {t("common.high")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white">
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div className="flex items-center justify-center">
              <Image
                src="/illustration/communication-1.svg"
                alt={t("conversation.illustrationAlt")}
                width={320}
                height={260}
                className="h-auto w-full max-w-[15rem] object-contain"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="eyebrow text-sm text-sage-green">{t("conversation.currentRoute")}</p>
                <h2 className="text-3xl font-semibold text-hunter-green">
                  {currentModule
                    ? `${currentModule.title}`
                    : t("conversation.startFirst")}
                </h2>
                <p className="text-sm leading-7 text-iron-grey">
                  {currentModule?.scenario ??
                    t("conversation.fallbackScenario")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <ProgressRing score={completionRate} size={80} strokeWidth={7} className="shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-hunter-green">
                    {completed} {t("conversation.passed")}
                  </p>
                  <p className="text-sm leading-6 text-iron-grey">
                    {t("conversation.routeBody")}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-vanilla-cream px-4 py-4">
                <p className="eyebrow text-xs text-sage-green">{t("conversation.format")}</p>
                <p className="mt-2 text-sm leading-6 text-iron-grey">
                  {t("conversation.formatBody")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {modules.map((module) => (
          <ConversationModuleCard key={module.slug} module={module} />
        ))}
      </div>
    </div>
  );
}
