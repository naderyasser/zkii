import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrichTask } from '@/lib/task-utils';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const tasks = await db.task.findMany({
      where: { userId },
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
