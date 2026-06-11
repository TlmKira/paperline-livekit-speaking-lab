// FILE: src/lib/aliyun-speech.ts
import type {
  PronunciationAssessment,
  PronunciationHighlight,
  PronunciationPhoneme,
  PronunciationStatus,
} from "@/lib/pronunciation";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com";
const OMNI_CHAT_ENDPOINT = `${DASHSCOPE_BASE_URL}/compatible-mode/v1/chat/completions`;
const COSYVOICE_ENDPOINT = `${DASHSCOPE_BASE_URL}/api/v1/services/audio/tts/SpeechSynthesizer`;

export const ALIYUN_ASR_PROMPT = [
  "Transcribe the audio only. Do not answer. Do not continue the conversation.",
  "The speaker may use mixed English and Chinese.",
  "Prefer English words when the sound is likely English.",
  "Do not transcribe weak English pronunciation as Chinese homophones.",
  "Keep real Chinese words as Chinese.",
  "Return only the transcript text.",
].join("\n");

class AliyunSpeechError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AliyunSpeechError";
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown>;

function getDashScopeApiKey() {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    throw new AliyunSpeechError("DASHSCOPE_API_KEY is not configured.", 503);
  }
  return apiKey;
}

function getAsrModel() {
  return process.env.ALIYUN_ASR_MODEL?.trim() || "qwen3.5-omni-flash";
}

function getTtsModel() {
  return process.env.ALIYUN_TTS_MODEL?.trim() || "cosyvoice-v3-flash";
}

function getTtsVoice() {
  return process.env.ALIYUN_TTS_VOICE?.trim() || "loongabby_v3";
}

function getAssessmentModel() {
  return (
    process.env.ALIYUN_ASSESSMENT_MODEL?.trim() ||
    process.env.ALIYUN_ASR_MODEL?.trim() ||
    "qwen3.5-omni-flash"
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function compact<T extends JsonRecord>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

async function dashscopeJson(endpoint: string, body: JsonRecord) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getDashScopeApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `Aliyun request failed with status ${response.status}.`;
    throw new AliyunSpeechError(message, response.status);
  }

  return payload;
}

function extractMessageContent(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return "";
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return "";
  }

  const content = firstChoice.message.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part)) {
          return asString(part.text) || asString(part.transcript);
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function cleanTranscript(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(transcript|text|转写|识别结果)\s*[:：]\s*/i, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}

function parseJsonObject(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function inferAudioFormat(file: File) {
  const mimeType = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mimeType.includes("wav") || name.endsWith(".wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3") || name.endsWith(".mp3")) {
    return "mp3";
  }
  if (mimeType.includes("ogg") || name.endsWith(".ogg")) return "ogg";
  if (mimeType.includes("mp4") || name.endsWith(".m4a") || name.endsWith(".mp4")) {
    return "mp4";
  }
  return "webm";
}

async function fileToDataUrl(file: File) {
  const mimeType = file.type || "audio/webm";
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function getAliyunSpeechStatus() {
  const dashscopeReady = Boolean(process.env.DASHSCOPE_API_KEY?.trim());
  const assessmentConfigured = Boolean(
    process.env.ALIYUN_SPEECH_ASSESS_APPKEY?.trim() &&
      process.env.ALIYUN_SPEECH_ASSESS_APPID?.trim() &&
      process.env.ALIYUN_SPEECH_ASSESS_APPSECRET?.trim(),
  );

  return {
    dashscopeReady,
    assessmentConfigured,
    asrModel: getAsrModel(),
    assessmentModel: getAssessmentModel(),
    ttsModel: getTtsModel(),
    ttsVoice: getTtsVoice(),
  };
}

export async function transcribeWithAliyunOmni(audio: File) {
  const model = getAsrModel();
  const dataUrl = await fileToDataUrl(audio);
  const format = inferAudioFormat(audio);
  const payload = await dashscopeJson(OMNI_CHAT_ENDPOINT, {
    model,
    messages: [
      {
        role: "system",
        content: ALIYUN_ASR_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Return only the transcript for this audio.",
          },
          {
            type: "input_audio",
            input_audio: {
              data: dataUrl,
              format,
            },
          },
        ],
      },
    ],
    stream: false,
    temperature: 0,
    max_tokens: 256,
  });

  const transcript = cleanTranscript(extractMessageContent(payload));

  return {
    transcript,
    text: transcript,
    engine: "aliyun-omni",
    model,
    modelReady: true,
    loadError: null,
  };
}

function getAudioUrl(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.output) || !isRecord(payload.output.audio)) {
    return "";
  }

  return asString(payload.output.audio.url);
}

export async function synthesizeReferenceAudio(text: string, instruct?: string) {
  const model = getTtsModel();
  const voice = getTtsVoice();
  const payload = await dashscopeJson(COSYVOICE_ENDPOINT, {
    model,
    input: compact({
      text,
      voice,
      format: "wav",
      sample_rate: 24000,
      language_hints: ["en"],
      instruction: instruct,
    }),
  });

  const audioUrl = getAudioUrl(payload);
  if (!audioUrl) {
    throw new AliyunSpeechError("Aliyun TTS did not return an audio URL.");
  }

  const audioResponse = await fetch(audioUrl, { cache: "no-store" });
  if (!audioResponse.ok) {
    throw new AliyunSpeechError(
      `Failed to download Aliyun TTS audio (${audioResponse.status}).`,
      audioResponse.status,
    );
  }

  const audio = await audioResponse.arrayBuffer();
  const contentType = audioResponse.headers.get("content-type") || "audio/wav";

  return { audio, contentType, model, voice };
}

