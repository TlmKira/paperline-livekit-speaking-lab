import { NextResponse } from "next/server";
import {
  generateJustSpeakFeedbackWithAliyun,
  isAliyunAiConfigured,
} from "@/lib/aliyun-ai";
import {
  AliyunSpeechError,
  transcribeWithAliyunOmni,
} from "@/lib/aliyun-speech";

export const runtime = "nodejs";

type TranscribePayload = {
  text?: string;
  transcript?: string;
  [key: string]: unknown;
};

function pickTranscript(payload: TranscribePayload | null): string {
  const v = String(payload?.text ?? payload?.transcript ?? "").trim();
  return v;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "An audio file is required." }, { status: 400 });
  }

  try {
    const transcribeJson = (await transcribeWithAliyunOmni(audio)) as TranscribePayload;
    const whisperTranscript = pickTranscript(transcribeJson);

    const feedback = isAliyunAiConfigured()
      ? await generateJustSpeakFeedbackWithAliyun({
          whisperTranscript,
          overallScore: null,
          engineTranscript: null,
          phonemeDetail: { whisperTranscript },
        })
      : null;

    return NextResponse.json({
      whisperTranscript,
      feedback,
    });
  } catch (error) {
    if (error instanceof AliyunSpeechError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Just Speak is offline. Check the Aliyun DashScope configuration, then try again.",
      },
      { status: 503 },
    );
  }
}

