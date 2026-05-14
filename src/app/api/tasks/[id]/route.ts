import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  computeDaysUntilDue,
  computeAiScore,
  enrichTask,
} from '@/lib/task-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(enrichTask(task));
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.dueDatetime !== undefined) {
      updateData.dueDatetime = body.dueDatetime ? new Date(body.dueDatetime) : null;
    }
    if (body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring;
    if (body.recurrenceRule !== undefined) updateData.recurrenceRule = body.recurrenceRule;

    // Re-compute aiScore based on updated values
    const updatedPriority = (updateData.priority as string) || existing.priority;
    const updatedDueDatetime = updateData.dueDatetime !== undefined
      ? updateData.dueDatetime as Date | null
      : existing.dueDatetime;

    const daysUntilDue = computeDaysUntilDue(
      updatedDueDatetime ? updatedDueDatetime.toISOString() : null
    );
    updateData.aiScore = computeAiScore(daysUntilDue, updatedPriority);

    const task = await db.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(enrichTask(task));
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
