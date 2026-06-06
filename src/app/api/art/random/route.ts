import { NextRequest, NextResponse } from 'next/server';
import { randomArt } from '@/lib/art';

// GET /api/art/random?exclude=<objectId> — لوحة عشوائية public-domain من Met
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exclude = Number(searchParams.get('exclude')) || undefined;
  const art = await randomArt(exclude);
  if (!art) {
    return NextResponse.json({ error: 'no artwork available' }, { status: 502 });
  }
  return NextResponse.json(art);
}
