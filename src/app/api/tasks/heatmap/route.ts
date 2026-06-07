import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/session';

interface HeatmapDay {
  date: string;
  total: number;
  done: number;
  level: number;
}

function computeLevel(total: number, done: number): number {
  if (total === 0) return 0;
  if (done === 0) return 1;
  if (done <= 1) return 2;
  if (done <= 3) return 3;
  if (done <= 5) return 4;
  return 5;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);

    // Get all day logs for the year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const dayLogs = await db.dayLog.findMany({
      where: {
        userId,
        date: { gte: yearStart, lte: yearEnd },
      },
    });

    // Also get task counts per day from tasks created in that year
    const tasks = await db.task.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Aggregate tasks by date
    const taskCountsByDate = new Map<string, { total: number; done: number }>();
    for (const task of tasks) {
      const date = new Date(task.createdAt).toISOString().split('T')[0];
      const existing = taskCountsByDate.get(date) || { total: 0, done: 0 };
      existing.total += 1;
      if (task.status === 'done') existing.done += 1;
      taskCountsByDate.set(date, existing);
    }

    // Build heatmap data from day logs
    const heatmapMap = new Map<string, HeatmapDay>();

    for (const log of dayLogs) {
      const taskCount = taskCountsByDate.get(log.date) || { total: 0, done: 0 };
      const total = Math.max(log.totalTasks, taskCount.total);
      const done = Math.max(log.completedTasks, taskCount.done);

      const level = computeLevel(total, done);
      heatmapMap.set(log.date, { date: log.date, total, done, level });
    }

    // Add dates that have tasks but no day logs
    for (const [date, counts] of taskCountsByDate) {
      if (!heatmapMap.has(date)) {
        const level = computeLevel(counts.total, counts.done);

        heatmapMap.set(date, {
          date,
          total: counts.total,
          done: counts.done,
          level,
        });
      }
    }

    const result = Array.from(heatmapMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap' },
      { status: 500 }
    );
  }
}
