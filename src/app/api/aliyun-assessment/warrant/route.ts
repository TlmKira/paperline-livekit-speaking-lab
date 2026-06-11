// FILE: src/app/api/aliyun-assessment/warrant/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAppKey() {
  return process.env.ALIYUN_SPEECH_ASSESS_APPKEY?.trim() ?? "";
}

function getUserId() {
  return process.env.ALIYUN_SPEECH_ASSESS_USER_ID?.trim() || "paperline-local-user";
}

function getWarrantUrl() {
  return process.env.ALIYUN_SPEECH_ASSESS_WARRANT_URL?.trim() ?? "";
}

function getStaticWarrantId() {
  return process.env.ALIYUN_SPEECH_ASSESS_WARRANT_ID?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickWarrantId(payload: unknown): string {
  if (!isRecord(payload)) return "";

  const candidates = [
    payload.warrant_id,
    payload.warrantId,
    isRecord(payload.data) ? payload.data.warrant_id : undefined,
    isRecord(payload.data) ? payload.data.warrantId : undefined,
  ];

  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { targetText?: string }
    | null;
  const targetText = payload?.targetText?.trim();
  const applicationId = getAppKey();
  const userId = getUserId();

  if (!targetText) {
    return NextResponse.json(
      { error: "Target text is required." },
      { status: 400 },
    );
  }

  if (!applicationId) {
    return NextResponse.json(
      {
        error: "ALIYUN_SPEECH_ASSESS_APPKEY is not configured.",
        sdkPath: "/sdk/engine.js",
      },
      { status: 503 },
    );
  }

  const staticWarrantId = getStaticWarrantId();
  if (staticWarrantId) {
    return NextResponse.json({
      applicationId,
      userId,
      warrantId: staticWarrantId,
      coreType: "en.sent.score",
      targetText,
      sdkPath: "/sdk/engine.js",
    });
  }

  const warrantUrl = getWarrantUrl();
  if (!warrantUrl) {
    return NextResponse.json(
      {
        error:
          "ALIYUN_SPEECH_ASSESS_WARRANT_URL is not configured. Provide your Aliyun speech assessment warrant endpoint, or set ALIYUN_SPEECH_ASSESS_WARRANT_ID for local testing.",
        sdkPath: "/sdk/engine.js",
      },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(warrantUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        applicationId,
        targetText,
      }),
      cache: "no-store",
    });

    const upstreamPayload = (await upstream.json().catch(() => null)) as unknown;
    const warrantId = pickWarrantId(upstreamPayload);

    if (!upstream.ok || !warrantId) {
      return NextResponse.json(
        {
          error:
            isRecord(upstreamPayload) && typeof upstreamPayload.error === "string"
              ? upstreamPayload.error
              : "Aliyun assessment warrant request failed.",
        },
        { status: upstream.ok ? 502 : upstream.status },
      );
    }

    return NextResponse.json({
      applicationId,
      userId,
      warrantId,
      coreType: "en.sent.score",
      targetText,
      sdkPath: "/sdk/engine.js",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Aliyun assessment warrant endpoint is unreachable.",
      },
      { status: 503 },
    );
  }
}
