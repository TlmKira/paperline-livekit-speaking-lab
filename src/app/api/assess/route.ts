// FILE: src/app/api/assess/route.ts
import { NextResponse } from "next/server";
import {
  AliyunSpeechError,
  assessPronunciationWithAliyun,
  getAliyunSpeechStatus,
} from "@/lib/aliyun-speech";

export const runtime = "nodejs";

export async function GET() {
  const status = getAliyunSpeechStatus();
  const ready = status.dashscopeReady;
  const loadError = status.dashscopeReady
    ? null
    : "DASHSCOPE_API_KEY is not configured.";

  return NextResponse.json(
    {
      ready,
      warming: false,
      reachable: status.dashscopeReady,
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
          : "dashscope cloud assessment",
      },
      needsRestartHint: false,
      loadError,
      message: ready
        ? "Aliyun speech providers are configured."
        : "Aliyun speech providers are not ready. Set DASHSCOPE_API_KEY.",
    },
    { status: ready ? 200 : 202 },
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  const text = formData.get("text");

  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "An audio file is required." },
      { status: 400 },
    );
  }

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Target text is required." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await assessPronunciationWithAliyun(audio, text.trim()));
  } catch (error) {
    if (error instanceof AliyunSpeechError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Aliyun pronunciation assessment failed. Check the server logs and assessment configuration.",
      },
      { status: 503 },
    );
  }
}
