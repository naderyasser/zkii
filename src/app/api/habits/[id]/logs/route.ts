import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized, notFound, ownedHabit } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { id } = await params;

    const habit = await ownedHabit(id, userId);
    if (!habit) return notFound('Habit');

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const logs = await db.habitLog.findMany({
      where: {
        habitId: id,
        date: { gte: startDateStr },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(
      logs.map((l) => ({
        id: l.id,
        habitId: l.habitId,
        date: l.date,
        count: l.count,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching habit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit logs' },
      { status: 500 }
    );
  }
}
