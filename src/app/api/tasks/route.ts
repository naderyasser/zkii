import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  computeDaysUntilDue,
  computePressureLevel,
  computeAiScore,
  enrichTask,
} from '@/lib/task-utils';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const sortBy = searchParams.get('sort_by') || 'priority';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Calculate start of this week (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Calculate end of this week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const where: Record<string, unknown> = { userId };

    switch (filter) {
      case 'today':
        where.status = 'pending';
        where.OR = [
          { dueDatetime: { lte: now.toISOString() } },
          {
            dueDatetime: {
              gte: todayStr + 'T00:00:00.000Z',
              lte: todayStr + 'T23:59:59.999Z',
            },
          },
          { dueDatetime: null },
        ];
        break;
      case 'overdue':
        where.status = 'pending';
        where.dueDatetime = { lt: now.toISOString() };
        break;
      case 'this_week':
        where.status = 'pending';
        where.OR = [
          { dueDatetime: null },
          {
            dueDatetime: {
              gte: weekStartStr + 'T00:00:00.000Z',
              lte: weekEndStr + 'T23:59:59.999Z',
            },
          },
        ];
        break;
      case 'done':
        where.status = 'done';
        break;
      case 'all':
      default:
        break;
    }

    const orderBy: Record<string, string> = {};
    switch (sortBy) {
      case 'due_date':
        orderBy.dueDatetime = 'asc';
        break;
      case 'created_at':
        orderBy.createdAt = 'desc';
        break;
      case 'priority':
      default:
        orderBy.aiScore = 'desc';
        break;
    }

    const tasks = await db.task.findMany({
      where,
      orderBy,
    });

    const enriched = tasks.map((task) => enrichTask(task));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getUserId();
    if (!sessionUserId) return unauthorized();
    const body = await request.json();
    const { title, notes, category, priority, dueDatetime, isRecurring, recurrenceRule, boardColumn, projectId } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const taskPriority = priority || 'medium';
    const taskCategory = category || 'work';
    const taskUserId = sessionUserId;

    const daysUntilDue = computeDaysUntilDue(dueDatetime || null);
    const aiScore = computeAiScore(daysUntilDue, taskPriority);

    const task = await db.task.create({
      data: {
        userId: taskUserId,
        title: title.trim(),
        notes: notes || '',
        category: taskCategory,
        priority: taskPriority,
        dueDatetime: dueDatetime ? new Date(dueDatetime) : null,
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule || '',
        boardColumn: boardColumn || 'todo',
        projectId: projectId || null,
        aiScore,
      },
    });

    return NextResponse.json(enrichTask(task), { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
