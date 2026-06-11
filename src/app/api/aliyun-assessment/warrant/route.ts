// FILE: src/app/api/aliyun-assessment/warrant/route.ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AUTHORIZE_ENDPOINT = "https://api.cloud.ssapi.cn/auth/authorize";

function getAppId() {
  return process.env.ALIYUN_SPEECH_ASSESS_APPID?.trim() ?? "";
}

function getAppKey() {
  return process.env.ALIYUN_SPEECH_ASSESS_APPKEY?.trim() ?? "";
}

function getAppSecret() {
  return process.env.ALIYUN_SPEECH_ASSESS_APPSECRET?.trim() ?? "";
}

function getUserId() {
  return process.env.ALIYUN_SPEECH_ASSESS_USER_ID?.trim() || "paperline-local-user";
}

function getStaticWarrantId() {
  return process.env.ALIYUN_SPEECH_ASSESS_WARRANT_ID?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickWarrantId(payload: unknown): string {
  if (!isRecord(payload)) return "";

  const data = isRecord(payload.data) ? payload.data : {};
  const candidates = [
    payload.warrant_id,
    payload.warrantId,
    data.warrant_id,
    data.warrantId,
  ];

  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? "";
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "127.0.0.1"
  );
}

function signAuthorizeRequest(input: {
  appId: string;
  appSecret: string;
  userId: string;
  clientIp: string;
  timestamp: string;
}) {
  const signString = [
    ["app_secret", input.appSecret],
    ["appid", input.appId],
    ["timestamp", input.timestamp],
    ["user_client_ip", input.clientIp],
    ["user_id", input.userId],
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("md5")
    .update(signString)
    .digest("hex");
}

function getErrorMessage(payload: unknown) {
  if (!isRecord(payload)) return "";
  return String(payload.error ?? payload.message ?? payload.err_msg ?? payload.errMessage ?? "");
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { targetText?: string }
    | null;
  const targetText = payload?.targetText?.trim();
  const appId = getAppId();
  const applicationId = getAppKey();
  const appSecret = getAppSecret();
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

  if (!appId || !appSecret) {
    return NextResponse.json(
      {
        error:
          "ALIYUN_SPEECH_ASSESS_APPID and ALIYUN_SPEECH_ASSESS_APPSECRET are required for Aliyun speech assessment authorization.",
        sdkPath: "/sdk/engine.js",
      },
      { status: 503 },
    );
  }

  const clientIp = getClientIp(request);
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signature = signAuthorizeRequest({
    appId,
    appSecret,
    userId,
    clientIp,
    timestamp,
  });

  try {
    const upstream = await fetch(AUTHORIZE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        appid: appId,
        user_id: userId,
        user_client_ip: clientIp,
        timestamp,
        request_sign: signature,
        warrant_available: "7200",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const upstreamPayload = (await upstream.json().catch(() => null)) as unknown;
    const warrantId = pickWarrantId(upstreamPayload);

    if (!upstream.ok || !warrantId) {
      return NextResponse.json(
        {
          error:
            getErrorMessage(upstreamPayload) ||
            "Aliyun speech assessment authorization failed.",
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
        error: "Aliyun speech assessment authorization service is unreachable.",
      },
      { status: 503 },
    );
  }
}
