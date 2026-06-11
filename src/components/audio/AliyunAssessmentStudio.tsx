// FILE: src/components/audio/AliyunAssessmentStudio.tsx
"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Microphone, Play, Square } from "griddy-icons";
import { AssessmentResult } from "@/components/learn/AssessmentResult";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type {
  PronunciationAssessment,
  PronunciationHighlight,
  PronunciationPhoneme,
  PronunciationStatus,
} from "@/lib/pronunciation";

type SdkPhase =
  | "idle"
  | "loading-sdk"
  | "ready"
  | "recording"
  | "assessing"
  | "result"
  | "error";

interface AliyunAssessmentStudioProps {
  targetWord: string;
  targetPhonemes: string;
  instruct?: string;
}

interface WarrantPayload {
  applicationId: string;
  userId: string;
  warrantId: string;
  coreType: "en.sent.score";
  targetText: string;
  sdkPath?: string;
}

type EngineResult = {
  applicationId?: string;
  recordId?: string;
  refText?: string;
  result?: {
    overall?: number;
    rank?: number;
    details?: unknown[];
    accuracy?: { overall?: number };
    fluency?: { overall?: number };
    rhythm?: { overall?: number };
  };
};

type EngineEvaluatInstance = {
  startRecord: (
    params: Record<string, unknown>,
    done?: (msg: unknown) => void,
    fail?: (msg: unknown) => void,
  ) => void;
  stopRecord: () => void;
  cancelRecord?: () => void;
  destroyEngine?: () => void;
  setMicVolume?: (volume: number) => void;
};

type EngineEvaluatConstructor = new (params: Record<string, unknown>) => EngineEvaluatInstance;

declare global {
  interface Window {
    EngineEvaluat?: EngineEvaluatConstructor;
  }
}

function getDefaultEvalTime(text: string) {
  return Math.min(12000, 2600 + text.trim().split(/\s+/).filter(Boolean).length * 700);
}

function scoreToStatus(score: number): PronunciationStatus {
  if (score >= 80) return "correct";
  if (score >= 55) return "mixed";
  return "needs-work";
}

function getScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return 0;
}

function getDetailText(detail: unknown) {
  if (!detail || typeof detail !== "object") return "";
  const record = detail as Record<string, unknown>;
  for (const key of ["char", "word", "text", "content"]) {
    if (typeof record[key] === "string" && record[key]) return String(record[key]);
  }
  return "";
}

function getDetailScore(detail: unknown) {
  if (!detail || typeof detail !== "object") return 0;
  const record = detail as Record<string, unknown>;
  return getScore(record.score ?? record.overall ?? record.accuracy);
}

function getDetailPhones(detail: unknown): PronunciationPhoneme[] {
  if (!detail || typeof detail !== "object") return [];
  const record = detail as Record<string, unknown>;
  const phoneSource = record.phones ?? record.phone ?? record.phonemes;
  if (!Array.isArray(phoneSource)) return [];

  return phoneSource.map((phone, index) => {
    const phoneRecord = phone && typeof phone === "object" ? (phone as Record<string, unknown>) : {};
    const symbol = String(phoneRecord.char ?? phoneRecord.phone ?? phoneRecord.symbol ?? `#${index + 1}`);
    const accuracy = getScore(phoneRecord.score ?? phoneRecord.accuracy);
    return {
      symbol,
      expected: String(phoneRecord.ref ?? phoneRecord.expected ?? symbol),
      heard: String(phoneRecord.rec ?? phoneRecord.heard ?? symbol),
      accuracy,
      status: scoreToStatus(accuracy),
    };
  });
}

function parseEngineResult(raw: unknown): EngineResult {
  if (typeof raw === "string") {
    return JSON.parse(raw) as EngineResult;
  }

  if (raw && typeof raw === "object") {
    return raw as EngineResult;
  }

  throw new Error("Assessment returned an empty result.");
}

function mapEngineResult(raw: unknown, targetText: string, ipaTarget: string): PronunciationAssessment {
  const record = parseEngineResult(raw);
  const result = record.result ?? {};
  const details = Array.isArray(result.details) ? result.details : [];
  const overallScore = getScore(result.overall);
  const highlights: PronunciationHighlight[] = details
    .map((detail) => {
      const text = getDetailText(detail);
      const score = getDetailScore(detail);
      if (!text) return null;
      return {
        text,
        status: scoreToStatus(score),
        feedback:
          score >= 80
            ? "Clear pronunciation."
            : score >= 55
              ? "Close. Try one slower take."
              : "Needs another pass.",
      } satisfies PronunciationHighlight;
    })
    .filter((item): item is PronunciationHighlight => Boolean(item));

  const fallbackHighlights =
    highlights.length > 0
      ? highlights
      : targetText.split(/\s+/).filter(Boolean).map((word) => ({
          text: word,
          status: scoreToStatus(overallScore),
          feedback:
            overallScore >= 80
              ? "Clear pronunciation."
              : "Try one slower take and keep the word endings clear.",
        }));

  const phonemes = details.flatMap(getDetailPhones);

  return {
    targetText: record.refText?.trim() || targetText,
    ipaTarget,
    transcript: fallbackHighlights.map((item) => item.text).join(" "),
    overallScore,
    summary:
      overallScore >= 80
        ? "Good take. The target was clear."
        : overallScore >= 55
          ? "Close take. Slow down and keep the ending sounds clear."
          : "Try again. Say the target once, a little slower.",
    nextStep:
      overallScore >= 80
        ? "Move to another target or repeat once for consistency."
        : "Listen to the target, then record one slower take.",
    engine: "aliyun-en.sent.score-jssdk",
    highlights: fallbackHighlights,
    phonemes,
  };
}

