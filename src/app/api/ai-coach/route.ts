// FILE: src/app/api/ai-coach/route.ts
import { NextResponse } from "next/server";
import {
  AliyunAiError,
  generateCoachTurnWithAliyun,
  isAliyunAiConfigured,
} from "@/lib/aliyun-ai";
import type { AiCoachRequestPayload } from "@/lib/ai-coach";
import { getCoachEngineUrlForRequest } from "@/lib/runtime/request-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (isAliyunAiConfigured()) {
    return NextResponse.json({
      ready: true,
      message: "AI Coach (Aliyun) is ready.",
    });
  }

  const coachEngineUrl = getCoachEngineUrlForRequest(request);

  try {
    const response = await fetch(`${coachEngineUrl}/coach-status`, {
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ready?: boolean;
          message?: string;
        }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          ready: false,
          message: payload?.message ?? "AI Coach is unavailable right now.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        ready: payload?.ready === true,
        message: payload?.message ?? "AI Coach is ready.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        ready: false,
        message:
          "AI Coach is offline. Set DASHSCOPE_API_KEY for Aliyun cloud AI, or start the coach-engine service.",
      },
      { status: 503 },
    );
  }
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
  const action = body.action === "continue" ? "continue" : "start";
  const payload: AiCoachRequestPayload = {
    action,
    topic: body.topic,
    mode: body.mode === "freedom" ? "freedom" : "target",
    history: Array.isArray(body.history) ? body.history : [],
  };

  if (isAliyunAiConfigured()) {
    try {
      const turn = await generateCoachTurnWithAliyun(payload);
      return NextResponse.json(
        {
          turn,
          provider: "aliyun",
        },
        { status: 200 },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Aliyun coach generation failed.";
      return NextResponse.json(
        { error: message },
        { status: err instanceof AliyunAiError ? err.status : 502 },
      );
    }
  }

  const coachEngineUrl = getCoachEngineUrlForRequest(request);

  try {
    const response = await fetch(`${coachEngineUrl}/coach-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        result && typeof result === "object" && "detail" in result
          ? String(result.detail)
          : "AI Coach generation failed.";

      return NextResponse.json(
        {
          error: detail,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        turn:
          result && typeof result === "object" && "turn" in result
            ? result.turn
            : null,
        provider: "local-coach",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "AI Coach is offline. Set DASHSCOPE_API_KEY for Aliyun cloud AI, or start the coach-engine service.",
      },
      { status: 503 },
    );
  }
}
