import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
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

    // Build a summary of the day's tasks for the LLM
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
        content: `أنت زكي — مساعد شخصي ذكي للإنتاجية. مهمتك تكتب ملخص يومي مختصر ودافئ عن إنتاجية المستخدم. تكلم بنفس لغة المستخدم. كن مختصر ومحفز. استخدم إيموجي واحدة فقط. اكتب 2-3 جمل فقط.`,
      },
      {
        role: 'user' as const,
        content: `اكتب ملخص ليوم ${date}. المهام:\n${taskSummary || 'لا توجد مهام لهذا اليوم.'}\n\nالإحصائيات: ${completedTasks}/${totalTasks} مهام مكتملة (${productivityScore.toFixed(0)}% إنتاجية)`,
      },
    ];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: promptMessages,
      thinking: { type: 'disabled' },
    });

    const summary =
      completion.choices?.[0]?.message?.content || `ملخص يوم ${date}: ${completedTasks}/${totalTasks} مهام مكتملة`;

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
