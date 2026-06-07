import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized, notFound, ownedPage } from '@/lib/session';
import { serializePage } from '@/lib/notion';

// POST /api/pages/[id]/move — body: { parentId?, position? }. ملك المستخدم فقط.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const page = await ownedPage(id, userId);
    if (!page) return notFound('Page');
    const body = await request.json().catch(() => ({}));
    const { parentId, position } = body as { parentId?: string | null; position?: number };

    // الأب الجديد لازم يكون ملك نفس المستخدم
    if (parentId) {
      const parent = await ownedPage(parentId, userId);
      if (!parent) return notFound('Parent');
    }

    const data: Record<string, unknown> = {};

    if (parentId !== undefined) {
      if (parentId === id) {
        return NextResponse.json({ error: 'Cannot move page into itself' }, { status: 400 });
      }
      if (parentId !== null) {
        // امنع النقل لداخل أحد الأحفاد (دورة لا نهائية)
        let cursor: string | null = parentId;
        const guard = new Set<string>();
        while (cursor) {
          if (cursor === id) {
            return NextResponse.json(
              { error: 'Cannot move page into its own descendant' },
              { status: 400 }
            );
          }
          if (guard.has(cursor)) break;
          guard.add(cursor);
          const parent: { parentId: string | null } | null = await db.page.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
          cursor = parent?.parentId ?? null;
        }
      }
      data.parentId = parentId;
    }

    if (typeof position === 'number') {
      data.position = position;
    } else if (parentId !== undefined) {
      // لو اتنقل لأب جديد بدون position محدّد، حطه في الآخر
      const last = await db.page.findFirst({
        where: { userId: page.userId, parentId: parentId ?? null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      data.position = (last?.position ?? 0) + 1;
    }

    const updated = await db.page.update({ where: { id }, data });
    return NextResponse.json(serializePage(updated));
  } catch (error) {
    console.error('Error moving page:', error);
    return NextResponse.json({ error: 'Failed to move page' }, { status: 500 });
  }
}
