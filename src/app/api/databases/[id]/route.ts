import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeDatabase, serializeRow } from '@/lib/notion';

// GET /api/databases/[id] — تعريف القاعدة + صفوفها
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const database = await db.database.findUnique({
      where: { id },
      include: { rows: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!database) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...serializeDatabase(database),
      rows: database.rows.map(serializeRow),
    });
  } catch (error) {
    console.error('Error fetching database:', error);
    return NextResponse.json({ error: 'Failed to fetch database' }, { status: 500 });
  }
}

// PATCH /api/databases/[id] — تحديث properties و/أو views (بياخد arrays، بيتخزّنوا JSON)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await db.database.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.properties !== undefined) {
      data.properties =
        typeof body.properties === 'string' ? body.properties : JSON.stringify(body.properties);
    }
    if (body.views !== undefined) {
      data.views = typeof body.views === 'string' ? body.views : JSON.stringify(body.views);
    }

    const updated = await db.database.update({ where: { id }, data });
    return NextResponse.json(serializeDatabase(updated));
  } catch (error) {
    console.error('Error updating database:', error);
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
