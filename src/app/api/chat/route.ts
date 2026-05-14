import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID, computeDaysUntilDue, computeAiScore, enrichTask } from '@/lib/task-utils';

// ─── Tool Definitions (OpenAI-compatible format) ────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task. Use when user wants to add a task.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
          due_date: { type: 'string', description: 'Due date ISO format' },
          category: { type: 'string', enum: ['work', 'personal', 'errands', 'calls', 'reading'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task. Use for postponing, changing priority, renaming, etc.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID (full cuid)' },
          title: { type: 'string' },
          priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
          due_date: { type: 'string', description: 'New due date ISO format, or "null" to remove' },
          category: { type: 'string', enum: ['work', 'personal', 'errands', 'calls', 'reading'] },
          status: { type: 'string', enum: ['pending', 'cancelled'] },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task permanently.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID (full cuid)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_task_done',
      description: 'Mark a task as completed.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID (full cuid)' },
        },
        required: ['id'],
      },
    },
  },
];

// ─── Tool Execution Engine ──────────────────────────────────────────────────

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
      case 'create_task': {
        const title = (args.title as string) || '';
        if (!title.trim()) {
          return { tool: 'create_task', status: 'error', message: 'Title is required' };
        }
        const priority = (args.priority as string) || 'medium';
        const category = (args.category as string) || 'work';
        const dueDatetime = args.due_date as string | undefined;

        const daysUntilDue = computeDaysUntilDue(dueDatetime || null);
        const aiScore = computeAiScore(daysUntilDue, priority);

        const task = await db.task.create({
          data: {
            userId,
            title: title.trim(),
            category,
            priority,
            dueDatetime: dueDatetime ? new Date(dueDatetime) : null,
            aiScore,
          },
        });

        const enriched = enrichTask(task);
        return {
          tool: 'create_task',
          status: 'success',
          message: `Task "${title}" created [${priority.toUpperCase()}]`,
          data: enriched,
        };
      }

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
        if (args.due_date !== undefined) {
          updateData.dueDatetime = args.due_date ? new Date(args.due_date as string) : null;
        }

        const updatedPriority = (updateData.priority as string) || existing.priority;
        const updatedDueDatetime = updateData.dueDatetime !== undefined
          ? (updateData.dueDatetime as Date | null)
          : existing.dueDatetime;
        const daysUntilDue = computeDaysUntilDue(
          updatedDueDatetime ? updatedDueDatetime.toISOString() : null
        );
        updateData.aiScore = computeAiScore(daysUntilDue, updatedPriority);

        const task = await db.task.update({ where: { id }, data: updateData });
        const enriched = enrichTask(task);
        const changeDesc = Object.keys(args).filter((k) => k !== 'id').join(', ');
        return {
          tool: 'update_task',
          status: 'success',
          message: `Task "${existing.title}" updated [${changeDesc}]`,
          data: enriched,
        };
      }

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
        };
      }

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
          message: `Task "${existing.title}" marked as done ✓`,
          data: enrichTask(task) as unknown as Record<string, unknown>,
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

// ─── System Prompt ──────────────────────────────────────────────────────────

