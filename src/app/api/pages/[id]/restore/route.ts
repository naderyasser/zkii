import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/pages/[id]/restore — استعادة صفحة من سلة المهملات (+ أحفادها)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await db.page.findUnique({ where: { id } });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // استعادة الصفحة وكل أحفادها
    const toRestore: string[] = [];
    const collect = async (pid: string) => {
      toRestore.push(pid);
      const kids = await db.page.findMany({ where: { parentId: pid }, select: { id: true } });
      for (const k of kids) await collect(k.id);
    };
    await collect(id);
    await db.page.updateMany({ where: { id: { in: toRestore } }, data: { archivedAt: null } });

    // لو أب الصفحة نفسه مؤرشف، افصلها للجذر عشان متبقاش يتيمة مخفية
    if (page.parentId) {
      const parent = await db.page.findUnique({
        where: { id: page.parentId },
        select: { archivedAt: true },
      });
      if (parent?.archivedAt) {
        await db.page.update({ where: { id }, data: { parentId: null } });
      }
    }

    return NextResponse.json({ restored: true, count: toRestore.length });
  } catch (error) {
    console.error('Error restoring page:', error);
    return NextResponse.json({ error: 'Failed to restore page' }, { status: 500 });
  }
}
