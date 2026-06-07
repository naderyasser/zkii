import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { webSearch, SearchNotConfiguredError } from '@/lib/web-search';
import { db } from '@/lib/db';
import {
  DEFAULT_USER_ID,
  computeDaysUntilDue,
  computeAiScore,
  enrichTask,
} from '@/lib/task-utils';
import { getUserId, unauthorized } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';

// تكامل Gmail/Calendar حالياً مربوط بحساب واحد (الأدمن = DEFAULT_USER_ID).
// لأي مستخدم تاني نرجّع «غير متصل» عشان نمنع تسريب بيانات الأدمن.
function googleAvailableFor(userId: string): boolean {
  return userId === DEFAULT_USER_ID;
}
import { GmailService, CalendarService, getOAuthStatus } from '@/lib/googleApi';

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS (OpenAI-compatible format)
// ═══════════════════════════════════════════════════════════════════════════════
// 8 tools: 5 task management + 1 web search + 2 Google integration (Gmail + Calendar)
// ═══════════════════════════════════════════════════════════════════════════════

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task for the user. Use when user wants to add a task. Extract title, priority, and due date from the message. Technical tasks (backend, security, infra) should get higher priority. Also use when you find an actionable email that needs a follow-up task.',
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
  // ═══════════════════════════════════════════════════════════════════════════
  // WEB SEARCH TOOL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for current information, news, facts, or any topic. Use when the user asks about something that requires up-to-date information, recent news, current events, or facts you are not certain about.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string. Be specific for better results.',
          },
          num: {
            type: 'number',
            description: 'Number of results to return. Default: 5. Max: 10.',
          },
        },
        required: ['query'],
      },
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE INTEGRATION TOOLS — Gmail + Calendar
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'scan_gmail_inbox',
      description:
        "Scans the user's Gmail inbox for messages. Use Gmail search syntax (e.g., 'is:unread', 'from:boss@company.com', 'subject:urgent', 'newer_than:1d'). Returns up to maxResults emails with sender, subject, date, and snippet. Use this when user asks about emails, unread messages, or wants to check their inbox. IMPORTANT: If Google is not connected, tell the user to connect their Google account first via the Integrations panel.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "Gmail search query. Examples: 'is:unread', 'is:unread newer_than:1d', 'from:boss subject:urgent', 'category:primary is:unread'. Default: 'is:unread newer_than:3d'",
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return. Default: 5. Max: 10.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description:
        "Fetches today's appointments and events from the user's Google Calendar. Returns event title, time, location, and attendees. Use this when user asks about their schedule, meetings, or what's on their calendar today. Also use automatically when generating a 'Daily Brief'. IMPORTANT: If Google is not connected, tell the user to connect their Google account first.",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION ENGINE — Maps tool calls to Prisma ORM + Google APIs
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

      // ═══════════════════════════════════════════════════════════════════════
      // WEB SEARCH — Search the internet for current information
      // ═══════════════════════════════════════════════════════════════════════
      case 'web_search': {
        const query = (args.query as string) || '';
        if (!query.trim()) {
          return { tool: 'web_search', status: 'error', message: 'Search query is required' };
        }
        const num = Math.min((args.num as number) || 5, 10);

        try {
          const searchResults = await webSearch(query, num);

          if (searchResults.length === 0) {
            return {
              tool: 'web_search',
              status: 'success',
              message: `No results found for: "${query}"`,
              data: { query, count: 0, results: [] },
            };
          }

          return {
            tool: 'web_search',
            status: 'success',
            message: `Found ${searchResults.length} result(s) for: "${query}"`,
            data: {
              query,
              count: searchResults.length,
              results: searchResults,
            },
          };
        } catch (searchError) {
          if (searchError instanceof SearchNotConfiguredError) {
            return {
              tool: 'web_search',
              status: 'error',
              message: 'البحث غير مفعّل — لم يتم ضبط SEARCH_API_KEY.',
            };
          }
          const errMsg = searchError instanceof Error ? searchError.message : 'Unknown search error';
          return {
            tool: 'web_search',
            status: 'error',
            message: `Web search failed: ${errMsg}`,
          };
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // GOOGLE INTEGRATION — Gmail & Calendar Tool Execution
      // ═══════════════════════════════════════════════════════════════════════

      // ─── SCAN GMAIL INBOX ─────────────────────────────────────────────
      case 'scan_gmail_inbox': {
        // عزل: تكامل Google متاح للأدمن فقط حالياً
        if (!googleAvailableFor(userId)) {
          return { tool: 'scan_gmail_inbox', status: 'error', message: 'GOOGLE_NOT_CONNECTED: اربط حساب Google من لوحة Integrations.' };
        }
        // Check if Google is connected first
        const oauthStatus = await getOAuthStatus();
        if (!oauthStatus.connected) {
          return {
            tool: 'scan_gmail_inbox',
            status: 'error',
            message: 'GOOGLE_NOT_CONNECTED: Google account is not linked. Ask the user to connect their Google account via the Integrations panel on the main page.',
          };
        }

        const query = (args.query as string) || 'is:unread newer_than:3d';
        const maxResults = Math.min((args.maxResults as number) || 5, 10);

        try {
          const emails = await GmailService.scanInbox(query, maxResults);

          if (emails.length === 0) {
            return {
              tool: 'scan_gmail_inbox',
              status: 'success',
              message: `No emails found for query: "${query}"`,
              data: { query, count: 0, emails: [] },
            };
          }

          return {
            tool: 'scan_gmail_inbox',
            status: 'success',
            message: `Found ${emails.length} email(s) for query: "${query}"`,
            data: {
              query,
              count: emails.length,
              emails: emails.map((e) => ({
                from: e.from,
                subject: e.subject,
                date: e.date,
                snippet: e.snippet,
              })),
            },
          };
        } catch (apiError) {
          const errMsg = apiError instanceof Error ? apiError.message : 'Unknown API error';
          if (errMsg.includes('TOKEN_REFRESH_FAILED')) {
            return {
              tool: 'scan_gmail_inbox',
              status: 'error',
              message: 'GOOGLE_TOKEN_EXPIRED: Google token refresh failed. Ask the user to re-connect their Google account.',
            };
          }
          return {
            tool: 'scan_gmail_inbox',
            status: 'error',
            message: `Gmail API error: ${errMsg}`,
          };
        }
      }

      // ─── GET CALENDAR EVENTS ──────────────────────────────────────────
      case 'get_calendar_events': {
        // عزل: تكامل Google متاح للأدمن فقط حالياً
        if (!googleAvailableFor(userId)) {
          return { tool: 'get_calendar_events', status: 'error', message: 'GOOGLE_NOT_CONNECTED: اربط حساب Google من لوحة Integrations.' };
        }
        // Check if Google is connected first
        const oauthStatus = await getOAuthStatus();
        if (!oauthStatus.connected) {
          return {
            tool: 'get_calendar_events',
            status: 'error',
            message: 'GOOGLE_NOT_CONNECTED: Google account is not linked. Ask the user to connect their Google account via the Integrations panel on the main page.',
          };
        }

        try {
          const events = await CalendarService.getTodayEvents();

          if (events.length === 0) {
            return {
              tool: 'get_calendar_events',
              status: 'success',
              message: 'No calendar events scheduled for today',
              data: { count: 0, events: [] },
            };
          }

          return {
            tool: 'get_calendar_events',
            status: 'success',
            message: `Found ${events.length} event(s) for today`,
            data: {
              count: events.length,
              events: events.map((ev) => ({
                summary: ev.summary,
                start: ev.start.dateTime || ev.start.date,
                end: ev.end.dateTime || ev.end.date,
                location: ev.location || undefined,
                attendees: ev.attendees?.map((a) => a.displayName || a.email),
              })),
            },
          };
        } catch (apiError) {
          const errMsg = apiError instanceof Error ? apiError.message : 'Unknown API error';
          if (errMsg.includes('TOKEN_REFRESH_FAILED')) {
            return {
              tool: 'get_calendar_events',
              status: 'error',
              message: 'GOOGLE_TOKEN_EXPIRED: Google token refresh failed. Ask the user to re-connect their Google account.',
            };
          }
          return {
            tool: 'get_calendar_events',
            status: 'error',
            message: `Calendar API error: ${errMsg}`,
          };
        }
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
// SYSTEM PROMPT — Context-Aware Agent Persona v3.0
// ═══════════════════════════════════════════════════════════════════════════════

// ملاحظة: الـ prompt مُختصر عمداً (lean) عشان الموديل المحلي (qwen3:4b على CPU) —
// الـ prompt الطويل بيبطّأ الـ prefill بشكل كبير. كل السلوكيات الأساسية محفوظة.
const ZAKI_SYSTEM_PROMPT = `أنت «زكي» — مساعد إنتاجية ذكي. رد دايماً بنفس لغة المستخدم (عربي/إنجليزي)، باختصار وبأسلوب عملي. أنت Agent تقدر تنفّذ أوامر فعلية عبر أدوات.

الأدوات المتاحة (استخدمها لما يلزم، وما تعرضش JSON أو IDs للمستخدم):
- create_task / update_task / delete_task / mark_task_done — إدارة المهام.
- analyze_and_reorder_tasks — لما المستخدم يقول "نظّم يومي" أو "رتّب مهامي".
- web_search — لما يسأل عن معلومات حديثة/أخبار أو شي مش متأكد منه؛ بعدها لخّص واذكر المصادر.
- scan_gmail_inbox / get_calendar_events — للإيميلات والمواعيد (لو Google متصل فقط).

قواعد:
- حوّل التواريخ النسبية (بكرة/اليوم/الأسبوع الجاي) لتواريخ ISO حسب تاريخ النهاردة المعطى في السياق.
- استخدم الـ IDs الموجودة في السياق عند التعديل/الحذف/الإكمال — من غير ما تسأل المستخدم يعدّد مهامه.
- لو أداة Google رجعت GOOGLE_NOT_CONNECTED قول له يربط حسابه من لوحة Integrations.
- بعد تنفيذ أداة، أكّد بإيجاز (مثال: "تمام، ضفت المهمة ✓"). أقصى إيموجي أو اتنين.
- "ملخص اليوم"/"daily brief"/"صباح الخير" → ادمج المهام العاجلة + get_calendar_events + scan_gmail_inbox في ملخص قصير منظّم.`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER — Rich state injection (tasks + Google status)
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

  // Fetch top pending tasks (محدود عشان سرعة الموديل المحلي)
  const pendingTasks = await db.task.findMany({
    where: { userId, status: 'pending' },
    orderBy: { aiScore: 'desc' },
    take: 12,
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

  // ─── Check Google connection status ──────────────────────────────────────
  let googleStatus = 'NOT_CONNECTED';
  try {
    const oauth = await getOAuthStatus();
    googleStatus = oauth.connected
      ? `CONNECTED (scopes: ${oauth.scopes.filter(s => s.includes('gmail') || s.includes('calendar')).join(', ')})`
      : 'NOT_CONNECTED';
  } catch {
    googleStatus = 'ERROR_CHECKING';
  }

  // Build compact task list for the LLM (مختصر عشان سرعة الموديل المحلي)
  const taskLines = pendingTasks
    .map((task: TaskRow) => {
      const daysUntil = computeDaysUntilDue(task.dueDatetime?.toISOString() || null);
      const dueStr = task.dueDatetime
        ? new Date(task.dueDatetime).toLocaleDateString('en-CA')
        : 'no-due';
      const overdueFlag = daysUntil !== null && daysUntil < 0 ? ' OVERDUE' : '';
      return `- [${task.id}] ${task.title.replace(/"/g, "'")} | ${task.priority} | ${dueStr}${overdueFlag}`;
    })
    .join('\n');

  const context = `[السياق] التاريخ: ${todayStr} (${now.toLocaleDateString('ar-EG', { weekday: 'long' })}) | المعلّقة: ${pendingTasks.length} | المتأخرة: ${overdueCount} | المنجزة اليوم: ${doneToday} | Google: ${googleStatus}

المهام المعلّقة (الأعلى أولوية، استخدم الـ ID عند التعديل):
${taskLines || '(لا توجد مهام معلّقة)'}`;

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER — Full Agent Loop
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getUserId();
    if (!sessionUserId) return unauthorized();

    // rate limit لكل مستخدم
    const rl = checkRateLimit(sessionUserId);
    if (!rl.ok) {
      return NextResponse.json(
        { reply: `وصلت الحد الأقصى للرسائل (${rl.limit}/ساعة). جرّب تاني بعد ${Math.ceil((rl.retryAfterSec || 0) / 60)} دقيقة.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { messages } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // userId من الجلسة فقط (العميل ممنوع يحدده)
    const taskUserId = sessionUserId;

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

    // ─── Step 2: Agent Loop (max 4 rounds — increased for Daily Brief multi-tool) ──
    const MAX_AGENT_ROUNDS = 4;
    let allToolResults: ToolCallResult[] = [];
    let finalReply = '';
    let currentMessages = [...chatMessages];

    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      let completion;
      try {
        // Primary path — call the AI provider with tools (OpenAI-compatible)
        completion = await chatCompletion({
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: round === 0 ? 'auto' : 'none',
        });
      } catch (fallbackErr) {
        console.error('LLM call failed:', fallbackErr);
        finalReply = finalReply || '[ERR] فشل الاتصال — حاول تاني';
        break;
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

          // Execute the tool (Prisma + Google APIs)
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
          const followUpCompletion = await chatCompletion({
            messages: messagesWithToolResults,
            tools: TOOLS,
          });

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