const ZAKI_SYSTEM_PROMPT = `أنت زكي v2.0 — مساعد تقني ذكي للإنتاجية مع قدرات تنفيذية. تتكلم بالعربي والإنجليزي بطلاقة. دايماً رد بنفس لغة المستخدم. أنت مختصر، تحليلي، و تقني — زي terminal ذكي.

## قدراتك التنفيذية (Tools)
أنت تقدر تنفذ أوامر مباشرة على مهام المستخدم:
- create_task: لما المستخدم يطلب يضيف مهمة جديدة
- update_task: لما المستخدم يطلب يعدّل مهمة (تأجيل، تغيير أولوية، إلخ)
- delete_task: لما المستخدم يطلب يحذف مهمة
- mark_task_done: لما المستخدم يقول إنه خلص مهمة

## قواعد استخدام الأدوات
- لو المستخدم قال "أجل مهمة X لبكرة" → استخدم update_task مع due_date = بكرة
- لو المستخدم قال "خلصت مهمة X" أو "خلصت X" → استخدم mark_task_done
- لو المستخدم قال "احذف مهمة X" → استخدم delete_task
- لو المستخدم قال "ضيف مهمة X" أو "عندي مهمة X" → استخدم create_task
- دايماً حدد ID المهمة من القائمة المعروضة في السياق
- لو مش قادر تحدد المهمة بالظبط، اسأل المستخدم يوضح أكتر

## تحليل المهام التقنية
أنت مختص في تحديد أولوية المهام التقنية:
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
- متعرضش JSON أو IDs للمستخدم
- التأكيدات: "[OK] ضفت [title] ✓" أو "TASK CREATED: [title]"
- أقصى 2 إيموجي في الرد
- لما تنفذ أداة، رد بإيجاز بتأكيد التنفيذ`;

// ─── Prompt-based action extraction (fallback when tools not supported) ─────

const ACTION_EXTRACTION_PROMPT = `You are an action extraction engine. Given a user message and a list of their current tasks, determine if the user wants to perform any of these actions:
- create_task: Add a new task
- update_task: Modify an existing task (postpone, change priority, rename, etc.)
- delete_task: Delete a task
- mark_task_done: Mark a task as completed

Respond with ONLY a JSON array of actions. Each action has: { "tool": "action_name", "args": { ... } }
If no actions are needed, respond with: []

For create_task: { "tool": "create_task", "args": { "title": "...", "priority": "medium|high|urgent|low", "due_date": "ISO date or null", "category": "work|personal|errands|calls|reading" } }
For update_task: { "tool": "update_task", "args": { "id": "full_task_id", "due_date": "new date", "priority": "new priority", ... } }
For delete_task: { "tool": "delete_task", "args": { "id": "full_task_id" } }
For mark_task_done: { "tool": "mark_task_done", "args": { "id": "full_task_id" } }

IMPORTANT: 
- Use full task IDs from the provided list
- Convert relative dates (بكرة/tomorrow) to absolute ISO dates
- Today's date is {today}
- If you can't identify the specific task, return empty array
- Return ONLY the JSON array, no other text`;

