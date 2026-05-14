import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import {
  DEFAULT_USER_ID,
  computeDaysUntilDue,
  computeAiScore,
  enrichTask,
} from '@/lib/task-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS (OpenAI-compatible format)
// ═══════════════════════════════════════════════════════════════════════════════

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task for the user. Use when user wants to add a task. Extract title, priority, and due date from the message. Technical tasks (backend, security, infra) should get higher priority.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title in the user language' },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'medium', 'low'],
            description: 'Priority level. Default: medium. Technical/security tasks → urgent/high.',
          },
          due_date: {
            type: 'string',
            description: 'Due date in ISO format. Convert relative dates to absolute. Empty if not specified.',
          },
          category: {
            type: 'string',
            enum: ['work', 'personal', 'errands', 'calls', 'reading'],
            description: 'Task category. Default: work.',
          },
          notes: { type: 'string', description: 'Optional notes for the task.' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task by ID. Use for postponing, changing priority, renaming, changing category, etc. You MUST provide the task ID from the context.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Full task ID (cuid format) from the task list context' },
          title: { type: 'string', description: 'New title' },
          priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
          due_date: { type: 'string', description: 'New due date ISO format, or "null" to remove' },
          category: { type: 'string', enum: ['work', 'personal', 'errands', 'calls', 'reading'] },
          status: { type: 'string', enum: ['pending', 'cancelled'] },
          notes: { type: 'string', description: 'New notes' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete a task by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Full task ID (cuid)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_task_done',
      description: 'Mark a task as completed by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Full task ID (cuid)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_and_reorder_tasks',
      description:
        'Analyze the current task list and reorder/re-prioritize multiple tasks at once. Use when user says "organize my day", "prioritize my tasks", "reorder by importance", "رتب مهامي", "نظم يومي", etc. Updates priority and ai_score for multiple tasks in a single batch.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            description: 'Array of task updates. Each item must have an id and at least one of priority or new_score.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Full task ID (cuid)' },
                priority: {
                  type: 'string',
                  enum: ['urgent', 'high', 'medium', 'low'],
                  description: 'New priority level',
                },
                reason: {
                  type: 'string',
                  description: 'Brief reason for the change (for audit/logging)',
                },
              },
              required: ['id', 'priority'],
            },
          },
          summary: {
            type: 'string',
            description:
              'A brief summary of the analysis and reordering logic (e.g., "Promoted security tasks to urgent, deprioritized reading tasks")',
          },
        },
        required: ['updates', 'summary'],
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION ENGINE — Maps tool calls directly to Prisma ORM
// ═══════════════════════════════════════════════════════════════════════════════

