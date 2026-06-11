"use client";

import Image from "next/image";
import { ArrowRight, Microphone } from "griddy-icons";
import { useMemo, useState } from "react";
import { AliyunAssessmentStudio } from "@/components/audio/AliyunAssessmentStudio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useCoachVoice } from "@/hooks/useCoachVoice";
import { useI18n } from "@/lib/i18n/client";
import type { ModuleWithProgress } from "@/lib/learn";
import {
  getPracticeTarget,
  PRACTICE_TARGET_OPTIONS,
} from "@/lib/practice-targets";

interface QuickPracticeHomeProps {
  modules: ModuleWithProgress[];
}

export function QuickPracticeHome({ modules }: QuickPracticeHomeProps) {
  const { t } = useI18n();
  const [selectedWord, setSelectedWord] = useState("think");
  const { instruct } = useCoachVoice();

  const currentTarget = useMemo(
    () => getPracticeTarget(selectedWord),
    [selectedWord],
  );
  const completedModules = modules.filter(
    (module) => module.progress?.is_completed,
  ).length;
  const unlockedModules = modules.filter(
    (module) => module.progress?.is_unlocked,
  ).length;
  const currentModule =
    modules.find(
      (module) => module.progress?.is_unlocked && !module.progress?.is_completed,
    ) ?? modules[0] ?? null;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="bg-hunter-green text-bright-snow">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-yellow-green">
              <Microphone size={18} filled color="currentColor" />
              <span className="eyebrow text-sm">{t("dashboard.home")}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-bright-snow sm:text-4xl lg:text-5xl">
                {t("dashboard.quickPractice")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-bright-snow/78">
                {t("dashboard.quickPracticeBody")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("dashboard.modulesComplete")}</p>
                <p className="mt-2 text-2xl font-semibold text-bright-snow">
                  {completedModules}/{modules.length || 10}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("dashboard.unlockedNow")}</p>
                <p className="mt-2 text-2xl font-semibold text-bright-snow">
                  {unlockedModules}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("dashboard.currentModule")}</p>
                <p className="mt-2 text-base font-semibold text-bright-snow">
                  {currentModule
                    ? `${t("common.module")} ${currentModule.sort_order}`
                    : t("common.ready")}
                </p>
              </div>
            </div>

            <Button variant="secondary" href="/learn" className="w-fit">
              {t("dashboard.openModules")}
              <ArrowRight size={16} color="currentColor" />
            </Button>
          </div>
        </Card>

        <Card className="bg-white">
          <div className="grid gap-5 md:grid-cols-[0.92fr_1.08fr] md:items-center">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="eyebrow text-sm text-sage-green">{t("dashboard.sessionCue")}</p>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-hunter-green">
                    {t("dashboard.chooseTargetWord")}
                  </span>
                  <Select
                    value={selectedWord}
                    onChange={(event) => setSelectedWord(event.target.value)}
                  >
                    {PRACTICE_TARGET_OPTIONS.map((target) => (
                      <option key={target.word} value={target.word}>
                        {target.label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="rounded-3xl bg-vanilla-cream px-5 py-5">
                <p className="text-3xl font-semibold text-hunter-green sm:text-4xl">
                  {currentTarget.label}
                </p>
                <p className="mt-2 text-lg text-iron-grey">{currentTarget.ipa}</p>
                <p className="mt-4 text-sm leading-7 text-iron-grey">
                  {currentTarget.cue}
                </p>
              </div>

              {currentModule ? (
                <p className="text-sm leading-7 text-iron-grey">
                  {t("dashboard.structuredLearningPrefix")}{" "}
                  <span className="font-semibold text-hunter-green">
                    {t("common.module")} {currentModule.sort_order}: {currentModule.title}
                  </span>
                  .
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center">
              <Image
                src="/illustration/analysing-1.svg"
                alt={t("dashboard.illustrationAlt")}
                width={360}
                height={280}
                className="h-auto w-full max-w-xs object-contain"
                priority
              />
            </div>
          </div>
        </Card>
      </section>

      <AliyunAssessmentStudio
        targetWord={currentTarget.label}
        targetPhonemes={currentTarget.ipa}
        instruct={instruct}
      />
    </div>
  );
}
