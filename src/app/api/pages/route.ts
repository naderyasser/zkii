import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized, ownedPage } from '@/lib/session';
import {
  serializePage,
  buildTree,
  defaultProperties,
  defaultViews,
} from '@/lib/notion';

// GET /api/pages?view=tree|flat&archived=0|1 — صفحات المستخدم الحالي فقط
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'tree';
    const archived = searchParams.get('archived') === '1';

    const pages = await db.page.findMany({
      where: { userId, archivedAt: archived ? { not: null } : null },
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

// POST /api/pages — body: { title?, icon?, parentId?, type?: 'page'|'database', coverUrl? }
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { title, icon, parentId, type, coverUrl } = body as {
      title?: string;
      icon?: string;
      parentId?: string | null;
      type?: string;
      coverUrl?: string;
    };

    // لو فيه أب، لازم يكون ملك نفس المستخدم
    if (parentId) {
      const parent = await ownedPage(parentId, userId);
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const pageType = type === 'database' ? 'database' : 'page';
    const last = await db.page.findFirst({
      where: { userId, parentId: parentId ?? null },
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
        userId,
        ...(pageType === 'database'
          ? {
              database: {
                create: {
                  userId,
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