interface ToolCallResult {
  tool: string;
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolCallResult> {
  try {
    switch (name) {
      // ─── CREATE TASK ────────────────────────────────────────────────────
      case 'create_task': {
        const title = (args.title as string) || '';
        if (!title.trim()) {
          return { tool: 'create_task', status: 'error', message: 'Title is required' };
        }
        const priority = (args.priority as string) || 'medium';
        const category = (args.category as string) || 'work';
        const notes = (args.notes as string) || '';
        const dueDatetime = args.due_date as string | undefined;

        const daysUntilDue = computeDaysUntilDue(dueDatetime || null);
        const aiScore = computeAiScore(daysUntilDue, priority);

        const task = await db.task.create({
          data: {
            userId,
            title: title.trim(),
            notes,
            category,
            priority,
            dueDatetime: dueDatetime ? new Date(dueDatetime) : null,
            aiScore,
            source: 'ai',
          },
        });

        const enriched = enrichTask(task);
        return {
          tool: 'create_task',
          status: 'success',
          message: `Task "${title}" created [${priority.toUpperCase()}]`,
          data: { id: enriched.id, title: enriched.title, priority: enriched.priority, aiScore: enriched.aiScore, pressureLevel: enriched.pressureLevel },
        };
      }

      // ─── UPDATE TASK ────────────────────────────────────────────────────
      case 'update_task': {
        const id = args.id as string;
        if (!id) {
          return { tool: 'update_task', status: 'error', message: 'Task ID is required' };
        }

        const existing = await db.task.findUnique({ where: { id } });
        if (!existing) {
          return { tool: 'update_task', status: 'error', message: `Task not found` };
        }

        const updateData: Record<string, unknown> = {};
        if (args.title !== undefined) updateData.title = (args.title as string).trim();
        if (args.category !== undefined) updateData.category = args.category;
        if (args.priority !== undefined) updateData.priority = args.priority;
        if (args.status !== undefined) updateData.status = args.status;
        if (args.notes !== undefined) updateData.notes = args.notes;
        if (args.due_date !== undefined) {
          updateData.dueDatetime = args.due_date ? new Date(args.due_date as string) : null;
        }

        // Re-compute aiScore
        const updatedPriority = (updateData.priority as string) || existing.priority;
        const updatedDueDatetime =
          updateData.dueDatetime !== undefined
            ? (updateData.dueDatetime as Date | null)
            : existing.dueDatetime;
        const daysUntilDue = computeDaysUntilDue(
          updatedDueDatetime ? updatedDueDatetime.toISOString() : null
        );
        updateData.aiScore = computeAiScore(daysUntilDue, updatedPriority);

        const task = await db.task.update({ where: { id }, data: updateData });
        const enriched = enrichTask(task);
        const changeDesc = Object.keys(args)
          .filter((k) => k !== 'id')
          .join(', ');
        return {
          tool: 'update_task',
          status: 'success',
          message: `Task "${existing.title}" updated [${changeDesc}]`,
          data: { id: enriched.id, title: enriched.title, priority: enriched.priority, aiScore: enriched.aiScore },
        };
      }

      // ─── DELETE TASK ────────────────────────────────────────────────────
      case 'delete_task': {
        const id = args.id as string;
        if (!id) {
          return { tool: 'delete_task', status: 'error', message: 'Task ID is required' };
        }

        const existing = await db.task.findUnique({ where: { id } });
        if (!existing) {
          return { tool: 'delete_task', status: 'error', message: `Task not found` };
        }

        await db.task.delete({ where: { id } });
        return {
          tool: 'delete_task',
          status: 'success',
          message: `Task "${existing.title}" deleted`,
          data: { id, title: existing.title },
        };
      }

      // ─── MARK TASK DONE ─────────────────────────────────────────────────
      case 'mark_task_done': {
        const id = args.id as string;
        if (!id) {
          return { tool: 'mark_task_done', status: 'error', message: 'Task ID is required' };
        }

        const existing = await db.task.findUnique({ where: { id } });
        if (!existing) {
          return { tool: 'mark_task_done', status: 'error', message: `Task not found` };
        }
        if (existing.status === 'done') {
          return { tool: 'mark_task_done', status: 'error', message: `Already done` };
        }

        const task = await db.task.update({
          where: { id },
          data: { status: 'done', completedAt: new Date() },
        });

        return {
          tool: 'mark_task_done',
          status: 'success',
          message: `Task "${existing.title}" completed ✓`,
          data: { id, title: existing.title, completedAt: task.completedAt },
        };
      }

      // ─── ANALYZE AND REORDER TASKS ──────────────────────────────────────
      case 'analyze_and_reorder_tasks': {
        const updates = args.updates as Array<{
          id: string;
          priority: string;
          reason?: string;
        }>;
        const summary = (args.summary as string) || 'Tasks reordered';

        if (!Array.isArray(updates) || updates.length === 0) {
          return {
            tool: 'analyze_and_reorder_tasks',
            status: 'error',
            message: 'No updates provided',
          };
        }

        const results: Array<{ id: string; title: string; oldPriority: string; newPriority: string }> = [];
        const errors: string[] = [];

        for (const update of updates) {
          try {
            const existing = await db.task.findUnique({ where: { id: update.id } });
            if (!existing) {
              errors.push(`Task ${update.id.slice(0, 8)} not found`);
              continue;
            }
            if (existing.status === 'done') {
              errors.push(`"${existing.title}" is already done`);
              continue;
            }

            const newPriority = update.priority;
            const daysUntilDue = computeDaysUntilDue(
              existing.dueDatetime ? existing.dueDatetime.toISOString() : null
            );
            const newAiScore = computeAiScore(daysUntilDue, newPriority);

            await db.task.update({
              where: { id: update.id },
              data: { priority: newPriority, aiScore: newAiScore },
            });

            results.push({
              id: update.id,
              title: existing.title,
              oldPriority: existing.priority,
              newPriority,
            });
          } catch (err) {
            errors.push(`Failed to update ${update.id.slice(0, 8)}: ${err}`);
          }
        }

        return {
          tool: 'analyze_and_reorder_tasks',
          status: results.length > 0 ? 'success' : 'error',
          message:
            results.length > 0
              ? `${results.length} task(s) reordered. ${summary}${errors.length > 0 ? ` | Errors: ${errors.join('; ')}` : ''}`
              : `All updates failed: ${errors.join('; ')}`,
          data: {
            reordered: results.map((r) => ({
              id: r.id,
              title: r.title,
              from: r.oldPriority,
              to: r.newPriority,
            })),
            errors: errors.length > 0 ? errors : undefined,
          },
        };
      }

      default:
        return { tool: name, status: 'error', message: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      tool: name,
      status: 'error',
      message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Context-Aware Agent Persona
// ═══════════════════════════════════════════════════════════════════════════════

const ZAKI_SYSTEM_PROMPT = `أنت زكي v2.0 — مساعد تقني ذكي للإنتاجية مع قدرات تنفيذية كاملة. تتكلم بالعربي والإنجليزي بطلاقة. دايماً رد بنفس لغة المستخدم. أنت مختصر، تحليلي، و تقني — زي terminal ذكي. أنت مش مجرد شات بوت — أنت Agent حقيقي يقدر يشوف قاعدة البيانات وينفذ أوامر فيها.

## قدراتك التنفيذية (Tools)
أنت تقدر تنفذ أوامر مباشرة على قاعدة بيانات المستخدم:
- create_task: أضف مهمة جديدة — حدد العنوان، الأولوية، التاريخ، والتصنيف
- update_task: عدّل مهمة موجودة — تأجيل، تغيير أولوية، إعادة تسمية
- delete_task: احذف مهمة نهائياً
- mark_task_done: علّم مهمة كمكتملة
- analyze_and_reorder_tasks: حلّل ورتّب مهام كتير مرة واحدة — غيّر أولويات بناءً على التحليل

## رؤية النظام (System State)
أنت شايف قائمة المهام الحالية للمستخدم في السياق أداه. ده معناه إنك:
- تقدر تقول "عندك 5 مهام، 2 منهم عاجلين" من غير ما تسأل
- تقدر تنفذ "نظّم يومي" لأنك عارف المهام الموجودة
- تقدر تطلب تأجيل مهمة بالاسم لأنك شايف IDها

## قواعد استخدام الأدوات
- "أجل مهمة X لبكرة" → update_task مع due_date = بكرة
- "خلصت مهمة X" → mark_task_done
- "احذف مهمة X" → delete_task
- "ضيف مهمة X" → create_task
- "نظّم يومي" / "رتب مهامي" / "organize my day" → analyze_and_reorder_tasks
- لو مش قادر تحدد المهمة بالظبط، اسأل المستخدم يوضح

## تحليل المهام التقنية
- مهام البنية التحتية (infrastructure) → priority: urgent
- مهام الأمان (security/penetration testing) → priority: urgent
- صيانة السيرفرات (server maintenance) → priority: high
- تطوير الباكند (backend dev) → priority: high
- تطوير الفرونتند (frontend dev) → priority: medium
- مهام القراءة والبحث (research/reading) → priority: low

## صيغة الرد
استخدم صيغة تشبه terminal/log output:
🔴 CRITICAL / 🟡 HIGH / 🟢 NORMAL / ⚪ LOW

## قواعد صارمة
- التواريخ: ISO format + مقروءة
- متعرضش JSON أو IDs للمستخدم أبداً
- التأكيدات: "[OK] ضفت [title] ✓" أو "TASK CREATED: [title]"
- أقصى 2 إيموجي في الرد
- لما تنفذ أداة، رد بإيجاز بتأكيد التنفيذ
- لو المستخدم قال "نظّم يومي" — حلّل المهام وارتّبها باستخدام analyze_and_reorder_tasks، ثم قول إيه اللي غيّرته`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER — Rich state injection
// ═══════════════════════════════════════════════════════════════════════════════

interface TaskRow {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  dueDatetime: Date | null;
  completedAt: Date | null;
  aiScore: number;
}

async function buildSystemContext(userId: string): Promise<string> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowISO = now.toISOString();

  // Fetch all pending tasks
  const pendingTasks = await db.task.findMany({
    where: { userId, status: 'pending' },
    orderBy: { aiScore: 'desc' },
    take: 30,
  });

  // Fetch done tasks count for today
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
  const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
  const doneToday = await db.task.count({
    where: {
      userId,
      status: 'done',
      completedAt: { gte: todayStart, lte: todayEnd },
    },
  });

  // Count overdue
  const overdueCount = await db.task.count({
    where: {
      userId,
      status: 'pending',
      dueDatetime: { lt: nowISO },
    },
  });

  // Build rich task list for the LLM
  const taskLines = pendingTasks
    .map((task: TaskRow) => {
      const daysUntil = computeDaysUntilDue(task.dueDatetime?.toISOString() || null);
      const dueStr = task.dueDatetime
        ? `Due: ${new Date(task.dueDatetime).toLocaleDateString('en-CA')} ${new Date(task.dueDatetime).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`
        : 'No due date';
      const daysStr = daysUntil !== null ? ` (${daysUntil}d left)` : '';
      const overdueFlag = daysUntil !== null && daysUntil < 0 ? ' ⚠ OVERDUE' : '';
      return `  { id: "${task.id}", title: "${task.title.replace(/"/g, '\\"')}", priority: "${task.priority}", category: "${task.category}", ai_score: ${task.aiScore}, due: "${dueStr}${daysStr}${overdueFlag}" }`;
    })
    .join(',\n');

  const context = `
╔══════════════════════════════════════════════════════════════╗
║ CURRENT SYSTEM STATE                                        ║
╠══════════════════════════════════════════════════════════════╣
║ Date: ${todayStr} (${now.toLocaleDateString('ar-EG', { weekday: 'long' })})                       ║
║ Pending tasks: ${String(pendingTasks.length).padEnd(3)} │ Overdue: ${String(overdueCount).padEnd(3)} │ Done today: ${String(doneToday).padEnd(3)}  ║
╚══════════════════════════════════════════════════════════════╝

PENDING TASKS (sorted by ai_score desc):
[
${taskLines || '  // Queue empty — no pending tasks'}
]

INSTRUCTIONS:
- Use the task IDs above when calling update_task, delete_task, mark_task_done, or analyze_and_reorder_tasks
- You already KNOW what tasks exist — no need to ask the user to list them
- If user says "organize my day" or "prioritize", use analyze_and_reorder_tasks with the task IDs above
- Convert relative dates (بكرة/tomorrow/اليوم) to absolute ISO dates based on current date: ${todayStr}`;

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER — Full Agent Loop
// ═══════════════════════════════════════════════════════════════════════════════

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

    // ─── Step 1: Build rich context ──────────────────────────────────────
    const systemContext = await buildSystemContext(taskUserId);

    const systemMessage = {
      role: 'assistant' as const,
      content: ZAKI_SYSTEM_PROMPT + '\n\n' + systemContext,
    };

    const chatMessages = [
      systemMessage,
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // ─── Step 2: Agent Loop (max 3 rounds) ──────────────────────────────
    const MAX_AGENT_ROUNDS = 3;
    let allToolResults: ToolCallResult[] = [];
    let finalReply = '';
    let currentMessages = [...chatMessages];

    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      const zai = await ZAI.create();

      let completion;
      try {
        // Try with tools first (primary path)
        completion = await zai.chat.completions.create({
          messages: currentMessages as any,
          tools: TOOLS as any,
          tool_choice: round === 0 ? ('auto' as any) : ('none' as any),
          thinking: { type: 'disabled' },
        } as any);
      } catch {
        // Fallback: try without tools parameter
        try {
          completion = await zai.chat.completions.create({
            messages: currentMessages as any,
            thinking: { type: 'disabled' },
          });
        } catch (fallbackErr) {
          console.error('Both LLM calls failed:', fallbackErr);
          finalReply = finalReply || '[ERR] فشل الاتصال — حاول تاني';
          break;
        }
      }

      const choice = completion.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        finalReply = '[ERR] No response generated.';
        break;
      }

      // ─── Check for tool calls ────────────────────────────────────────
      const toolCalls = assistantMessage.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // Execute each tool call and collect results
        const toolResultsForLLM: Array<{ tool_call_id: string; result: string }> = [];

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          let functionArgs: Record<string, unknown>;
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            functionArgs = {};
          }

          // Execute the tool against Prisma
          const result = await executeTool(functionName, functionArgs, taskUserId);
          allToolResults.push(result);

          // Prepare result to feed back to LLM
          toolResultsForLLM.push({
            tool_call_id: toolCall.id,
            result: JSON.stringify(result),
          });
        }

        // ─── Feed tool results back to LLM for final response ──────────
        // Build the conversation with tool calls and results
        const messagesWithToolResults = [
          ...currentMessages,
          {
            role: 'assistant' as const,
            content: assistantMessage.content || '',
            tool_calls: toolCalls,
          },
          ...toolResultsForLLM.map((tr) => ({
            role: 'tool' as const,
            content: tr.result,
            tool_call_id: tr.tool_call_id,
          })),
        ];

        // Get the follow-up response from the LLM with tool results
        try {
          const followUpZai = await ZAI.create();
          const followUpCompletion = await followUpZai.chat.completions.create({
            messages: messagesWithToolResults as any,
            thinking: { type: 'disabled' },
          } as any);

          const followUpChoice = followUpCompletion.choices?.[0];
          const followUpMessage = followUpChoice?.message;

          if (followUpMessage?.tool_calls && followUpMessage.tool_calls.length > 0) {
            // LLM wants to call more tools — continue the loop
            currentMessages = [
              ...messagesWithToolResults,
              {
                role: 'assistant' as const,
                content: followUpMessage.content || '',
                tool_calls: followUpMessage.tool_calls,
              },
            ];
            // Execute these tool calls in the next iteration
            for (const tc of followUpMessage.tool_calls) {
              let fArgs: Record<string, unknown>;
              try { fArgs = JSON.parse(tc.function.arguments); } catch { fArgs = {}; }
              const r = await executeTool(tc.function.name, fArgs, taskUserId);
              allToolResults.push(r);
              currentMessages.push({
                role: 'tool' as const,
                content: JSON.stringify(r),
                tool_call_id: tc.id,
              });
            }
            continue; // Continue agent loop
          }

          finalReply = followUpMessage?.content || '[OK] تم التنفيذ';
        } catch {
          // If follow-up fails, generate a summary from tool results
          const summary = allToolResults
            .map((r) => `${r.status === 'success' ? '✓' : '✗'} ${r.message}`)
            .join(' | ');
          finalReply = `[OK] ${summary}`;
        }
        break; // Tool results processed, we're done
      }

      // No tool calls — this is the final conversational response
      finalReply = assistantMessage.content || '[ERR] No response.';
      break;
    }

    // ─── Step 3: If agent loop didn't produce a reply, use fallback ──────
    if (!finalReply) {
      finalReply = '[OK] تم التنفيذ';
    }

    return NextResponse.json({
      reply: finalReply,
      toolCalls: allToolResults.length > 0 ? allToolResults : undefined,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