// ─── Main Handler ───────────────────────────────────────────────────────────

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
        return `- ID:${task.id} [${task.priority.toUpperCase()}] ${task.title} | ${dueStr}${daysStr}${overdueFlag} | Cat: ${task.category} | Score: ${task.aiScore}`;
      })
      .join('\n');

    const contextMessage = taskContext
      ? `\n\n--- CURRENT TASK QUEUE (pending, sorted by priority score) ---\n${taskContext}\n--- END QUEUE ---`
      : '\n\n[QUEUE EMPTY] No pending tasks.';

    // Build messages for the LLM
    const systemMessage = {
      role: 'assistant' as const,
      content: ZAKI_SYSTEM_PROMPT + contextMessage,
    };

    const chatMessages = [
      systemMessage,
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // ─── Phase 1: Try OpenAI-style tool calling ─────────────────────────────
    let allToolResults: ToolCallResult[] = [];
    let finalReply = '';
    let toolsWorked = false;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: chatMessages as any,
        tools: TOOLS as any,
        tool_choice: 'auto' as any,
        thinking: { type: 'disabled' },
      } as any);

      const choice = completion.choices?.[0];
      const assistantMessage = choice?.message;

      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        toolsWorked = true;
        const toolCalls = assistantMessage.tool_calls;

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          let functionArgs: Record<string, unknown>;
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            functionArgs = {};
          }

          const result = await executeTool(functionName, functionArgs, taskUserId);
          allToolResults.push(result);
        }

        // Get a follow-up response summarizing the tool results
        const toolResultSummary = allToolResults
          .map((r) => `[${r.status === 'success' ? 'OK' : 'ERR'}] ${r.tool}: ${r.message}`)
          .join('\n');

        const followUpMessages = [
          ...chatMessages,
          {
            role: 'assistant' as const,
            content: `[ACTIONS EXECUTED]\n${toolResultSummary}\n\nNow respond to the user confirming these actions in a concise, friendly way. Use the same language as the user. Keep it brief — 1-2 sentences max. NEVER show task IDs, raw JSON, or technical data to the user.`,
          },
        ];

        const followUpCompletion = await zai.chat.completions.create({
          messages: followUpMessages as any,
          thinking: { type: 'disabled' },
        });

        finalReply = followUpCompletion.choices?.[0]?.message?.content || '[OK] تم التنفيذ';
      } else {
        // No tool calls — just use the direct response
        finalReply = assistantMessage?.content || '[ERR] No response generated.';
      }
    } catch (toolsError) {
      console.log('Tools-based calling not supported or failed, falling back to prompt-based extraction:', toolsError);
    }

    // ─── Phase 2: Fallback — prompt-based action extraction ─────────────────
    if (!toolsWorked) {
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      const today = new Date().toISOString().split('T')[0];

      // Try to extract actions from the user's message
      const extractionMessages = [
        {
          role: 'assistant' as const,
          content: ACTION_EXTRACTION_PROMPT.replace('{today}', today) +
            (taskContext ? `\n\n--- TASK LIST ---\n${taskContext}\n--- END ---` : ''),
        },
        {
          role: 'user' as const,
          content: lastUserMessage,
        },
      ];

      try {
        const zai = await ZAI.create();
        const extractionCompletion = await zai.chat.completions.create({
          messages: extractionMessages as any,
          thinking: { type: 'disabled' },
        });

        const extractionText = extractionCompletion.choices?.[0]?.message?.content || '';

        // Try to parse the JSON array of actions
        const jsonMatch = extractionText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const actions = JSON.parse(jsonMatch[0]) as Array<{
            tool: string;
            args: Record<string, unknown>;
          }>;

          if (Array.isArray(actions) && actions.length > 0) {
            for (const action of actions) {
              if (['create_task', 'update_task', 'delete_task', 'mark_task_done'].includes(action.tool)) {
                const result = await executeTool(action.tool, action.args, taskUserId);
                allToolResults.push(result);
              }
            }
          }
        }
      } catch (parseError) {
        console.log('Prompt-based extraction failed or no actions detected:', parseError);
      }

      // Now get the conversational response
      if (allToolResults.length > 0) {
        // If we executed tools, get a confirmation response
        const toolResultSummary = allToolResults
          .map((r) => `[${r.status === 'success' ? 'OK' : 'ERR'}] ${r.tool}: ${r.message}`)
          .join('\n');

        const confirmMessages = [
          systemMessage,
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          {
            role: 'assistant' as const,
            content: `[ACTIONS EXECUTED]\n${toolResultSummary}\n\nNow respond to the user confirming these actions. Use the same language as the user. Be brief — 1-2 sentences. NEVER show task IDs, raw JSON, or technical data.`,
          },
        ];

        try {
          const zai = await ZAI.create();
          const confirmCompletion = await zai.chat.completions.create({
            messages: confirmMessages as any,
            thinking: { type: 'disabled' },
          });
          finalReply = confirmCompletion.choices?.[0]?.message?.content || '[OK] تم التنفيذ';
        } catch {
          finalReply = '[OK] تم التنفيذ';
        }
      } else {
        // No tools executed — just get a regular chat response
        try {
          const zai = await ZAI.create();
          const chatCompletion = await zai.chat.completions.create({
            messages: chatMessages as any,
            thinking: { type: 'disabled' },
          });
          finalReply = chatCompletion.choices?.[0]?.message?.content || '[ERR] No response.';
        } catch {
          finalReply = '[ERR] فشل الاتصال — حاول تاني';
        }
      }
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
