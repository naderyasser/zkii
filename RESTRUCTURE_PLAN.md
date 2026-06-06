# RESTRUCTURE_PLAN — تحويل «زكي» إلى Notion-like AI Workspace

> وثيقة حيّة تتتبّع إعادة الهيكلة على مراحل. تُحدَّث بعد كل مرحلة.
> **الهدف**: workspace شبيه بـ Notion (sidebar بشجرة صفحات، block editor، databases بعروض متعددة) + ذكاء محلي مجاني عبر Ollama (qwen3:4b) بدل API خارجي مدفوع.

## بيئة التشغيل (مرجع)
- Stack: Next.js 16.1 · React 19 · TS · Tailwind v4 · Shadcn/Radix · Prisma 6 + SQLite · Zustand 5 · TanStack Query 5 · @dnd-kit · ECharts/Recharts · googleapis · framer-motion.
- Runtime: Node 20.19 · Bun 1.3.13. Prod port **1111** خلف Caddy على `zakii.educore.software`.
- VPS: 15GB RAM (~6GB متاح) · 4 cores · 33GB قرص حر · **swap=0** (سنضيف 8GB) · Ollama غير مثبّت.
- single-user: `DEFAULT_USER_ID='cmp4wfs1q0000jkubmtfn4mhc'` (`src/lib/task-utils.ts`).

## قرارات مؤكَّدة
1. الموديل: **qwen3:4b** (~3GB) + 8GB swap.
2. Fallback: محلي أولاً → API خارجي تلقائياً عند الفشل (عبر `AI_FALLBACK_*`).
3. التنفيذ: **checkpoint بعد المرحلة 1**، ثم 2→9 متواصلة. deprecation لا deletion.

---

## (أ) موديلات Prisma الحالية (`prisma/schema.prisma`)
| Model | ملاحظات رئيسية |
|---|---|
| **User** | id, email(unique), name; علاقات: tasks, dayLogs, emailSuggestions, oAuthConfigs, tags, projects, habits |
| **Task** | title, notes, category, priority, status, dueDatetime, completedAt, isRecurring, recurrenceRule, source, aiScore, boardColumn(todo/in_progress/review/done), projectId? |
| **DayLog** | date(YYYY-MM-DD), summary(AI), totalTasks, completedTasks, productivityScore; unique(userId,date) |
| **DayLogTask** | junction DayLog↔Task |
| **EmailSuggestion** | emailId(unique), sender, subject, actionDetected, suggestedTitle/Priority, confirmed? |
| **OAuthConfig** | userId(unique), provider, accessToken, refreshToken, expiryDate, scopes |
| **Tag** | name, color; unique(userId,name) |
| **TagTask** | junction Tag↔Task |
| **Project** | name, description, color, icon; unique(userId,name) |
| **Habit** | name, description, icon, color, frequency, targetCount |
| **HabitLog** | date(YYYY-MM-DD), count; unique(habitId,date) |

**جداول جديدة (المرحلة 2)**: `Page` (شجرة + content BlockNote JSON + archivedAt soft-delete) · `Database` (properties/views JSON) · `Row` (properties JSON + pageId?).

## (ب) API endpoints الحالية
- **tasks**: `GET/POST /tasks`، `GET/PATCH/DELETE /tasks/[id]`، `POST /tasks/[id]/complete`، `GET/POST/DELETE /tasks/[id]/tags`، و `GET` لـ `today`، `overdue`، `kanban`، `heatmap`، `weekly-score`، `day-detail`.
- **habits**: `GET/POST /habits`، `DELETE /habits/[id]`، `GET /habits/[id]/logs`، `POST /habits/[id]/toggle`.
- **projects**: `GET/POST /projects`، `PATCH/DELETE /projects/[id]`.
- **tags**: `GET/POST /tags`، `DELETE /tags/[id]`.
- **chat (AI)**: `POST /chat` (agent loop، 8 tools)، `POST /chat/generate-day-summary`.
- **misc**: `GET /export` (CSV)، `POST /web-search`، `POST /asr`، `POST /motivation`، `GET /auth/google/{login,callback}` + `POST /auth/google/disconnect`، `GET /integrations/status`، `GET /api` (health).

**endpoints جديدة (المرحلة 2)**: `pages/**` (CRUD + move + restore)، `databases/[id]/**` (+ rows).

