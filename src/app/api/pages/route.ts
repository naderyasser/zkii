import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';
import {
  serializePage,
  buildTree,
  defaultProperties,
  defaultViews,
} from '@/lib/notion';

// GET /api/pages?view=tree|flat&archived=0|1
// بترجّع الصفحات (شجرة افتراضياً). archived=1 لعرض سلة المهملات.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;
    const view = searchParams.get('view') || 'tree';
    const archived = searchParams.get('archived') === '1';

    const pages = await db.page.findMany({
      where: {
        userId,
        archivedAt: archived ? { not: null } : null,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { database: true },
    });

    const serialized = pages.map(serializePage);
    if (view === 'flat' || archived) {
      return NextResponse.json(serialized);
    }
    return NextResponse.json(buildTree(serialized));
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// POST /api/pages
// body: { title?, icon?, parentId?, type?: 'page'|'database', userId? }
// لو type='database' بننشئ Database مرتبط بالصفحة بخصائص/عروض افتراضية.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, icon, parentId, type, userId, coverUrl } = body as {
      title?: string;
      icon?: string;
      parentId?: string | null;
      type?: string;
      userId?: string;
      coverUrl?: string;
    };

    const resolvedUser = userId || DEFAULT_USER_ID;
    const pageType = type === 'database' ? 'database' : 'page';

    // ترتيب: في آخر القائمة على نفس المستوى
    const last = await db.page.findFirst({
      where: { userId: resolvedUser, parentId: parentId ?? null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1;

    const page = await db.page.create({
      data: {
        title: title?.trim() || 'بدون عنوان',
        icon: icon ?? null,
        coverUrl: coverUrl ?? null,
        parentId: parentId ?? null,
        type: pageType,
        position,
        userId: resolvedUser,
        ...(pageType === 'database'
          ? {
              database: {
                create: {
                  properties: JSON.stringify(defaultProperties()),
                  views: JSON.stringify(defaultViews()),
                },
              },
            }
          : {}),
      },
      include: { database: true },
    });

    return NextResponse.json(serializePage(page), { status: 201 });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
