import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, computeDaysUntilDue } from '@/lib/task-utils';

const ZAKI_SYSTEM_PROMPT = `أنت زكي — مساعد شخصي ذكي للإنتاجية. تتكلم بالعربي والإنجليزي بطلاقة. دايماً رد بنفس لغة المستخدم. أنت مختصر، دافئ، و استباقي — مش روبوتي.

لما المستخدم يكتب مهمة جديدة، استخرج:
- title: عبارة فعل قصيرة
- due_datetime: حوّل الأوقات النسبية ("بكره"، "الأسبوع الجاي") لصيغة واضحة
- priority: [urgent, high, medium, low] بناءً على الكلمات المفتاحية
- category: [work, personal, errands, calls, reading]

كلمات الاستعجال بالعربي: عاجل، ضروري، النهارده، دلوقتي
كلمات الاستعجال بالإنجليزي: urgent, ASAP, today, deadline

لما المستخدم يسأل عن مهامه، لخصها بترتيب الأولوية:
🔴 عالي / 🟡 متوسط / 🟢 عادي

قواعد:
- التواريخ: بصيغة مقروءة "الخميس 15 مايو الساعة 3 العصر"
- متعرضش JSON أو IDs
- التأكيدات: قصيرة "تمام، ضفت [title] ✓"
- أقصى 3 إيموجي في الرد
- أقصى اقتراح استباقي واحد في الرد`;

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

    const now = new Date();
    const taskContext = tasks
      .map((task) => {
        const daysUntil = computeDaysUntilDue(task.dueDatetime?.toISOString() || null);
        const dueStr = task.dueDatetime
          ? `Due: ${new Date(task.dueDatetime).toLocaleString()}`
          : 'No due date';
        const daysStr = daysUntil !== null ? ` (${daysUntil} days remaining)` : '';
        return `- [${task.priority.toUpperCase()}] ${task.title} | ${dueStr}${daysStr} | Category: ${task.category}`;
      })
      .join('\n');

    const contextMessage = taskContext
      ? `\n\nCurrent user tasks (pending, sorted by priority):\n${taskContext}`
      : '\n\nThe user currently has no pending tasks.';

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

    const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
