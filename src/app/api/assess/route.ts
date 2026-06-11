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
  const ready = false;
  const loadError = status.assessmentConfigured
    ? "Aliyun speech assessment credentials are configured, but the server-side en.sent.score transport is not wired yet."
    : "Aliyun speech assessment is not configured. Set ALIYUN_SPEECH_ASSESS_APPKEY, ALIYUN_SPEECH_ASSESS_ACCESS_KEY_ID, and ALIYUN_SPEECH_ASSESS_ACCESS_KEY_SECRET.";

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
        ttsModel: status.ttsModel,
        ttsVoice: status.ttsVoice,
        assessment: "en.sent.score",
      },
      needsRestartHint: false,
      loadError,
      message: ready
        ? "Aliyun speech providers are configured."
        : "Aliyun speech assessment is not ready. ASR and TTS use Aliyun directly; pronunciation scoring still needs the en.sent.score SDK transport.",
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
