import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { audio } = body;

    if (!audio || typeof audio !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'audio' field. Expected a base64-encoded string." },
        { status: 400 }
      );
    }

    const zai = new ZAI();
    const result = await zai.audio.asr.create({ file_base64: audio });

    const text = result?.text ?? "";

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during transcription.";

    console.error("[ASR Route Error]", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