## (ج) Features الحالية → مكانها الجديد
| القديم | الجديد (Notion-like) |
|---|---|
| تبويب المهام (TaskList) | database «📋 المهام» (Table/Kanban/Calendar/List) |
| Kanban (KanbanBoard + @dnd-kit) | عرض Kanban داخل DatabaseView (إعادة استخدام) |
| العادات (HabitList) | database «🔁 العادات» |
| المشاريع (ProjectList) | database «📁 المشاريع» |
| Pomodoro (FocusMode) | صفحة «🎯 التركيز» |
| heatmap (YearlyHeatmap) + تحليلات (AnalyticsDashboard) | صفحة «📊 التحليلات» |
| شات (ChatPanel) | صفحة «💬 شات زكي» + سياق الصفحة |
| التبويبات في الهيدر | **sidebar بشجرة صفحات** (يمين/RTL) + routing `/p/[pageId]` |

## (د) خريطة الذكاء (المرحلة 1)
- `src/lib/ai.ts` = نقطة موحّدة. تعديلات: timeout 60s→180s · `chatCompletionStream()` (SSE) · `stripThink()` لإزالة `<think>…</think>` · auto-fallback لـ `AI_FALLBACK_*`.
- `.env`: `AI_BASE_URL=http://127.0.0.1:11434/v1`, `AI_API_KEY=ollama`, `AI_MODEL=qwen3:4b`, + `AI_FALLBACK_{BASE_URL,API_KEY,MODEL}`.
- `src/app/api/chat/route.ts`: مسار JSON-structured-output كـ fallback لو tool-calling غير مستقر مع الموديل الصغير.

---

## حالة المراحل
- [x] **0 — Audit + baseline**: build ✓ / lint ✓ نظيفان. هذه الوثيقة مكتوبة.
- [x] **1 — Ollama + qwen3:4b-instruct + ai.ts** (CHECKPOINT ✓ مُتحقَّق):
  - swap 8GB مُفعّل + persistent (fstab) · vm.swappiness=10.
  - Ollama 0.30.6 مثبّت، systemd override (localhost · ctx 8192 · keepalive 30m).
  - الموديل: **qwen3:4b-instruct** (non-thinking 2507) — الأصلي `qwen3:4b` كان hybrid بيفكّر كتير وبطيء على CPU، فاتشال.
  - `ai.ts`: timeout 180s · `chatCompletionStream()` (SSE) · `stripThink()` · fallback تلقائي لـ `AI_FALLBACK_*`.
  - الـ system prompt + context في `chat/route.ts` اتقلّلوا من ~4800 → ~400 توكن (CPU prefill كان ~178s).
  - **تحقّق E2E**: شات بسيط 42s · tool-calling بينشئ مهمة فعلياً في DB 39s · عربي سليم · بدون أي API خارجي.
- [x] 2 — Data model (Page/Database/Row) + API ✓:
  - Prisma: Page/Database/Row مضافة، الجداول القديمة سليمة. `db push` نجح (additive).
  - `src/lib/notion.ts`: أنواع PropertyDef/ViewDef + serializers + buildTree + defaults.
  - API: `pages` (GET tree/flat/trash, POST) · `pages/[id]` (GET/PATCH/DELETE=archive recursive، ?hard=1) · `pages/[id]/move` (reparent+reorder + حماية دوائر) · `pages/[id]/restore` · `databases/[id]` (GET+rows, PATCH) · `databases/[id]/rows` (GET/POST) · `rows/[id]` (PATCH merge, DELETE).
  - **تحقّق curl 10/10** (صفحة/فرعية/database، row create+merge، tree، move، دائرة 400، archive+trash+restore، cleanup).
- [ ] 3 — Layout + Sidebar (شجرة صفحات)
- [ ] 4 — Block editor (BlockNote) + أوامر /زكي
- [ ] 5 — Databases بعروض متعددة
- [ ] 6 — Migration للبيانات القديمة
- [ ] 7 — بحث + اختصارات + سياق الصفحة
- [ ] 8 — Polish
- [ ] 9 — Deployment

## Smoke Tests النهائية (تُعلَّم في المرحلة 9)
- [ ] إنشاء صفحة + صفحة فرعية + سحبها في الشجرة
- [ ] كتابة blocks + slash menu + حفظ تلقائي يثبت بعد refresh
- [ ] أمر `/زكي` يكمّل الكتابة بـ streaming من الموديل المحلي
- [ ] database المهام: Table + Kanban + Calendar شغّالين والبيانات القديمة ظاهرة
- [ ] Cmd+K يلاقي صفحة بالاسم وبالمحتوى
- [ ] سلة المهملات: أرشفة + استعادة
- [ ] الموقع HTTPS على الدومين + الموديل يرد بدون أي مفتاح خارجي
