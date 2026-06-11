"use client";

import type {
  PronunciationAssessment,
  PronunciationHighlight,
  PronunciationPhoneme,
  PronunciationStatus,
} from "@/lib/pronunciation";

type WarrantPayload = {
  applicationId: string;
  userId: string;
  warrantId: string;
  coreType: "en.sent.score";
  targetText: string;
  sdkPath?: string;
};

export type EngineEvaluatInstance = {
  startRecord?: (
    params: Record<string, unknown>,
    done?: (msg: unknown) => void,
    fail?: (msg: unknown) => void,
  ) => void;
  stopRecord?: () => void;
  wholeFileUpload?: (event: { target: { files: File[] } }, params: Record<string, unknown>) => void;
  cancel?: () => void;
  cancelRecord?: () => void;
  destroyEngine?: () => void;
  setMicVolume?: (volume: number) => void;
};

export type EngineEvaluatConstructor = new (params: Record<string, unknown>) => EngineEvaluatInstance;

declare global {
  interface Window {
    EngineEvaluat?: EngineEvaluatConstructor;
    __aliyunAssessmentSdkPromise?: Promise<void>;
  }
}

const DEFAULT_SDK_PATH = "/sdk/engine.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function scoreToStatus(score: number): PronunciationStatus {
  if (score >= 80) return "correct";
  if (score >= 55) return "mixed";
  return "needs-work";
}

function getScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  if (isRecord(value)) {
    return getScore(value.overall ?? value.score ?? value.accuracy ?? value.pronunciation);
  }
  return 0;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeRawResult(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed)) return parsed;
  }
  if (isRecord(raw)) return raw;
  throw new Error("Aliyun assessment returned an empty result.");
}

function getResultRecord(record: Record<string, unknown>) {
  return isRecord(record.result) ? record.result : record;
}

function getDetailText(detail: unknown) {
  if (!isRecord(detail)) return "";
  return pickString(detail, ["word", "text", "char", "content", "refText", "ref"]);
}

function getDetailScore(detail: unknown) {
  if (!isRecord(detail)) return 0;
  return getScore(detail.score ?? detail.overall ?? detail.accuracy ?? detail.pronunciation);
}

function getDetailTimings(detail: unknown) {
  if (!isRecord(detail)) return {};
  const begin = getScore(detail.begin ?? detail.start ?? detail.startTime ?? detail.beginTime);
  const end = getScore(detail.end ?? detail.endTime ?? detail.stop ?? detail.stopTime);
  const scale = Math.max(begin, end) > 100 ? 1000 : 1;
  return {
    replyStartSec: begin > 0 ? begin / scale : undefined,
    replyEndSec: end > 0 ? end / scale : undefined,
  };
}

function getDetailPhones(detail: unknown): PronunciationPhoneme[] {
  if (!isRecord(detail)) return [];
  const source = detail.phones ?? detail.phone ?? detail.phonemes ?? detail.phoneme;
  if (!Array.isArray(source)) return [];

  return source.map((phone, index) => {
    const record = isRecord(phone) ? phone : {};
    const symbol = pickString(record, ["phone", "symbol", "char", "text"]) || `#${index + 1}`;
    const accuracy = getScore(record.score ?? record.accuracy ?? record.overall);
    return {
      symbol,
      expected: pickString(record, ["ref", "expected", "standard"]) || symbol,
      heard: pickString(record, ["rec", "heard", "actual"]) || symbol,
      accuracy,
      status: scoreToStatus(accuracy),
    };
  });
}

function collectDetails(result: Record<string, unknown>): unknown[] {
  for (const key of ["details", "words", "wordDetails", "sentences", "items"]) {
    const value = result[key];
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

export function mapAliyunEngineResult(
  raw: unknown,
  targetText: string,
  ipaTarget = "",
): PronunciationAssessment {
  const record = normalizeRawResult(raw);
  const result = getResultRecord(record);
  const details = collectDetails(result);
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      getScore(result.overall ?? result.score ?? result.totalScore ?? result.accuracy ?? record.score),
    ),
  );

  const highlights: PronunciationHighlight[] = details
    .map((detail) => {
      const text = getDetailText(detail);
      if (!text) return null;
      const score = getDetailScore(detail);
      return {
        text,
        status: scoreToStatus(score),
        feedback:
          score >= 80
            ? "Clear pronunciation."
            : score >= 55
              ? "Close. Try one slower take."
              : "Needs another pass.",
        ...getDetailTimings(detail),
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

  return {
    targetText: pickString(record, ["refText", "targetText"]) || targetText,
    ipaTarget,
    transcript:
      pickString(record, ["recText", "transcript", "sentence"]) ||
      fallbackHighlights.map((item) => item.text).join(" "),
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
    phonemes: details.flatMap(getDetailPhones),
  };
}

function loadScript(path: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Aliyun assessment SDK can only run in the browser."));
  }

  if (window.EngineEvaluat) return Promise.resolve();
  if (window.__aliyunAssessmentSdkPromise) return window.__aliyunAssessmentSdkPromise;

  window.__aliyunAssessmentSdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${path}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Aliyun assessment SDK failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = path;
    script.async = true;
    script.onload = () => {
      if (window.EngineEvaluat) resolve();
      else reject(new Error("Aliyun assessment SDK loaded without EngineEvaluat."));
    };
    script.onerror = () => reject(new Error("Missing /sdk/engine.js."));
    document.head.appendChild(script);
  });

  return window.__aliyunAssessmentSdkPromise;
}

