import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, computeDaysUntilDue } from '@/lib/task-utils';

const ZAKI_SYSTEM_PROMPT = `أنت زكي v2.0 — مساعد تقني ذكي للإنتاجية. تتكلم بالعربي والإنجليزي بطلاقة. دايماً رد بنفس لغة المستخدم. أنت مختصر، تحليلي، و تقني — زي terminal ذكي.

## تحليل المهام التقنية
أنت مختص في تحديد أولوية المهام التقنية:
- مهام البنية التحتية (infrastructure) → priority: urgent
- مهام الأمان (security/penetration testing) → priority: urgent
- صيانة السيرفرات (server maintenance) → priority: high
- تطوير الباكند (backend dev) → priority: high
- تطوير الفرونتند (frontend dev) → priority: medium
- مهام القراءة والبحث (research/reading) → priority: low

## استخراج البيانات من المدخلات
لما المستخدم يكتب مهمة جديدة، استخرج:
- title: عبارة فعل قصيرة ودقيقة
- due_datetime: حوّل الأوقات النسبية لصيغة واضحة
- priority: [urgent, high, medium, low] — ركّز على الكلمات المفتاحية التقنية
- category: [work, personal, errands, calls, reading]

كلمات الاستعجال: عاجل، ضروري، النهارده، دلوقتي، urgent, ASAP, today, deadline, critical, P0, P1

## صيغة الرد
لما المستخدم يسأل عن مهامه، لخصها بأسلوب تقني:
🔴 CRITICAL / 🟡 HIGH / 🟢 NORMAL / ⚪ LOW

استخدم صيغة تشبه terminal/log output:
- "3 pending tasks | 1 overdue | 2 due today"
- "TASK-001: [URGENT] Deploy security patch — ETA: 2h"

## قواعد صارمة
- التواريخ: ISO format + مقروءة "الخميس 15 مايو الساعة 3 العصر"
- متعرضش JSON أو IDs للمستخدم
- التأكيدات: "[OK] ضفت [title] ✓" أو "TASK CREATED: [title]"
- أقصى 2 إيموجي في الرد
- حلل المهام واقترح أولويات تقنية
- لو مهمة تقنية محتاجة اهتمام فوري، نبّه المستخدم بوضوح
- استخدم تنسيق شبه terminal حيث يناسب`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userId } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      userId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const taskUserId = userId || DEFAULT_USER_ID;

    // Fetch user's current tasks as context
    const tasks = await db.task.findMany({
      where: { userId: taskUserId, status: 'pending' },
      orderBy: { aiScore: 'desc' },
      take: 20,
    });

    const taskContext = tasks
      .map((task) => {
        const daysUntil = computeDaysUntilDue(task.dueDatetime?.toISOString() || null);
        const dueStr = task.dueDatetime
          ? `Due: ${new Date(task.dueDatetime).toLocaleString()}`
          : 'No due date';
        const daysStr = daysUntil !== null ? ` (${daysUntil}d remaining)` : '';
        const overdueFlag = daysUntil !== null && daysUntil < 0 ? ' ⚠ OVERDUE' : '';
        return `- [${task.priority.toUpperCase()}] ${task.title} | ${dueStr}${daysStr}${overdueFlag} | Cat: ${task.category} | Score: ${task.aiScore}`;
      })
      .join('\n');

    const contextMessage = taskContext
      ? `\n\n--- CURRENT TASK QUEUE (pending, sorted by priority score) ---\n${taskContext}\n--- END QUEUE ---`
      : '\n\n[QUEUE EMPTY] No pending tasks.';

    // z-ai-web-dev-sdk uses 'assistant' role for system prompts
    const systemMessage = {
      role: 'assistant' as const,
      content: ZAKI_SYSTEM_PROMPT + contextMessage,
    };

    // Build the messages array for the LLM
    const chatMessages = [
      systemMessage,
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: chatMessages,
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices?.[0]?.message?.content || '[ERR] No response generated.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
