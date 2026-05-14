import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const enhancedPrompt = `${prompt}, motivational, inspiring, dark aesthetic with vibrant neon accents, digital art style, high quality, detailed, cinematic lighting`;

    const response = await zai.images.generations.create({
      prompt: enhancedPrompt,
      size: '1344x768',
    });

    const imageBase64 = response.data[0].base64;

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