async function requestWarrant(targetText: string): Promise<WarrantPayload> {
  const response = await fetch("/api/aliyun-assessment/warrant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetText }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as WarrantPayload | { error?: string } | null;

  if (!response.ok || !payload || ("error" in payload && payload.error)) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "Assessment authorization failed.");
  }

  return payload as WarrantPayload;
}

async function blobToPcmFile(blob: Blob, fileName: string) {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);

  if (buffer.byteLength >= 44 && readAscii(view, 0, 4) === "RIFF" && readAscii(view, 8, 4) === "WAVE") {
    let offset = 12;
    while (offset + 8 <= buffer.byteLength) {
      const id = readAscii(view, offset, 4);
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (id === "data") {
        return new File([buffer.slice(start, start + size)], fileName.replace(/\.\w+$/, ".pcm"), {
          type: "application/octet-stream",
        });
      }
      offset = start + size + (size % 2);
    }
  }

  return new File([buffer], fileName, { type: blob.type || "application/octet-stream" });
}

function readAscii(view: DataView, offset: number, length: number) {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += String.fromCharCode(view.getUint8(offset + index));
  }
  return output;
}

export async function assessBlobWithAliyunSdk(input: {
  audio: Blob;
  targetText: string;
  ipaTarget?: string;
  fileName?: string;
}): Promise<PronunciationAssessment> {
  const targetText = input.targetText.trim();
  if (!targetText) throw new Error("Target text is required.");

  const warrant = await requestWarrant(targetText);
  await loadScript(warrant.sdkPath || DEFAULT_SDK_PATH);

  if (!window.EngineEvaluat) {
    throw new Error("Aliyun assessment SDK is unavailable.");
  }

  const pcmFile = await blobToPcmFile(input.audio, input.fileName || "assessment.wav");

  const EngineEvaluat = window.EngineEvaluat;
  if (!EngineEvaluat) {
    throw new Error("Aliyun assessment SDK is unavailable.");
  }

  return await new Promise<PronunciationAssessment>((resolve, reject) => {
    const engine = new EngineEvaluat({
      applicationId: warrant.applicationId,
      userId: warrant.userId,
      warrantId: warrant.warrantId,
      coreType: warrant.coreType,
      logIsOpen: false,
      engineBackResultDone: (msg: unknown) => {
        cleanup();
        try {
          resolve(mapAliyunEngineResult(msg, targetText, input.ipaTarget ?? ""));
        } catch (error) {
          reject(error);
        }
      },
      engineBackResultFail: (msg: unknown) => {
        cleanup();
        reject(new Error(typeof msg === "string" ? msg : "Aliyun assessment failed."));
      },
      JSSDKNotSupport: () => {
        cleanup();
        reject(new Error("This browser does not support the Aliyun speech assessment SDK."));
      },
      noNetwork: () => {
        cleanup();
        reject(new Error("Network connection is unavailable."));
      },
    });

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Aliyun assessment timed out."));
    }, 60_000);

    function cleanup() {
      window.clearTimeout(timer);
      engine?.cancel?.();
      engine?.cancelRecord?.();
      engine?.destroyEngine?.();
    }

    if (!engine?.wholeFileUpload) {
      cleanup();
      reject(new Error("Aliyun assessment SDK does not support file upload."));
      return;
    }

    engine.wholeFileUpload(
      { target: { files: [pcmFile] } },
      {
        coreType: warrant.coreType,
        refText: targetText,
        warrantId: warrant.warrantId,
        rateScale: 1.0,
        symbol: 1,
      },
    );
  });
}
