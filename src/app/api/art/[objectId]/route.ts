import { NextRequest, NextResponse } from 'next/server';
import { fetchArt } from '@/lib/art';

// GET /api/art/[objectId] — تفاصيل لوحة محددة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  const { objectId } = await params;
  const id = Number(objectId);
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const art = await fetchArt(id);
  if (!art) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(art);
}
