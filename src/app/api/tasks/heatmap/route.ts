import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

interface HeatmapDay {
  date: string;
  total: number;
  done: number;
  level: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

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

      let level: number;
      if (total === 0) {
        level = 0;
      } else if (done === 0) {
        level = 1;
      } else if (done <= 2) {
        level = 2;
      } else if (done <= 4) {
        level = 3;
      } else {
        level = 4;
      }

      heatmapMap.set(log.date, { date: log.date, total, done, level });
    }

    // Add dates that have tasks but no day logs
    for (const [date, counts] of taskCountsByDate) {
      if (!heatmapMap.has(date)) {
        let level: number;
        if (counts.total === 0) {
          level = 0;
        } else if (counts.done === 0) {
          level = 1;
        } else if (counts.done <= 2) {
          level = 2;
        } else if (counts.done <= 4) {
          level = 3;
        } else {
          level = 4;
        }

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
