import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/session';

function formatHabitDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return formatHabitDate(new Date());
}

async function enrichHabit(habit: {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: string;
  targetCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const today = todayStr();

  // Check if done today
  const todayLog = await db.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date: today } },
  });

  // Compute streak
  let streak = 0;
  const checkDate = new Date();
  // If today is not done yet, start checking from yesterday
  if (!todayLog) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = formatHabitDate(checkDate);
    const log = await db.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: dateStr } },
    });
    if (log) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Get last 7 days logs
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekLogs = await db.habitLog.findMany({
    where: {
      habitId: habit.id,
      date: { gte: formatHabitDate(sevenDaysAgo) },
    },
    orderBy: { date: 'asc' },
  });

  return {
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
  };
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const habits = await db.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(habits.map(enrichHabit));
    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching habits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const { name, description, icon, color, frequency, targetCount } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Habit name is required' },
        { status: 400 }
      );
    }

    const habit = await db.habit.create({
      data: {
        userId,
        name: name.trim(),
        description: description || '',
        icon: icon || '✅',
        color: color || '#9ece6a',
        frequency: frequency || 'daily',
        targetCount: targetCount || 1,
      },
    });

    const enriched = await enrichHabit(habit);
    return NextResponse.json(enriched, { status: 201 });
  } catch (error) {
    console.error('Error creating habit:', error);
    return NextResponse.json(
      { error: 'Failed to create habit' },
      { status: 500 }
    );
  }
}
