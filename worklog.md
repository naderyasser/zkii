---
Task ID: 1
Agent: main
Task: Fix EmptyState and AccountSwitcher import errors, enhance dashboard

Work Log:
- Fixed EmptyState named export → default export to match page.tsx import
- Fixed AccountSwitcher named export → default export to match page.tsx import
- Created IntegrationsPanel component (Google OAuth connect/disconnect UI)
- Created WeeklyScore component (weekly productivity comparison)
- Enhanced page.tsx: added chat toggle button, WeeklyScore, IntegrationsPanel
- Enhanced ChatPanel: wider sidebar (280px), better header with Sparkles icon, added "ملخص اليوم" suggestion
- Enhanced ChatInput: borderless input inside a bordered container with focus states
- Enhanced TaskFilters: pill-style tabs with icons (Inbox, Sun, AlertTriangle, CheckCircle2)
- Enhanced AddTaskInput: borderless input with calendar icon, better focus states
- Created sample tasks for demonstration
- Verified all APIs return 200 (tasks, weekly-score, integrations/status)
- ESLint passes with no errors

Stage Summary:
- App fully compiles and renders at GET / 200
- Dashboard shows: Chat sidebar + Task list + Weekly Score + Integrations Panel
- All components properly use Koala dark theme
- Chat panel has suggestions including "ملخص اليوم" for Daily Brief
- Google OAuth integration panel with connect/disconnect functionality

---
Task ID: 2
Agent: main
Task: Add 4 new features: Voice input, Focus Mode, Analytics Dashboard, Recurring Tasks

Work Log:
- Created ASR API route at /api/asr/route.ts using z-ai-web-dev-sdk
- Enhanced AddTaskInput with Mic button for voice recording (WebRTC → base64 → ASR API)
- Created FocusMode component at /components/focus/FocusMode.tsx (Pomodoro 25/5, progress ring, start/pause/reset/skip)
- Created AnalyticsDashboard at /components/analytics/AnalyticsDashboard.tsx (3 ECharts: weekly trend line, priority donut, category bars)
- Added "التحليلات" tab to page.tsx header
- Enhanced AddTaskForm with recurring task toggle + frequency picker (daily/weekdays/weekly/biweekly/monthly)
- Added recurring icon (Repeat) to TaskRow for recurring tasks
- Updated TaskRow with Zap (focus) button + onFocus prop
- Updated TaskList with onFocusTask prop
- Updated CreateTaskInput type with isRecurring + recurrenceRule fields
- Updated tasks API route to handle isRecurring + recurrenceRule in POST body
- All ESLint checks pass, all APIs return 200, page renders correctly

Stage Summary:
- 4 major features added: 🎤 Voice, ⏱️ Focus Mode, 📊 Analytics, 🔄 Recurring
- App now has 3 tabs: المهام, النشاط, التحليلات
- Focus mode accessible via Zap button on any pending task
- Voice recording uses browser MediaRecorder + ASR SDK
- Analytics shows 3 interactive ECharts with Koala dark theme
