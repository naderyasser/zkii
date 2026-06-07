import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrichTask } from '@/lib/task-utils';
import { getUserId, unauthorized, notFound, ownedTask } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { id } = await params;

    const existing = await ownedTask(id, userId);
    if (!existing) return notFound('Task');

    if (existing.status === 'done') {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 400 }
      );
    }

    const task = await db.task.update({
      where: { id },
      data: {
        status: 'done',
        completedAt: new Date(),
      },
    });

    return NextResponse.json(enrichTask(task));
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    );
  }
}
