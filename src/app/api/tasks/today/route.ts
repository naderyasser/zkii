import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrichTask } from '@/lib/task-utils';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Tasks due today + overdue pending tasks
    const tasks = await db.task.findMany({
      where: {
        userId,
        status: 'pending',
        OR: [
          // Overdue tasks
          { dueDatetime: { lt: now.toISOString() } },
          // Due today
          {
            dueDatetime: {
              gte: todayStr + 'T00:00:00.000Z',
              lte: todayStr + 'T23:59:59.999Z',
            },
          },
        ],
      },
      orderBy: { aiScore: 'desc' },
    });

    const enriched = tasks.map((task) => enrichTask(task));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching today tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today tasks' },
      { status: 500 }
    );
  }
}