function scoreToStatus(score: number): PronunciationStatus {
  if (score >= 80) return "correct";
  if (score >= 55) return "mixed";
  return "needs-work";
}

function clampScore(value: unknown, fallback = 0) {
  const score =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : fallback;
  if (!Number.isFinite(score)) return fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function wordSimilarity(targetText: string, transcript: string) {
  const targetWords = normalizeWords(targetText);
  const heardWords = new Set(normalizeWords(transcript));
  if (!targetWords.length) return 0;
  const matched = targetWords.filter((word) => heardWords.has(word)).length;
  return matched / targetWords.length;
}

function makeFallbackAssessment(
  targetText: string,
  transcript = "",
  summary = "Aliyun cloud assessment returned a partial result.",
): PronunciationAssessment {
  const similarity = wordSimilarity(targetText, transcript);
  const overallScore = transcript ? clampScore(45 + similarity * 50, 45) : 0;
  const words = targetText.split(/\s+/).filter(Boolean);
  const highlights: PronunciationHighlight[] = words.map((word) => ({
    text: word,
    status: scoreToStatus(overallScore),
    feedback:
      overallScore >= 80
        ? "This word was clear in the cloud transcript."
        : overallScore >= 55
          ? "Close. Try a slower, clearer take."
          : "The cloud transcript did not clearly match this target.",
  }));

  return {
    targetText,
    ipaTarget: "",
    transcript,
    overallScore,
    summary,
    nextStep:
      overallScore >= 80
        ? "Move on or repeat once for consistency."
        : "Listen to the target, then record one slower take.",
    engine: "aliyun-cloud-assessment",
    highlights,
    phonemes: [],
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function mapAssessmentJson(
  raw: JsonRecord,
  targetText: string,
  fallbackTranscript: string,
): PronunciationAssessment {
  const transcript = String(raw.transcript ?? raw.text ?? fallbackTranscript).trim();
  const overallScore = clampScore(raw.overallScore ?? raw.score, 0);
  const rawHighlights = Array.isArray(raw.highlights) ? raw.highlights : [];

  const highlights: PronunciationHighlight[] = rawHighlights
    .map((item) => {
      if (!isRecord(item)) return null;
      const text = String(item.text ?? item.word ?? "").trim();
      if (!text) return null;
      const score = clampScore(item.score ?? item.accuracy, overallScore);
      return {
        text,
        status: scoreToStatus(score),
        feedback:
          String(item.feedback ?? "").trim() ||
          (score >= 80
            ? "Clear pronunciation."
            : score >= 55
              ? "Close. Try one slower take."
              : "Needs another pass."),
      } satisfies PronunciationHighlight;
    })
    .filter((item): item is PronunciationHighlight => Boolean(item));

  const phonemes: PronunciationPhoneme[] = normalizeStringArray(raw.phonemes).map(
    (symbol) => ({
      symbol,
      expected: symbol,
      heard: symbol,
      accuracy: overallScore,
      status: scoreToStatus(overallScore),
    }),
  );

  if (!overallScore || !highlights.length) {
    return makeFallbackAssessment(
      targetText,
      transcript,
      String(raw.summary ?? "").trim() ||
        "Aliyun cloud assessment returned a transcript but not full scoring details.",
    );
  }

  return {
    targetText,
    ipaTarget: "",
    transcript,
    overallScore,
    summary:
      String(raw.summary ?? "").trim() ||
      (overallScore >= 80
        ? "Good take. The target was clear."
        : overallScore >= 55
          ? "Close take. Slow down and keep the ending sounds clear."
          : "Try again. Say the target once, a little slower."),
    nextStep:
      String(raw.nextStep ?? "").trim() ||
      (overallScore >= 80
        ? "Move to another target or repeat once for consistency."
        : "Listen to the target, then record one slower take."),
    engine: "aliyun-cloud-assessment",
    highlights,
    phonemes,
  };
}

export async function assessPronunciationWithAliyun(
  audio: File,
  targetText: string,
): Promise<PronunciationAssessment> {
  const model = getAssessmentModel();
  const dataUrl = await fileToDataUrl(audio);
  const format = inferAudioFormat(audio);

  const payload = await dashscopeJson(OMNI_CHAT_ENDPOINT, {
    model,
    messages: [
      {
        role: "system",
        content: [
          "You are a pronunciation assessment engine for English learners.",
          "Assess the user's audio against the provided target text.",
          "Return JSON only. Do not include markdown.",
          "Shape: {\"transcript\": string, \"overallScore\": number, \"summary\": string, \"nextStep\": string, \"highlights\": [{\"text\": string, \"score\": number, \"feedback\": string}], \"phonemes\": string[]}.",
          "Use a 0-100 score. highlights should cover the target words.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Target text: ${targetText}`,
          },
          {
            type: "input_audio",
            input_audio: {
              data: dataUrl,
              format,
            },
          },
        ],
      },
    ],
    stream: false,
    temperature: 0,
    max_tokens: 700,
  });

  const rawContent = extractMessageContent(payload);
  const parsed = parseJsonObject(rawContent);
  if (parsed) {
    return mapAssessmentJson(parsed, targetText, "");
  }

  const transcript = cleanTranscript(rawContent);
  return makeFallbackAssessment(
    targetText,
    transcript,
    "Aliyun cloud assessment returned a transcript but not structured scoring details.",
  );
}

export { AliyunSpeechError, scoreToStatus };
