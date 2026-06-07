import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized, notFound, ownedRow } from '@/lib/session';
import { serializeRow, safeParse } from '@/lib/notion';

// PATCH /api/rows/[id] — تحديث قيم الخصائص (merge) و/أو position/pageId. ملك المستخدم.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const existing = await ownedRow(id, userId);
    if (!existing) return notFound('Row');
    const body = await request.json().catch(() => ({}));

    const data: Record<string, unknown> = {};

    if (body.properties && typeof body.properties === 'object') {
      if (body.replaceProperties) {
        data.properties = JSON.stringify(body.properties);
      } else {
        // دمج: نحدّث المفاتيح المرسلة فقط
        const current = safeParse<Record<string, unknown>>(existing.properties, {});
        data.properties = JSON.stringify({ ...current, ...body.properties });
      }
    }
    if (typeof body.position === 'number') data.position = body.position;
    if (body.pageId !== undefined) data.pageId = body.pageId;

    const row = await db.row.update({ where: { id }, data });
    return NextResponse.json(serializeRow(row));
  } catch (error) {
    console.error('Error updating row:', error);
    return NextResponse.json({ error: 'Failed to update row' }, { status: 500 });
  }
}

// DELETE /api/rows/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    if (!(await ownedRow(id, userId))) return notFound('Row');
    await db.row.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting row:', error);
    return NextResponse.json({ error: 'Failed to delete row' }, { status: 500 });
  }
}
