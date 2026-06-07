import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized, notFound, ownedDatabase } from '@/lib/session';
import { serializeRow } from '@/lib/notion';

// GET /api/databases/[id]/rows — كل صفوف القاعدة (ملك المستخدم)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    if (!(await ownedDatabase(id, userId))) return notFound('Database');
    const rows = await db.row.findMany({
      where: { databaseId: id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(rows.map(serializeRow));
  } catch (error) {
    console.error('Error fetching rows:', error);
    return NextResponse.json({ error: 'Failed to fetch rows' }, { status: 500 });
  }
}

// POST /api/databases/[id]/rows — إضافة صف جديد (يثبت userId). body: { properties?: {} }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    if (!(await ownedDatabase(id, userId))) return notFound('Database');
    const body = await request.json().catch(() => ({}));

    const last = await db.row.findFirst({
      where: { databaseId: id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1;

    const properties =
      body.properties && typeof body.properties === 'object'
        ? JSON.stringify(body.properties)
        : '{}';

    const row = await db.row.create({
      data: { databaseId: id, userId, properties, position },
    });
    return NextResponse.json(serializeRow(row), { status: 201 });
  } catch (error) {
    console.error('Error creating row:', error);
    return NextResponse.json({ error: 'Failed to create row' }, { status: 500 });
  }
}
