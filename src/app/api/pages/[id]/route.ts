import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializePage, serializeDatabase } from '@/lib/notion';

// GET /api/pages/[id] — صفحة واحدة (+ تعريف الـ database لو موجود)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await db.page.findUnique({ where: { id }, include: { database: true } });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...serializePage(page),
      database: page.database ? serializeDatabase(page.database) : null,
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
  }
}

// PATCH /api/pages/[id] — تحديث (title/icon/coverUrl/content/isFavorite/title...)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.content !== undefined) data.content = body.content; // BlockNote JSON string
    if (typeof body.isFavorite === 'boolean') data.isFavorite = body.isFavorite;

    const page = await db.page.update({ where: { id }, data, include: { database: true } });
    return NextResponse.json(serializePage(page));
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

// DELETE /api/pages/[id] — أرشفة (soft delete) افتراضياً، ?hard=1 لحذف نهائي
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === '1';

    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (hard) {
      // حذف نهائي — الأبناء والـ database/rows بتتحذف بالـ cascade المعرّف
      await db.page.delete({ where: { id } });
      return NextResponse.json({ deleted: true, hard: true });
    }

    // أرشفة الصفحة + كل أحفادها (recursive soft-delete)
    const now = new Date();
    const toArchive: string[] = [];
    const collect = async (pid: string) => {
      toArchive.push(pid);
      const kids = await db.page.findMany({ where: { parentId: pid }, select: { id: true } });
      for (const k of kids) await collect(k.id);
    };
    await collect(id);
    await db.page.updateMany({ where: { id: { in: toArchive } }, data: { archivedAt: now } });

    return NextResponse.json({ archived: true, count: toArchive.length });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}