export function AliyunAssessmentStudio({
  targetWord,
  targetPhonemes,
  instruct,
}: AliyunAssessmentStudioProps) {
  const [phase, setPhase] = useState<SdkPhase>("loading-sdk");
  const [scriptReady, setScriptReady] = useState(false);
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const engineRef = useRef<EngineEvaluatInstance | null>(null);
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const referenceAudioUrlRef = useRef<string | null>(null);

  const statusText = useMemo(() => {
    if (!scriptReady) return "SDK not loaded";
    if (phase === "recording") return "Recording";
    if (phase === "assessing") return "Assessing";
    if (assessment) return "Result ready";
    return "Ready";
  }, [assessment, phase, scriptReady]);

  useEffect(() => {
    return () => {
      engineRef.current?.cancelRecord?.();
      engineRef.current?.destroyEngine?.();
      engineRef.current = null;
      referenceAudioRef.current?.pause();
      if (referenceAudioUrlRef.current) URL.revokeObjectURL(referenceAudioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    setAssessment(null);
    setError(null);
    setReferenceError(null);
    setVolume(0);
    if (referenceAudioUrlRef.current) {
      URL.revokeObjectURL(referenceAudioUrlRef.current);
      referenceAudioUrlRef.current = null;
    }
    referenceAudioRef.current?.pause();
    referenceAudioRef.current = null;
    setIsPlayingReference(false);
  }, [targetWord, targetPhonemes, instruct]);

  async function requestWarrant() {
    const response = await fetch("/api/aliyun-assessment/warrant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetText: targetWord }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | WarrantPayload
      | { error?: string };

    if (!response.ok || ("error" in payload && payload.error)) {
      throw new Error("error" in payload && payload.error ? payload.error : "Assessment authorization failed.");
    }

    return payload as WarrantPayload;
  }

  async function handleReferenceAudio() {
    setReferenceError(null);

    if (referenceAudioRef.current && !referenceAudioRef.current.paused) {
      referenceAudioRef.current.pause();
      referenceAudioRef.current.currentTime = 0;
      setIsPlayingReference(false);
      return;
    }

    if (referenceAudioRef.current) {
      referenceAudioRef.current.currentTime = 0;
      await referenceAudioRef.current.play().catch(() => {});
      setIsPlayingReference(true);
      return;
    }

    try {
      setIsLoadingReference(true);
      const params = new URLSearchParams({ text: targetWord });
      if (instruct) params.set("instruct", instruct);
      const response = await fetch(`/api/reference-audio?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Target audio is unavailable.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingReference(false);
      audio.onpause = () => setIsPlayingReference(false);
      referenceAudioUrlRef.current = url;
      referenceAudioRef.current = audio;
      await audio.play().catch(() => {});
      setIsPlayingReference(true);
    } catch (nextError) {
      setReferenceError(nextError instanceof Error ? nextError.message : "Target audio is unavailable.");
      setIsPlayingReference(false);
    } finally {
      setIsLoadingReference(false);
    }
  }

  async function handleStart() {
    if (!window.EngineEvaluat) {
      setError("Missing /sdk/engine.js. Download the Aliyun speech assessment Web SDK and place engine.js in public/sdk/engine.js.");
      setPhase("error");
      return;
    }

    setAssessment(null);
    setError(null);
    setPhase("assessing");

    try {
      const warrant = await requestWarrant();
      engineRef.current?.destroyEngine?.();

      const engine = new window.EngineEvaluat({
        applicationId: warrant.applicationId,
        userId: warrant.userId,
        warrantId: warrant.warrantId,
        coreType: "en.sent.score",
        logIsOpen: false,
        micAllowCallback: () => setError(null),
        micForbidCallback: () => {
          setPhase("ready");
          setError("Microphone access is blocked. Allow microphone permission and try again.");
        },
        micVolumeCallback: (data: unknown) => setVolume(getScore(data)),
        JSSDKNotSupport: () => {
          setPhase("error");
          setError("This browser does not support the Aliyun speech assessment SDK.");
        },
        noNetwork: () => setError("Network connection is unavailable."),
        engineBackResultDone: (msg: unknown) => {
          const nextAssessment = mapEngineResult(msg, targetWord, targetPhonemes);
          setAssessment(nextAssessment);
          setPhase("result");
        },
        engineBackResultFail: (msg: unknown) => {
          setPhase("ready");
          setError(typeof msg === "string" ? msg : "Aliyun assessment failed.");
        },
      });

      engineRef.current = engine;
      engine.setMicVolume?.(1.5);
      engine.startRecord(
        {
          coreType: "en.sent.score",
          refText: targetWord,
          warrantId: warrant.warrantId,
          rateScale: 1.0,
          symbol: 1,
          evalTime: getDefaultEvalTime(targetWord),
          attachAudioUrl: 1,
        },
        (msg) => {
          const nextAssessment = mapEngineResult(msg, targetWord, targetPhonemes);
          setAssessment(nextAssessment);
          setPhase("result");
        },
        (msg) => {
          setPhase("ready");
          setError(typeof msg === "string" ? msg : "Aliyun assessment failed.");
        },
      );
      setPhase("recording");
    } catch (nextError) {
      setPhase("ready");
      setError(nextError instanceof Error ? nextError.message : "Assessment could not start.");
    }
  }

  function handleStop() {
    if (phase !== "recording") return;
    setPhase("assessing");
    engineRef.current?.stopRecord();
  }

  function handleRetry() {
    setAssessment(null);
    setError(null);
    setVolume(0);
    setPhase(scriptReady ? "ready" : "loading-sdk");
  }

  return (
    <>
      <Script
        src="/sdk/engine.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(Boolean(window.EngineEvaluat));
          setPhase(Boolean(window.EngineEvaluat) ? "ready" : "error");
        }}
        onError={() => {
          setScriptReady(false);
          setPhase("error");
          setError("Missing /sdk/engine.js. Download the Aliyun speech assessment Web SDK and place engine.js in public/sdk/engine.js.");
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
        <Card className="bg-bright-snow">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-sage-green/15 px-3 py-2 text-sm font-medium text-sage-green">
                <Activity size={18} filled color="currentColor" />
                Aliyun assessment
              </div>
              <CardTitle className="text-2xl">Record one take.</CardTitle>
              <CardDescription>
                This Quick Practice panel uses the Aliyun Web SDK when the SDK file and warrant endpoint are configured.
              </CardDescription>
            </div>

            <div className="rounded-xl bg-vanilla-cream px-4 py-4">
              <p className="text-sm font-semibold text-hunter-green">Current target</p>
              <p className="mt-2 text-3xl font-semibold text-hunter-green">{targetWord}</p>
              <p className="mt-1 text-base text-iron-grey">{targetPhonemes}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={phase === "recording" ? "danger" : "primary"}
                disabled={!scriptReady || phase === "assessing"}
                onClick={phase === "recording" ? handleStop : () => void handleStart()}
              >
                {phase === "recording" ? (
                  <Square size={18} filled color="currentColor" />
                ) : (
                  <Microphone size={18} filled color="currentColor" />
                )}
                {phase === "recording" ? "Stop recording" : "Start assessment"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => void handleReferenceAudio()}
                disabled={isLoadingReference || phase === "recording"}
              >
                {isPlayingReference ? (
                  <Square size={18} filled color="currentColor" />
                ) : (
                  <Play size={18} filled color="currentColor" />
                )}
                {isLoadingReference ? "Loading voice" : isPlayingReference ? "Stop target" : "Hear target"}
              </Button>
            </div>

            <div className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-iron-grey">
              Status: <span className="font-semibold text-hunter-green">{statusText}</span>
              {phase === "recording" ? ` · Mic volume ${volume}` : null}
            </div>

            {error ? (
              <div className="rounded-xl bg-blushed-brick px-4 py-3 text-sm leading-6 text-bright-snow">
                {error}
              </div>
            ) : null}

            {referenceError ? (
              <div className="rounded-xl bg-blushed-brick px-4 py-3 text-sm leading-6 text-bright-snow">
                {referenceError}
              </div>
            ) : null}

            {!scriptReady ? (
              <div className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-iron-grey">
                Place Aliyun&apos;s Web SDK at <code>public/sdk/engine.js</code>, then refresh this page.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="bg-white">
          {assessment ? (
            <AssessmentResult
              assessment={assessment}
              onRetry={handleRetry}
              onNext={handleRetry}
              nextLabel="Practice again"
            />
          ) : (
            <div className="flex h-full min-h-[26rem] flex-col justify-center rounded-xl bg-vanilla-cream px-5 py-5 text-center">
              <CardTitle className="text-3xl">Ready to test Aliyun scoring.</CardTitle>
              <CardDescription className="mt-3">
                Start one take to see whether the Web SDK returns a usable sentence score.
              </CardDescription>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
