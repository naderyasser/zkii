import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializePage } from '@/lib/notion';
import { extractPalette } from '@/lib/palette';

// POST /api/pages/[id]/cover — يعيّن غلاف + يستخرج الباليتة (server-side) ويخزّنها.
// body: { coverUrl, coverMeta?: {title,artist,year,source} }  أو { coverUrl: null } للإزالة
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { coverUrl, coverMeta } = body as { coverUrl: string | null; coverMeta?: unknown };

    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    if (!coverUrl) {
      const cleared = await db.page.update({
        where: { id },
        data: { coverUrl: null, coverMeta: null, palette: null },
      });
      return NextResponse.json(serializePage(cleared));
    }

    // استخراج الباليتة من الصورة (مرة واحدة على السيرفر)
    const palette = await extractPalette(coverUrl);

    const updated = await db.page.update({
      where: { id },
      data: {
        coverUrl,
        coverMeta: coverMeta ? JSON.stringify(coverMeta) : null,
        palette: palette ? JSON.stringify(palette) : null,
      },
    });
    return NextResponse.json(serializePage(updated));
  } catch (error) {
    console.error('[pages/cover] error', error);
    return NextResponse.json({ error: 'Failed to set cover' }, { status: 500 });
  }
}
