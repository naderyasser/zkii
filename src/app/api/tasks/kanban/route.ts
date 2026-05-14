import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, enrichTask } from '@/lib/task-utils';

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { aiScore: 'desc' },
    });

    const enriched = tasks.map((task) => enrichTask(task));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching kanban tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kanban tasks' },
      { status: 500 }
    );
  }
}
