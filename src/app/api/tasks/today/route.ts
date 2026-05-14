import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, enrichTask } from '@/lib/task-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

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
