import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.habit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const today = todayStr();
    const existingLog = await db.habitLog.findUnique({
      where: { habitId_date: { habitId: id, date: today } },
    });

    if (existingLog) {
      // Untoggle: remove the log
      await db.habitLog.delete({ where: { id: existingLog.id } });
    } else {
      // Toggle on: create the log
      await db.habitLog.create({
        data: { habitId: id, date: today, count: 1 },
      });
    }

    // Return updated habit with enrichment
    const habit = await db.habit.findUnique({ where: { id } });
    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const todayLog = await db.habitLog.findUnique({
      where: { habitId_date: { habitId: id, date: today } },
    });

    // Recompute streak
    let streak = 0;
    const checkDate = new Date();
    if (!todayLog) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const log = await db.habitLog.findUnique({
        where: { habitId_date: { habitId: id, date: dateStr } },
      });
      if (log) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Get week logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekLogs = await db.habitLog.findMany({
      where: {
        habitId: id,
        date: { gte: sevenDaysAgo.toISOString().slice(0, 10) },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      id: habit.id,
      userId: habit.userId,
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      streak,
      todayDone: !!todayLog,
      weekLogs: weekLogs.map((l) => ({
        id: l.id,
        habitId: l.habitId,
        date: l.date,
        count: l.count,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error toggling habit:', error);
    return NextResponse.json(
      { error: 'Failed to toggle habit' },
      { status: 500 }
    );
  }
}
