import "server-only";

import type {
  AiCoachGeneratedTurn,
  AiCoachHistoryEntry,
  AiCoachReplyMode,
  AiCoachRequestPayload,
} from "@/lib/ai-coach";

const DASHSCOPE_CHAT_ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export class AliyunAiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AliyunAiError";
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getDashScopeApiKey() {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    throw new AliyunAiError("DASHSCOPE_API_KEY is not configured.", 503);
  }
  return apiKey;
}

function getCoachModel() {
  return process.env.ALIYUN_COACH_MODEL?.trim() || "qwen-plus";
}

function getJustSpeakModel() {
  return (
    process.env.ALIYUN_JUST_SPEAK_MODEL?.trim() ||
    process.env.ALIYUN_COACH_MODEL?.trim() ||
    "qwen-plus"
  );
}

export function isAliyunAiConfigured(): boolean {
  return Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

async function dashscopeChatJson(body: JsonRecord) {
  const response = await fetch(DASHSCOPE_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getDashScopeApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      isRecord(payload) && isRecord(payload.error)
        ? String(payload.error.message ?? response.statusText)
        : isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : `Aliyun request failed with status ${response.status}.`;
    throw new AliyunAiError(message, response.status);
  }

  return payload;
}

function extractMessageContent(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return "";
  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return "";
  const content = firstChoice.message.content;

  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (isRecord(part)) return String(part.text ?? part.content ?? "");
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function parseJsonObject(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const direct = JSON.parse(trimmed) as unknown;
  if (!isRecord(direct)) {
    throw new Error("Aliyun returned JSON that was not an object.");
  }
  return direct;
}

function latestUserContent(history: AiCoachHistoryEntry[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry?.role !== "user") continue;
    const content = String(entry.content ?? "").replace(/\s+/g, " ").trim();
    if (content) return content;
  }
  return "";
}

function serializeHistory(history: AiCoachHistoryEntry[]) {
  const lines: string[] = [];
  for (const entry of history.slice(-8)) {
    const role = entry.role === "coach" ? "Coach" : "User";
    const content = String(entry.content ?? "").trim();
    if (content) lines.push(`${role}: ${content}`);
  }
  return lines.join("\n");
}

function buildCoachUserPrompt(payload: AiCoachRequestPayload) {
  const topic = payload.topic.trim() || "open discussion";
  if (payload.action === "start") {
    return `Topic: ${topic}\nAsk one specific question about this topic.`;
  }

  const lines = [`Topic: ${topic}`];
  const history = serializeHistory(payload.history);
  const latestUser = latestUserContent(payload.history);

  if (history) lines.push("", history);
  if (latestUser) lines.push("", `They said: ${latestUser}`);
  lines.push("", "Answer them and move the topic forward in one coach line.");
  return lines.join("\n");
}

function coachSystemPrompt(mode: AiCoachReplyMode | undefined) {
  if (mode === "freedom") {
    return [
      "You are a friendly coach in a spoken chat.",
      "Stay on topic. Do not mention pronunciation, accents, model names, or APIs.",
      "Return JSON only: {\"coachMessage\": string, \"learnerReply\": \"\"}.",
    ].join("\n");
  }

  return [
    "You are a friendly coach in a spoken chat.",
    "Stay on topic. Do not mention pronunciation, accents, model names, or APIs.",
    "Return JSON only: {\"coachMessage\": string, \"learnerReply\": string}.",
    "learnerReply must be a short first-person sentence the learner can say next.",
  ].join("\n");
}

function normalizeCoachTurn(
  raw: JsonRecord,
  mode: AiCoachReplyMode | undefined,
): AiCoachGeneratedTurn {
  const coachMessage = String(raw.coachMessage ?? "").replace(/\s+/g, " ").trim();
  let learnerReply = String(raw.learnerReply ?? "").replace(/\s+/g, " ").trim();

  if (!coachMessage) {
    throw new AliyunAiError("Aliyun returned an empty coachMessage.");
  }

  if (mode === "freedom") {
    learnerReply = "";
  } else if (!learnerReply) {
    throw new AliyunAiError("Aliyun returned an empty learnerReply.");
  } else if (!/[.!?]$/.test(learnerReply)) {
    learnerReply = `${learnerReply}.`;
  }

  return { coachMessage, learnerReply };
}

export async function generateCoachTurnWithAliyun(
  payload: AiCoachRequestPayload,
): Promise<AiCoachGeneratedTurn> {
  const mode = payload.mode ?? "target";
  const response = await dashscopeChatJson({
    model: getCoachModel(),
    messages: [
      { role: "system", content: coachSystemPrompt(mode) },
      { role: "user", content: buildCoachUserPrompt(payload) },
    ],
    temperature: Number(process.env.ALIYUN_COACH_TEMPERATURE ?? "0.85"),
    max_tokens: 512,
    response_format: { type: "json_object" },
  });

  return normalizeCoachTurn(parseJsonObject(extractMessageContent(response)), mode);
}

export type AliyunJustSpeakFeedback = {
  overallSummary: string;
  whatWentWell: string[];
  whatToImprove: string[];
  practiceDrill: string;
  coachScript: string;
};

export async function generateJustSpeakFeedbackWithAliyun(input: {
  whisperTranscript: string;
  overallScore: number | null;
  engineTranscript?: string | null;
  phonemeDetail?: unknown;
}): Promise<AliyunJustSpeakFeedback> {
  const heard = input.whisperTranscript.trim();
  const score =
    typeof input.overallScore === "number" ? `${Math.round(input.overallScore)}` : "unknown";

  const response = await dashscopeChatJson({
    model: getJustSpeakModel(),
    messages: [
      {
        role: "system",
        content:
          "You are a supportive pronunciation coach. Return JSON only. Do not mention model names or APIs.",
      },
      {
        role: "user",
        content: [
          "The learner spoke freely. Give short, concrete pronunciation feedback.",
          `Transcript: ${heard || "(empty)"}`,
          `Score: ${score}`,
          input.engineTranscript ? `Engine transcript: ${input.engineTranscript}` : "",
          "Return JSON: {\"overallSummary\": string, \"whatWentWell\": string[], \"whatToImprove\": string[], \"practiceDrill\": string, \"coachScript\": string}.",
          input.phonemeDetail ? `Extra context: ${JSON.stringify(input.phonemeDetail).slice(0, 4000)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    temperature: Number(process.env.ALIYUN_JUST_SPEAK_TEMPERATURE ?? "0.6"),
    max_tokens: 700,
    response_format: { type: "json_object" },
  });

  const raw = parseJsonObject(extractMessageContent(response));
  const feedback = {
    overallSummary: String(raw.overallSummary ?? "").trim(),
    whatWentWell: Array.isArray(raw.whatWentWell)
      ? raw.whatWentWell.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
      : [],
    whatToImprove: Array.isArray(raw.whatToImprove)
      ? raw.whatToImprove.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [],
    practiceDrill: String(raw.practiceDrill ?? "").trim(),
    coachScript: String(raw.coachScript ?? "").trim(),
  };

  if (!feedback.overallSummary || !feedback.practiceDrill || !feedback.coachScript) {
    throw new AliyunAiError("Aliyun returned incomplete Just Speak feedback.");
  }

  return feedback;
}
