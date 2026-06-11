// FILE: src/app/api/assess/route.ts
import { NextResponse } from "next/server";
import {
  getAliyunSpeechStatus,
} from "@/lib/aliyun-speech";

export const runtime = "nodejs";

export async function GET() {
  const status = getAliyunSpeechStatus();
  const ready = status.assessmentConfigured;
  const loadError = status.assessmentConfigured
    ? null
    : "Aliyun speech assessment AppID/AppKey/AppSecret is not configured.";

  return NextResponse.json(
    {
      ready,
      warming: false,
      reachable: status.assessmentConfigured,
      transcriberReady: status.dashscopeReady,
      transcriberLoadError: status.dashscopeReady
        ? null
        : "DASHSCOPE_API_KEY is not configured.",
      hfTokenConfigured: false,
      diagnostics: {
        provider: "aliyun",
        asrModel: status.asrModel,
        assessmentModel: status.assessmentModel,
        ttsModel: status.ttsModel,
        ttsVoice: status.ttsVoice,
        assessment: status.assessmentConfigured
          ? "en.sent.score web sdk configured"
          : "en.sent.score web sdk not configured",
      },
      needsRestartHint: false,
      loadError,
      message: ready
        ? "Aliyun speech assessment Web SDK is configured."
        : "Aliyun speech assessment is not ready. Set AppID/AppKey/AppSecret.",
    },
    { status: ready ? 200 : 202 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Pronunciation assessment now runs in the browser through the Aliyun Web SDK. Use /api/aliyun-assessment/warrant for authorization.",
    },
    { status: 410 },
  );
}
