// FILE: src/app/api/ai-coach/route.ts
import { NextResponse } from "next/server";
import type { AiCoachRequestPayload } from "@/lib/ai-coach";
import { AliyunAiError } from "@/lib/aliyun-ai";
import {
  generateCoachTurnWithAliyunTeacher,
  isAliyunAiTeacherConfigured,
} from "@/lib/aliyun-ai-teacher";

export const runtime = "nodejs";

export async function GET() {
  if (!isAliyunAiTeacherConfigured()) {
    return NextResponse.json(
      {
        ready: false,
        message:
          "AI Teacher is unavailable. Configure ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ready: true,
    message: "AI Teacher (Aliyun) is ready.",
  });
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);

  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: "Invalid AI Coach request payload." },
      { status: 400 },
    );
  }

  const body = raw as Partial<AiCoachRequestPayload>;
  if (!body.topic || typeof body.topic !== "string") {
    return NextResponse.json(
      { error: "A topic is required." },
      { status: 400 },
    );
  }

  if (!isAliyunAiTeacherConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI Teacher is unavailable. Configure ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET.",
      },
      { status: 503 },
    );
  }

  const payload: AiCoachRequestPayload = {
    action: body.action === "continue" ? "continue" : "start",
    topic: body.topic,
    mode: body.mode === "freedom" ? "freedom" : "target",
    history: Array.isArray(body.history) ? body.history : [],
  };

  try {
    const turn = await generateCoachTurnWithAliyunTeacher(payload);
    return NextResponse.json(
      {
        turn,
        provider: "aliyun-ai-teacher",
      },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Aliyun AI Teacher generation failed.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof AliyunAiError ? err.status : 502 },
    );
  }
}
