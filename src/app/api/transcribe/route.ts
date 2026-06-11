// FILE: src/app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import {
  AliyunSpeechError,
  transcribeWithAliyunOmni,
} from "@/lib/aliyun-speech";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "An audio file is required." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await transcribeWithAliyunOmni(audio));
  } catch (error) {
    if (error instanceof AliyunSpeechError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Aliyun transcription failed. Check the server logs and DashScope configuration.",
      },
      { status: 503 },
    );
  }
}
