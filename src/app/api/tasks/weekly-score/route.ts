import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const now = new Date();

    // Calculate this week range (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() + mondayOffset);
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);

    // Last week range
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);

    // This week tasks
    const thisWeekTasks = await db.task.findMany({
      where: {
        userId,
        createdAt: { gte: thisWeekStart, lte: thisWeekEnd },
      },
      select: { status: true },
    });

    const thisWeekTotal = thisWeekTasks.length;
    const thisWeekDone = thisWeekTasks.filter((t) => t.status === 'done').length;
    const thisWeek = thisWeekTotal > 0 ? (thisWeekDone / thisWeekTotal) * 100 : 0;

    // Last week tasks
    const lastWeekTasks = await db.task.findMany({
      where: {
        userId,
        createdAt: { gte: lastWeekStart, lte: lastWeekEnd },
      },
      select: { status: true },
    });

    const lastWeekTotal = lastWeekTasks.length;
    const lastWeekDone = lastWeekTasks.filter((t) => t.status === 'done').length;
    const lastWeek = lastWeekTotal > 0 ? (lastWeekDone / lastWeekTotal) * 100 : 0;

    const diff = parseFloat((thisWeek - lastWeek).toFixed(1));
    const direction: 'up' | 'down' | 'same' =
      diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';

    return NextResponse.json({
      thisWeek: parseFloat(thisWeek.toFixed(1)),
      lastWeek: parseFloat(lastWeek.toFixed(1)),
      diff,
      direction,
    });
  } catch (error) {
    console.error('Error fetching weekly score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly score' },
      { status: 500 }
    );
  }
}
