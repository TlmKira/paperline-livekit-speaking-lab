import "server-only";

import Client, {
  AITeacherExpansionPracticeTaskGenerateRequest,
  ExecuteAITeacherExpansionDialogueRequest,
} from "@alicloud/aicontent20240611";
import { Config as OpenApiConfig } from "@alicloud/openapi-client";
import type {
  AiCoachGeneratedTurn,
  AiCoachHistoryEntry,
  AiCoachReplyMode,
  AiCoachRequestPayload,
} from "@/lib/ai-coach";
import { AliyunAiError } from "@/lib/aliyun-ai";

type TaskData = {
  backgroundDescription?: string;
  roleSet?: {
    assistant?: string;
    user?: string;
  };
  startSentence?: string;
  taskContent?: Array<{
    assistant?: string;
    user?: string;
  }>;
};

type DialogueTask = {
  assistant: string;
  user: string;
  order: number;
};

type DialogueRecord = {
  content: string;
  order: number;
  role: "assistant" | "user";
};

let cachedClient: Client | null = null;

function getAccessKeyId() {
  return process.env.ALIYUN_ACCESS_KEY_ID?.trim() ?? "";
}

function getAccessKeySecret() {
  return process.env.ALIYUN_ACCESS_KEY_SECRET?.trim() ?? "";
}

function getUserId() {
  return process.env.ALIYUN_AI_TEACHER_USER_ID?.trim() || "paperline-local-user";
}

function getGrade() {
  return process.env.ALIYUN_AI_TEACHER_GRADE?.trim() || "13";
}

function getClient() {
  if (cachedClient) return cachedClient;

  const accessKeyId = getAccessKeyId();
  const accessKeySecret = getAccessKeySecret();
  if (!accessKeyId || !accessKeySecret) {
    throw new AliyunAiError("ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET are required for Aliyun AI Teacher.", 503);
  }

  const config = new OpenApiConfig({
    accessKeyId,
    accessKeySecret,
    endpoint: "aicontent.aliyuncs.com",
  });
  cachedClient = new Client(config as ConstructorParameters<typeof Client>[0]);
  return cachedClient;
}

export function isAliyunAiTeacherConfigured() {
  return Boolean(getAccessKeyId() && getAccessKeySecret());
}

function normalizeSentence(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function ensureSentence(value: string) {
  const trimmed = normalizeSentence(value);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function fallbackLearnerReply(topic: string) {
  return ensureSentence(`I would like to talk more about ${topic}`);
}

function buildTextContent(topic: string, history: AiCoachHistoryEntry[]) {
  const recent = history
    .slice(-8)
    .map((entry) => `${entry.role === "coach" ? "Teacher" : "Learner"}: ${entry.content}`)
    .join("\n");
  return [
    `The learner is practicing spoken English about: ${topic}.`,
    "Create short, natural teacher-student dialogue tasks for oral English practice.",
    recent ? `Recent conversation:\n${recent}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toDialogueTasks(taskData: TaskData, topic: string): DialogueTask[] {
  const tasks = Array.isArray(taskData.taskContent) ? taskData.taskContent : [];
  const normalized = tasks
    .map((task, index) => ({
      assistant: ensureSentence(task.assistant || `Could you say one more thing about ${topic}?`),
      user: ensureSentence(task.user || fallbackLearnerReply(topic)),
      order: index + 1,
    }))
    .filter((task) => task.assistant && task.user);

  if (normalized.length > 0) return normalized;

  return [
    {
      assistant: ensureSentence(taskData.startSentence || `Let's talk about ${topic}. What do you think?`),
      user: fallbackLearnerReply(topic),
      order: 1,
    },
  ];
}

function toRecords(history: AiCoachHistoryEntry[]): DialogueRecord[] {
  return history
    .slice(-12)
    .map((entry, index) => ({
      content: normalizeSentence(entry.content),
      order: index + 1,
      role: (entry.role === "coach" ? "assistant" : "user") as "assistant" | "user",
    }))
    .filter((entry) => entry.content);
}

async function generateTask(payload: AiCoachRequestPayload): Promise<TaskData> {
  const topic = payload.topic.trim();
  const response = await getClient().aITeacherExpansionPracticeTaskGenerate(
    new AITeacherExpansionPracticeTaskGenerateRequest({
      userId: getUserId(),
      grade: getGrade(),
      topic,
      textContent: buildTextContent(topic, payload.history),
      learningObject: `Practice a short spoken English conversation about ${topic}.`,
      keyWords: topic.split(/\s+/).filter(Boolean).slice(0, 8),
    }),
  );

  const body = response.body;
  if (!body?.success || !body.data) {
    throw new AliyunAiError(body?.errMessage || "Aliyun AI Teacher task generation failed.", 502);
  }

  return body.data as TaskData;
}

function pickLearnerReply(tasks: DialogueTask[], questionIndex: unknown, mode: AiCoachReplyMode) {
  if (mode === "freedom") return "";

  const index =
    typeof questionIndex === "number" && Number.isFinite(questionIndex)
      ? Math.max(0, Math.min(tasks.length - 1, questionIndex - 1))
      : 0;
  return tasks[index]?.user || tasks[0]?.user || "";
}

export async function generateCoachTurnWithAliyunTeacher(
  payload: AiCoachRequestPayload,
): Promise<AiCoachGeneratedTurn> {
  const mode = payload.mode ?? "target";
  const topic = payload.topic.trim();
  const taskData = await generateTask(payload);
  const tasks = toDialogueTasks(taskData, topic);

  if (payload.action === "start" || payload.history.length === 0) {
    const coachMessage = ensureSentence(taskData.startSentence || tasks[0].assistant);
    const learnerReply = pickLearnerReply(tasks, 1, mode);
    if (!coachMessage || (mode !== "freedom" && !learnerReply)) {
      throw new AliyunAiError("Aliyun AI Teacher returned an incomplete first turn.");
    }
    return { coachMessage, learnerReply };
  }

  const response = await getClient().executeAITeacherExpansionDialogue(
    new ExecuteAITeacherExpansionDialogueRequest({
      userId: getUserId(),
      topic,
      background: taskData.backgroundDescription || buildTextContent(topic, payload.history),
      startSentence: taskData.startSentence,
      languageCode: "en-us",
      roleInfo: {
        assistant: taskData.roleSet?.assistant || "Teacher",
        user: taskData.roleSet?.user || "Learner",
      },
      dialogueTasks: tasks,
      records: toRecords(payload.history),
    }),
  );

  const body = response.body;
  if (!body?.success || !body.data) {
    throw new AliyunAiError(body?.errMessage || "Aliyun AI Teacher dialogue generation failed.", 502);
  }

  const coachMessage = ensureSentence(body.data.englishResult || tasks[0].assistant);
  const learnerReply = pickLearnerReply(tasks, body.data.questionIndex, mode);

  if (!coachMessage || (mode !== "freedom" && !learnerReply)) {
    throw new AliyunAiError("Aliyun AI Teacher returned an incomplete coach turn.");
  }

  return { coachMessage, learnerReply };
}
