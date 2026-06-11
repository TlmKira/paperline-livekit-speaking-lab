// FILE: src/app/api/reference-audio/route.ts
import { NextResponse } from "next/server";
import {
  AliyunSpeechError,
  synthesizeReferenceAudio,
} from "@/lib/aliyun-speech";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.trim();
  const instruct = searchParams.get("instruct")?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Target text is required." },
      { status: 400 },
    );
  }

  try {
    const { audio, contentType } = await synthesizeReferenceAudio(text, instruct);

    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AliyunSpeechError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Reference pronunciation is unavailable. Check the Aliyun TTS configuration.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { text?: string; instruct?: string }
    | null;
  const text = payload?.text?.trim();
  const instruct = payload?.instruct?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Target text is required." },
      { status: 400 },
    );
  }

  try {
    const { audio, contentType } = await synthesizeReferenceAudio(text, instruct);

    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AliyunSpeechError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Reference pronunciation is unavailable. Check the Aliyun TTS configuration.",
      },
      { status: 503 },
    );
  }
}
