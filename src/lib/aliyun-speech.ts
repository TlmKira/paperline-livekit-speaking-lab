// FILE: src/lib/aliyun-speech.ts
import type {
  PronunciationAssessment,
  PronunciationHighlight,
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
      process.env.ALIYUN_SPEECH_ASSESS_ACCESS_KEY_ID?.trim() &&
      process.env.ALIYUN_SPEECH_ASSESS_ACCESS_KEY_SECRET?.trim(),
  );

  return {
    dashscopeReady,
    assessmentConfigured,
    asrModel: getAsrModel(),
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

function makeFallbackAssessment(targetText: string): PronunciationAssessment {
  const words = targetText.split(/\s+/).filter(Boolean);
  const highlights: PronunciationHighlight[] = words.map((word) => ({
    text: word,
    status: "mixed",
    feedback: "Pronunciation details are waiting for Aliyun speech assessment.",
  }));

  return {
    targetText,
    ipaTarget: "",
    transcript: "",
    overallScore: 0,
    summary: "Aliyun speech assessment is not connected yet.",
    nextStep: "Configure the speech assessment SDK/API before using scoring.",
    engine: "aliyun-en.sent.score",
    highlights,
    phonemes: [],
  };
}

export async function assessPronunciationWithAliyun(
  _audio: File,
  targetText: string,
): Promise<PronunciationAssessment> {
  const status = getAliyunSpeechStatus();

  if (!status.assessmentConfigured) {
    throw new AliyunSpeechError(
      "Aliyun speech assessment is not configured. Set ALIYUN_SPEECH_ASSESS_APPKEY and ALIYUN_SPEECH_ASSESS_ACCESS_KEY_SECRET.",
      503,
    );
  }

  // Aliyun's English sentence assessment docs describe the en.sent.score request
  // payload and result fields, while the production scoring transport is SDK/
  // warrant based. Keep the route explicit until that SDK bridge is added.
  const assessment = makeFallbackAssessment(targetText);
  assessment.summary =
    "Aliyun speech assessment credentials are configured, but the server-side en.sent.score transport is not wired yet.";
  assessment.nextStep =
    "Add the Aliyun speech assessment SDK bridge, then map result.overall, word details, and phone details here.";

  throw new AliyunSpeechError(assessment.summary, 501);
}

export { AliyunSpeechError, scoreToStatus };
