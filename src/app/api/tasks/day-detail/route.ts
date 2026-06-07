import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrichTask } from '@/lib/task-utils';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Valid date parameter (YYYY-MM-DD) is required' },
        { status: 400 }
      );
    }

    // Get tasks created on that date
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const tasks = await db.task.findMany({
      where: {
        userId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { aiScore: 'desc' },
    });

    const enrichedTasks = tasks.map((task) => enrichTask(task));
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const productivityScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get or create DayLog
    let dayLog = await db.dayLog.findUnique({
      where: {
        userId_date: { userId, date },
      },
    });

    if (!dayLog) {
      dayLog = await db.dayLog.create({
        data: {
          userId,
          date,
          totalTasks,
          completedTasks,
          productivityScore: parseFloat(productivityScore.toFixed(1)),
        },
      });
    } else {
      // Update the day log with fresh counts
      dayLog = await db.dayLog.update({
        where: { id: dayLog.id },
        data: {
          totalTasks,
          completedTasks,
          productivityScore: parseFloat(productivityScore.toFixed(1)),
        },
      });
    }

    return NextResponse.json({
      date,
      summary: dayLog.summary,
      totalTasks,
      completedTasks,
      productivityScore: parseFloat(productivityScore.toFixed(1)),
      tasks: enrichedTasks,
    });
  } catch (error) {
    console.error('Error fetching day detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch day detail' },
      { status: 500 }
    );
  }
}
