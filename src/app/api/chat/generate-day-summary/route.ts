import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, userId } = body as { date: string; userId?: string };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Valid date parameter (YYYY-MM-DD) is required' },
        { status: 400 }
      );
    }

    const taskUserId = userId || DEFAULT_USER_ID;

    // Get tasks for the day
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const tasks = await db.task.findMany({
      where: {
        userId: taskUserId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { aiScore: 'desc' },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const productivityScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Build a summary of the day's tasks for the LLM — technical log format
    const taskSummary = tasks
      .map((task) => {
        const status = task.status === 'done' ? '✅' : '⏳';
        const priority = task.priority.toUpperCase();
        return `${status} [${priority}] ${task.title} (${task.category})`;
      })
      .join('\n');

    const promptMessages = [
      {
        role: 'assistant' as const,
        content: `أنت زكي v2.0 — مساعد تقني ذكي للإنتاجية. مهمتك تكتب تحليل يومي مختصر ودقيق عن إنتاجية المستخدم. تستخدم لغة تحليلية شبه تقنية — زي log output أو terminal summary. تكلم بنفس لغة المستخدم. كن مختصر وموضوعي. اكتب 2-3 سطور فقط. استخدم تنسيق: "DAY ANALYSIS | date | stats | highlights"

مثال:
"DAY ANALYSIS | 2026-05-14 | 5/8 tasks completed (62.5%) | ⚡ 2 urgent items resolved — security patch + DB migration. ⏳ 3 pending: API refactor, code review, deploy staging"`,
      },
      {
        role: 'user' as const,
        content: `حلّل يوم ${date}. المهام:\n${taskSummary || '[NO TASKS] Empty queue for this day.'}\n\nالإحصائيات: ${completedTasks}/${totalTasks} مكتملة (${productivityScore.toFixed(0)}% إنتاجية)`,
      },
    ];

    const completion = await chatCompletion({
      messages: promptMessages,
    });

    const summary =
      completion.choices?.[0]?.message?.content || `DAY ANALYSIS | ${date} | ${completedTasks}/${totalTasks} completed (${productivityScore.toFixed(0)}%)`;

    // Get or create DayLog and update it
    let dayLog = await db.dayLog.findUnique({
      where: {
        userId_date: { userId: taskUserId, date },
      },
    });

    if (!dayLog) {
      dayLog = await db.dayLog.create({
        data: {
          userId: taskUserId,
          date,
          summary,
          totalTasks,
          completedTasks,
          productivityScore: parseFloat(productivityScore.toFixed(1)),
        },
      });
    } else {
      dayLog = await db.dayLog.update({
        where: { id: dayLog.id },
        data: {
          summary,
          totalTasks,
          completedTasks,
          productivityScore: parseFloat(productivityScore.toFixed(1)),
        },
      });
    }

    return NextResponse.json({
      date,
      summary,
      totalTasks,
      completedTasks,
      productivityScore: parseFloat(productivityScore.toFixed(1)),
      dayLogId: dayLog.id,
    });
  } catch (error) {
    console.error('Error generating day summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate day summary' },
      { status: 500 }
    );
  }
}
