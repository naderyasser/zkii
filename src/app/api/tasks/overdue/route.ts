import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, enrichTask } from '@/lib/task-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    const now = new Date();

    const tasks = await db.task.findMany({
      where: {
        userId,
        status: 'pending',
        dueDatetime: { lt: now.toISOString() },
      },
      orderBy: { dueDatetime: 'asc' },
    });

    const enriched = tasks.map((task) => enrichTask(task));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overdue tasks' },
      { status: 500 }
    );
  }
}
