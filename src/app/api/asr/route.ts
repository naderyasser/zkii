import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════════
// ASR — تحويل الصوت لنص (Speech-to-Text)
// ═══════════════════════════════════════════════════════════════════════════════
// مزوّد الذكاء الحالي (Nous Portal / Hermes) مزوّد LLM فقط — مبيوفّرش ASR.
// الميزة معطّلة افتراضياً (وزر المايك مخفي في الواجهة عبر NEXT_PUBLIC_ENABLE_ASR).
// لتفعيلها لاحقاً عبر مزوّد خارجي متوافق مع OpenAI (transcriptions)، اضبط في .env:
//   ASR_API_URL  → endpoint للتفريغ (مثال: https://.../v1/audio/transcriptions)
//   ASR_API_KEY  → مفتاح المزوّد
//   ASR_MODEL    → اسم الموديل (اختياري، مثال: whisper-1)
// ═══════════════════════════════════════════════════════════════════════════════

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

    const asrApiUrl = process.env.ASR_API_URL;
    const asrApiKey = process.env.ASR_API_KEY;

    // ─── الميزة غير مفعّلة → ردّ نظيف (بدون كسر) ──────────────────────────
    if (!asrApiUrl || !asrApiKey) {
      return NextResponse.json({
        text: "",
        disabled: true,
        message: "التحويل الصوتي غير مفعّل حالياً.",
      });
    }

    // ─── مزوّد ASR خارجي متوافق مع OpenAI (multipart/form-data) ───────────
    const buffer = Buffer.from(audio, "base64");
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "audio/webm" }), "audio.webm");
    form.append("model", process.env.ASR_MODEL || "whisper-1");

    const res = await fetch(asrApiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${asrApiKey}` },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`ASR provider HTTP ${res.status}`);
    }

    const result = (await res.json()) as { text?: string };
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
