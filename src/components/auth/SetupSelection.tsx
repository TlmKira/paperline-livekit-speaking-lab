"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { ArrowRight, Cloud, Database } from "griddy-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface SetupSelectionProps {
  runtime: "desktop" | "web";
  nextPath: string | null;
  currentMode: "local" | "cloud" | null;
  cloudAvailable: boolean;
  currentDisplayName: string | null;
}

export function SetupSelection({
  runtime,
  nextPath,
  currentMode,
  cloudAvailable,
  currentDisplayName,
}: SetupSelectionProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [pendingMode, setPendingMode] = useState<"local" | "cloud" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localTitle = useMemo(() => {
    return runtime === "desktop"
      ? t("setup.localTitleDesktop")
      : t("setup.localTitleWeb");
  }, [runtime, t]);

  async function handleModeSelection(mode: "local" | "cloud") {
    setPendingMode(mode);
    setError(null);

    try {
      const response = await fetch("/api/setup/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          next: mode === "local" ? nextPath : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { redirectTo?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("setup.saveError"));
      }

      startTransition(() => {
        router.replace(payload?.redirectTo ?? (mode === "local" ? "/dashboard" : "/signup"));
        router.refresh();
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("setup.saveError"),
      );
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl items-center justify-center">
      <div className="grid w-full gap-4 lg:grid-cols-[0.96fr_1.04fr] xl:gap-5">
        <Card className="bg-hunter-green text-bright-snow">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-yellow-green">
              <span className="eyebrow text-sm">{t("setup.setup")}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-bright-snow sm:text-4xl lg:text-5xl">
                {t("setup.title")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-bright-snow/78">
                {t("setup.body")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("setup.openSource")}</p>
                <p className="mt-2 text-base font-semibold text-bright-snow">
                  {t("setup.openSourceBody")}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 px-4 py-4">
                <p className="eyebrow text-xs text-yellow-green/82">{t("setup.hosted")}</p>
                <p className="mt-2 text-base font-semibold text-bright-snow">
                  {t("setup.hostedBody")}
                </p>
              </div>
            </div>

            {currentDisplayName ? (
              <div className="rounded-3xl bg-white/10 px-4 py-4 text-sm leading-7 text-bright-snow/82">
                {t("setup.currentWorkspace")}{" "}
                <span className="font-semibold text-bright-snow">{currentDisplayName}</span>
                {currentMode ? ` · ${currentMode === "local" ? t("common.localMode") : t("common.cadenceCloud")}` : "."}
              </div>
            ) : null}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card
            className={cn(
              "bg-white",
              currentMode === "local" ? "ring-2 ring-hunter-green" : "",
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-vanilla-cream text-hunter-green">
                  <Database size={18} color="currentColor" />
                </span>
                <div className="space-y-1">
                  <p className="eyebrow text-xs text-sage-green">{t("setup.localMode")}</p>
                  <h2 className="text-2xl font-semibold text-hunter-green">{localTitle}</h2>
                </div>
              </div>

              <p className="text-sm leading-7 text-iron-grey">
                {t("setup.localDescription")}
              </p>

              <div className="rounded-3xl bg-vanilla-cream px-4 py-4 text-sm leading-7 text-iron-grey">
                {t("setup.localBestFor")}
              </div>

              <Button
                onClick={() => void handleModeSelection("local")}
                disabled={pendingMode !== null}
              >
                {pendingMode === "local" ? t("setup.savingLocal") : t("setup.continueLocal")}
                <ArrowRight size={16} color="currentColor" />
              </Button>
            </div>
          </Card>

          <Card
            className={cn(
              "bg-white",
              currentMode === "cloud" ? "ring-2 ring-hunter-green" : "",
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-vanilla-cream text-hunter-green">
                  <Cloud size={18} color="currentColor" />
                </span>
                <div className="space-y-1">
                  <p className="eyebrow text-xs text-sage-green">{t("common.cadenceCloud")}</p>
                  <h2 className="text-2xl font-semibold text-hunter-green">
                    {t("setup.cloudTitle")}
                  </h2>
                </div>
              </div>

              <p className="text-sm leading-7 text-iron-grey">
                {t("setup.cloudDescription")}
              </p>

              <div className="rounded-3xl bg-vanilla-cream px-4 py-4 text-sm leading-7 text-iron-grey">
                {cloudAvailable
                  ? t("setup.cloudAvailable")
                  : t("setup.cloudUnavailable")}
              </div>

              <Button
                onClick={() => void handleModeSelection("cloud")}
                disabled={pendingMode !== null || !cloudAvailable}
              >
                {pendingMode === "cloud" ? t("setup.openingCloud") : t("setup.useCloud")}
                <ArrowRight size={16} color="currentColor" />
              </Button>
            </div>
          </Card>

          {error ? (
            <div className="rounded-3xl bg-blushed-brick px-4 py-3 text-sm text-bright-snow">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
