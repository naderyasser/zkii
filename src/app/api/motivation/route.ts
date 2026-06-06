import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
// مزوّد الذكاء الحالي (Nous Portal / Hermes) مزوّد LLM فقط — مبيوفّرش توليد صور.
// التوليد معطّل بشكل افتراضي ويرجّع ردّ نصّي بديل نظيف عشان التطبيق ما يكسرش.
// لتفعيله لاحقاً عبر مزوّد خارجي متوافق مع OpenAI، اضبط في .env:
//   IMAGE_API_URL  → endpoint لتوليد الصور (مثال: https://.../v1/images/generations)
//   IMAGE_API_KEY  → مفتاح المزوّد
//   IMAGE_MODEL    → اسم الموديل (اختياري)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const imageApiUrl = process.env.IMAGE_API_URL;
    const imageApiKey = process.env.IMAGE_API_KEY;

    // ─── الميزة غير مفعّلة → ردّ نصّي بديل (بدون كسر) ──────────────────────
    if (!imageApiUrl || !imageApiKey) {
      return NextResponse.json({
        success: false,
        disabled: true,
        message: 'توليد الصور غير مفعّل حالياً — لم يتم ضبط مزوّد صور خارجي.',
      });
    }

    const enhancedPrompt = `${prompt}, motivational, inspiring, dark aesthetic with vibrant neon accents, digital art style, high quality, detailed, cinematic lighting`;

    // ─── مزوّد صور خارجي متوافق مع OpenAI ─────────────────────────────────
    const response = await fetch(imageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${imageApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.IMAGE_MODEL || undefined,
        prompt: enhancedPrompt,
        size: '1344x768',
      }),
    });

    if (!response.ok) {
      throw new Error(`Image provider HTTP ${response.status}`);
    }

    const data = (await response.json()) as { data?: Array<{ b64_json?: string; base64?: string }> };
    const imageBase64 = data.data?.[0]?.b64_json ?? data.data?.[0]?.base64 ?? '';

    return NextResponse.json({
      success: true,
      imageBase64,
      prompt: enhancedPrompt,
    });
  } catch (error) {
    console.error('Motivation image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
