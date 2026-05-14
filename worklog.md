# Zaki Project Worklog

## Task 2-a: Backend API Developer
- **Status**: ✅ COMPLETED
- **Date**: 2026-05-14
- **Details**: See `/home/z/my-project/agent-ctx/2-a-backend-api-developer.md`

### Created Files
- `src/lib/task-utils.ts` - Shared task utility functions (computeAiScore, computeDaysUntilDue, computePressureLevel, enrichTask)
- `src/app/api/tasks/route.ts` - GET (list/filter/sort) + POST (create with aiScore)
- `src/app/api/tasks/today/route.ts` - GET today + overdue tasks
- `src/app/api/tasks/overdue/route.ts` - GET overdue tasks
- `src/app/api/tasks/heatmap/route.ts` - GET yearly heatmap data
- `src/app/api/tasks/day-detail/route.ts` - GET day detail with tasks
- `src/app/api/tasks/weekly-score/route.ts` - GET weekly comparison
- `src/app/api/tasks/[id]/route.ts` - GET/PATCH/DELETE single task
- `src/app/api/tasks/[id]/complete/route.ts` - POST mark task done
- `src/app/api/chat/route.ts` - POST chat with Zaki AI (z-ai-web-dev-sdk)
- `src/app/api/chat/generate-day-summary/route.ts` - POST generate AI day summary

### Key Decisions
- Shared utility module (`task-utils.ts`) for aiScore computation, pressure level, and task enrichment
- Default user ID constant for all endpoints
- Next.js 16 route handler pattern with `params: Promise<{ id: string }>` for dynamic routes
- z-ai-web-dev-sdk used for LLM integration in chat and day summary endpoints

## Task 2-b: Frontend Developer
- **Status**: ✅ COMPLETED
- **Date**: 2026-05-14
- **Details**: See `/home/z/my-project/agent-ctx/2-b-frontend-developer.md`

### Created Files
- `src/components/QueryProvider.tsx` - React Query provider wrapper
- `src/components/WeeklyScore.tsx` - Weekly productivity score widget with circular progress
- `src/components/TaskList.tsx` - Main task list with tabs, filters, complete/delete actions
- `src/components/AddTaskDialog.tsx` - Dialog for adding new tasks (quick-add + detailed mode)
- `src/components/YearlyHeatmap.tsx` - GitHub-style yearly activity heatmap
- `src/components/DayDetailModal.tsx` - Day detail modal with AI summary generation
- `src/components/ChatPanel.tsx` - AI chat panel with message bubbles and suggestions
- `src/app/layout.tsx` - Updated with Cairo font, RTL, Arabic lang, QueryProvider
- `src/app/globals.css` - Updated font-sans to Cairo, added RTL scrollbar styles
- `src/app/page.tsx` - Main dashboard page with grid layout

### Key Decisions
- Cairo font (Google Fonts) with Arabic subset for all text
- RTL layout with `dir="rtl"` and `lang="ar"` on html element
- Purple (#purple-600) primary accent, emerald for success, amber for warnings
- All UI labels in Arabic (Egyptian dialect where appropriate)
- @tanstack/react-query for all data fetching with 30s staleTime
- Quick-add mode in AddTaskDialog with expandable details

---
Task ID: 3
Agent: Main Orchestrator
Task: Fix z-ai-web-dev-sdk compatibility and finalize the application

Work Log:
- Fixed chat/route.ts: Changed 'system' role to 'assistant' for z-ai-web-dev-sdk compatibility
- Fixed generate-day-summary/route.ts: Changed 'system' role to 'assistant' for same reason
- Verified all API endpoints return 200 status
- Verified lint passes clean with no errors
- Verified dev server is running and serving the app correctly

Stage Summary:
- All 10 API routes are functional and serving correctly
- All 8 frontend components are built and integrated
- LLM integration uses z-ai-web-dev-sdk correctly with 'assistant' role for system prompts
- Application is fully functional with RTL Arabic UI, Cairo font, and purple accent colors

---
Task ID: 4
Agent: Main Orchestrator
Task: Implement Cyberpunk Dark Mode + Technical AI Persona

Work Log:
- Updated globals.css: Complete dark theme with cyberpunk CSS variables (neon green #00ff88, cyber pink #ff00aa, cyber yellow #ffe600), custom neon-glow utilities, scanline overlay, dark scrollbars
- Updated layout.tsx: Added `className="dark"` to html, JetBrains Mono for monospace, dark body
- Updated page.tsx: Dark background with scanline overlay, neon header with Terminal icon, cyberpunk branding
- Updated TaskList.tsx: Neon green accents, dark card backgrounds, terminal-style empty states, neon category badges, dark delete confirmation
- Updated ChatPanel.tsx: Terminal aesthetic, neon green bot icons, monospace message content, dark input styling, technical suggestion chips
- Updated YearlyHeatmap.tsx: Neon green heatmap levels (0-4 opacity), dark cell backgrounds, neon ring on today, dark tooltips
- Updated WeeklyScore.tsx: Neon green progress ring with glow, dark card, Cpu icon, monospace percentages
- Updated DayDetailModal.tsx: Dark dialog, neon stat cards, terminal-style task list, neon AI summary section
- Updated AddTaskDialog.tsx: Dark dialog, neon green accent button, dark form inputs, terminal-style expand button
- Updated /api/chat/route.ts: Technical developer persona system prompt, infrastructure/security task prioritization, terminal-style response format
- Updated /api/chat/generate-day-summary/route.ts: Analytical/log-style summary format, technical language, DAY ANALYSIS format

Stage Summary:
- Complete Cyberpunk/Hacker dark theme with neon green (#00ff88) as primary accent
- All 8 components restyled for dark mode with high-contrast neon colors
- Custom CSS utilities: neon-glow, neon-border-glow, cyber-scanline
- AI persona upgraded to v2.0 — technical, developer-focused, terminal-style output
- Technical task recognition: infrastructure=urgent, security=urgent, server=high, backend=high
- Lint passes clean, all API endpoints return 200

---
Task ID: 5
Agent: Main Orchestrator
Task: UI Layout Restructure + Pomodoro Timer + AI Function Calling

Work Log:
- Restructured page.tsx: Sidebar + Main Canvas layout with collapsible ChatPanel (right side)
- ChatPanel becomes a 380px collapsible sidebar with toggle button in header
- Main Canvas shows PomodoroTimer + Tabbed view (Tasks/Heatmap)
- Created PomodoroTimer.tsx: 25-min focus + 5-min break timer with circular progress
- PomodoroTimer supports attaching a task, prompts to mark done on focus complete
- PomodoroTimer updates browser title with countdown while running
- Upgraded /api/chat/route.ts with OpenAI-style function calling (tools parameter)
- Defined 4 tools: create_task, update_task, delete_task, mark_task_done
- Implemented server-side tool execution engine that maps tool calls to Prisma ORM operations
- Added hybrid fallback: if tools parameter not supported, uses prompt-based action extraction
- ChatPanel updated: shows tool call indicators (wrench icon + OK/ERR badges) for executed tools
- ChatPanel invalidates React Query cache (tasks, heatmap, weekly-score) when tools mutate data
- Tested all 4 tools: create_task ✓, update_task ✓, mark_task_done ✓, delete_task ✓

Stage Summary:
- New layout: Sidebar + Main Canvas with collapsible AI chat panel
- New component: PomodoroTimer with task attachment and completion prompts
- AI function calling: 4 tools (create/update/delete/mark_done) working via OpenAI-compatible tools API
- Hybrid fallback mechanism ensures tools work even if backend doesn't support tools parameter
- Tool call indicators in ChatPanel show real-time feedback for AI actions
- React Query cache invalidation ensures UI updates instantly after tool mutations
- Lint passes clean, all endpoints returning 200

---
Task ID: 6
Agent: Main Orchestrator
Task: Zen Light Mode + Pomodoro Redesign + Fluid Task Logic + Theme System

Work Log:
- Installed next-themes and framer-motion packages
- Rewrote globals.css: Dual theme system with CSS variables
  - Light mode (default): Off-white #FDFCF8 bg, white cards with shadow-sm, slate-800 text, teal #0d9488 accent
  - Dark mode (.dark): Cyberpunk neon green #00ff88, dark backgrounds, glow effects
  - All glow/scanline effects scoped to .dark class only
  - Added accent-brand-glow CSS class (dark-mode-only SVG drop-shadow)
  - Smooth theme transitions on bg, border, color properties
- Updated layout.tsx: Added ThemeProvider from next-themes, removed hardcoded dark class
- Created ThemeToggle.tsx: Sun/Moon toggle button in header
- Redesigned PomodoroTimer.tsx: Horizontal pill widget instead of large card
  - Compact layout: mode badge + timer display + mini progress bar + controls + task attachment
  - Takes minimal vertical space, sits above task filters
- Updated page.tsx: Added ThemeToggle, sidebar uses bg-sidebar for depth, cleaner tab styling
- Updated TaskList.tsx with major UX improvements:
  - Inline editing: Click task title → turns into input field, Enter to save, Escape to cancel
  - updateTaskMutation using PATCH /api/tasks/[id]
  - framer-motion AnimatePresence for task add/remove/complete animations
  - Task cards with hover:-translate-y-0.5 hover:shadow-md for lift effect
  - Rounded-xl cards instead of flat rows
  - Pencil icon appears on hover for edit hint
- Updated all 8 components for dual-theme support:
  - Replaced text-neon/bg-neon with text-accent-brand/bg-accent-brand throughout
  - Replaced neon-glow-subtle with text-accent-brand (glow only in dark mode)
  - Replaced text-slate-200/300 with text-foreground
  - All components use CSS variable-backed tokens that auto-switch themes
- Verified lint passes clean, all API endpoints return 200
- Tested: inline editing API, chat tool calling, theme toggle

Stage Summary:
- Dual theme system: Zen Light (off-white/cream + teal) and Cyberpunk Dark (neon green)
- next-themes integration with smooth Sun/Moon toggle
- Pomodoro redesigned as sleek horizontal pill widget
- Task inline editing with PATCH API + React Query invalidation
- framer-motion animations for task list (slide, fade, scale)
- Interactive card-style task items with hover lift effect
- All components work seamlessly in both themes

---
Task ID: 7
Agent: Main Orchestrator
Task: Deep Agent Integration — Context Injection, Agent Loop, analyze_and_reorder, Processing Indicator

Work Log:
- Rewrote /api/chat/route.ts with 4 major improvements:
  1. Rich Context Injection (buildSystemContext function):
     - Fetches pending tasks, today's done count, overdue count
     - Injects structured system state with date, counts, and full task JSON
     - AI "sees" the database state before responding — no need to ask user
  2. Perfect Agent Loop (3-round max):
     - LLM decides tool call → execute Prisma → feed result back to LLM → LLM generates final response
     - Supports multi-tool calls in a single message
     - Handles LLM requesting additional tool calls after seeing results
     - Proper tool result → LLM follow-up cycle with full data return
  3. New tool: analyze_and_reorder_tasks:
     - Accepts array of {id, priority, reason} updates
     - Batch updates priority + ai_score for multiple tasks in one call
     - Returns detailed results with old→new priority for each task
     - Triggers on "نظّم مهامي" / "organize my day" / "prioritize"
  4. Enhanced system prompt with explicit agent capabilities description
- Upgraded ChatPanel.tsx with real-time processing indicators:
  - agentPhase state: idle → thinking → executing → responding → idle
  - "زكي بيحدّث قاعدة البيانات..." indicator with Database icon + spinner
  - THINKING/EXECUTING/RESPONDING badge in header during agent phases
  - Strict cache invalidation: invalidate + refetch after tool execution
  - Updated suggestion chips to include "نظّم مهامي حسب الأولوية"
- Fixed template literal syntax error in context builder
- Tested all 5 tools: create_task ✓, update_task ✓, mark_task_done ✓, delete_task ✓, analyze_and_reorder_tasks ✓
- Tested context-aware queries: "إيه اللي عندي النهارده؟" returns full day overview from injected context
- Lint passes clean, all endpoints returning 200

Stage Summary:
- AI is now a true context-aware agent that "sees" database state before responding
- Full agent loop: LLM → tool call → Prisma execute → result → LLM final response
- 5 tools operational including new analyze_and_reorder_tasks for batch re-prioritization
- ChatPanel shows real-time agent phase indicators (thinking/executing/responding)
- "زكي بيحدّث قاعدة البيانات..." visual feedback during tool execution
- Strict React Query invalidation + refetch for instant UI sync

---
Task ID: 8
Agent: Main Orchestrator
Task: Phase 3 — Google OAuth2 Integration (Gmail + Calendar)

Work Log:
- Installed googleapis@171.4.0 package
- Updated .env with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI placeholders
- Added OAuthConfig model to Prisma schema (userId, provider, accessToken, refreshToken, expiryDate, scopes)
- Added oAuthConfigs relation to User model
- Ran prisma db push + prisma generate to sync schema
- Created /api/auth/google/login/route.ts: Generates Google authorization URL with Gmail readonly + Calendar events readonly scopes, access_type=offline, prompt=consent
- Created /api/auth/google/callback/route.ts: Exchanges auth code for tokens, upserts into OAuthConfig model, redirects back to app with success/error params
- Created /api/auth/google/disconnect/route.ts: Revokes token at Google + deletes OAuthConfig record from DB
- Created src/lib/googleApi.ts with full service library:
  - getAuthenticatedClient(): Retrieves tokens from Prisma, auto-refreshes expired access tokens, updates DB with new tokens
  - getOAuthStatus(): Returns connection status, scopes, expiry info
  - GmailService.scanInbox(query, maxResults): Gmail API message list + metadata fetch (from, subject, date, snippet)
  - GmailService.getMessage(id): Full email body extraction with base64 decoding
  - CalendarService.getTodayEvents(): Today's calendar events with attendees, location, time
  - CalendarService.getEventsByRange(start, end): Arbitrary date range events
- Created /api/integrations/status/route.ts: GET endpoint returning OAuth status
- Created /api/integrations/test/gmail/route.ts: Test endpoint calling GmailService.scanInbox
- Created /api/integrations/test/calendar/route.ts: Test endpoint calling CalendarService.getTodayEvents
- Created src/components/IntegrationsPanel.tsx: Collapsible UI widget showing Google connection status, connect/disconnect buttons, Gmail/Calendar test buttons with results display
- Updated src/app/page.tsx: Integrated IntegrationsPanel next to tab switcher, added OAuth callback toast notifications (success/error), version bumped to v3.0
- Verified all endpoints: status → 200 ✓, login → 500 (no creds) ✓, gmail test → 401 (not connected) ✓, calendar test → 401 (not connected) ✓
- Lint passes clean

Stage Summary:
- Complete Google OAuth2 flow implemented: login → consent → callback → token storage
- OAuthConfig Prisma model stores access_token, refresh_token, expiry_date, scopes per user
- Automatic token refresh: expired access tokens are refreshed transparently before API calls
- GmailService: inbox scanning with query support + full message body extraction
- CalendarService: today's events + date range queries with attendee/location data
- Disconnect endpoint: revokes Google tokens + cleans up DB
- IntegrationsPanel UI: collapsible widget with connection status, connect/disconnect, test buttons
- OAuth callback redirects show toast notifications (success/error) on return
- All endpoints return proper error responses when Google not configured/connected
- ⚠️ User must provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env before testing OAuth flow

---
Task ID: 9
Agent: Main Orchestrator
Task: Bind Zaki AI Agent to Google Tools (Gmail + Calendar) — Phase 3b

Work Log:
- Added 2 new tool definitions to TOOLS array in /api/chat/route.ts:
  - scan_gmail_inbox(query, maxResults): Gmail inbox scanning with search syntax support
  - get_calendar_events(): Today's Google Calendar events with attendees/location
- Added tool execution logic for both Google tools in executeTool function:
  - Both tools check getOAuthStatus() first before calling Google APIs
  - Returns GOOGLE_NOT_CONNECTED error if OAuth not set up, prompting AI to tell user to connect
  - Returns GOOGLE_TOKEN_EXPIRED error if refresh fails
  - Gmail: calls GmailService.scanInbox() with query and maxResults params
  - Calendar: calls CalendarService.getTodayEvents() with event details mapping
  - Proper error handling for API failures with user-friendly messages
- Updated ZAKI_SYSTEM_PROMPT to v3.0 with comprehensive Google integration instructions:
  - 7 tools documented (5 task + 2 Google)
  - Rules for when to use scan_gmail_inbox and get_calendar_events
  - Auto-suggestion to create tasks from actionable emails (e.g., "Reply by Friday" → create_task)
  - GOOGLE_NOT_CONNECTED / GOOGLE_TOKEN_EXPIRED handling instructions
  - Complete Daily Brief workflow: combine tasks + calendar + emails into one summary
  - Daily Brief format template with sections for tasks, calendar, emails, and recommendations
- Updated buildSystemContext() to include Google connection status:
  - Fetches OAuth status via getOAuthStatus()
  - Injects Google: CONNECTED/NOT_CONNECTED into system state box
  - Includes instructions about when Google tools can/cannot be used
- Increased agent loop max rounds from 3 to 4 (Daily Brief needs multi-tool calls)
- Updated ChatPanel.tsx:
  - Version badge: v3.0 // Agent+Google
  - New suggestion chips: "اعملي ملخص لليوم 🌅", "إيه الإيميلات الجديدة النهارده؟", "عندي مواعيد إيه النهارده؟"
  - Tool call indicators now show Mail icon for Gmail, Calendar icon for Calendar (instead of generic Wrench)
  - Tool names displayed as "Gmail" / "Calendar" for Google tools
  - Added oauth-status to cache invalidation list
  - Updated welcome text: "Agent ذكي + Gmail + Calendar"
- Tested all scenarios:
  - "اعملي ملخص لليوم" → Full Daily Brief with task list, Google not connected warning ✓
  - "إيه الإيميلات الجديدة النهارده؟" → AI correctly detects Google not connected ✓
  - "ضيف مهمة مراجعة الإيميلات" → create_task still works with tool call result ✓
- Lint passes clean

Stage Summary:
- Zaki AI Agent now has 7 tools: 5 task management + 2 Google integration
- Daily Brief workflow: tasks + calendar + emails combined into structured summary
- AI automatically suggests creating tasks from actionable emails
- Google connection status injected into every chat context
- Graceful error handling: GOOGLE_NOT_CONNECTED → user guidance, TOKEN_EXPIRED → re-auth prompt
- ChatPanel shows specialized icons for Gmail/Calendar tool calls
- Agent loop increased to 4 rounds for multi-tool Daily Brief scenarios

---
Task ID: 10
Agent: Main Orchestrator
Task: Fix Light Mode (Zen Mode) Contrast — CSS Variables + Component Audit

Work Log:
- Fixed globals.css `:root` (light mode) CSS variables for dramatically better contrast:
  - `--foreground`: #1e293b → #0f172a (slate-900, near-black for max readability)
  - `--card-foreground`: #1e293b → #0f172a
  - `--popover-foreground`: #1e293b → #0f172a
  - `--muted-foreground`: #94a3b8 → #475569 (slate-400→slate-600, CRITICAL FIX — was nearly invisible on white)
  - `--accent-brand`: #0d9488 → #0f766e (teal-500→teal-700, deeper for better contrast on white)
  - `--accent-brand-dim`: #0f766e → #115e59 (teal-700→teal-800)
  - `--primary`: #0d9488 → #0f766e (in sync with accent-brand)
  - `--border`: #e7e5e0 → #cbd5e1 (slate-300, clearly visible card/input borders)
  - `--input`: #f1f0eb → #e2e8f0 (slate-200, visible input borders)
  - `--ring`: #0d9488 → #0f766e
  - `--neon`: #0d9488 → #0f766e
  - `--neon-dim`: #0f766e → #115e59
  - `--cyber-yellow`: #f59e0b → #d97706 (amber-500→amber-700, more readable on white)
  - `--surface-alt`: #f5f5f0 → #f1f5f9 (slate-100, consistent with new border colors)
  - `--secondary`: #f5f5f0 → #f1f5f9
  - `--muted`: #f1f0eb → #f1f5f9
  - All sidebar variables updated to match new deeper values
  - All chart colors updated to match
- ChatPanel.tsx: Removed text-accent-brand/80 (was reducing contrast), changed to text-accent-brand. Bumped border opacities from /15,/20 to /25,/30 for visibility. Fixed OK/ERR badge backgrounds from /10 to /15.
- TaskList.tsx: Bumped category badge border opacities from /20 to /30. Fixed pressure colors: urgent now uses text-amber-700 (dark mode: cyber-yellow), overdue uses text-red-600 (dark: red-400). Added text-foreground + font-semibold to tab triggers for legibility.
- PomodoroTimer.tsx: Break mode now uses amber-100/amber-700 in light mode (dark: cyber-yellow). Timer digits: amber-700 light (dark: cyber-yellow). Progress bar: amber-500 light (dark: cyber-yellow). Play button: amber-500 light (dark: cyber-yellow). Break dialog button: amber-500 light.
- IntegrationsPanel.tsx: Bumped border opacities from /20 to /30. Badge backgrounds from /10 to /15. Refactored test result divs from template literals to className prop (fixed ESLint parsing error).
- WeeklyScore.tsx: Card border from /20 to /30. SVG ring track from /10 to /20.
- YearlyHeatmap.tsx: Heatmap level colors bumped: 0: /40→/50, 1: /10→/15, 2: /25→/30, 3: /50→/55, 4: /80→/85.
- DayDetailModal.tsx: Bumped border opacities. Productivity % now uses text-fuchsia-700 in light mode (dark: cyber-pink). Analyze button border from /30 to /40.
- AddTaskDialog.tsx: Submit button text-background → text-white (more reliable on teal bg).
- Verified `.dark` CSS variables completely untouched — all cyberpunk values preserved.
- Lint passes clean, dev server running.

Stage Summary:
- Light mode contrast dramatically improved: deep slate text, proper muted-foreground, stronger teal accent, visible borders
- The #1 critical fix: muted-foreground went from #94a3b8 (invisible on white) to #475569 (clearly readable)
- Accent brand deepened from teal-500 to teal-700 for crisp contrast against white cards
- Border color darkened from warm-gray to slate-300 for clear card/input definition
- All "yellow" accents now use amber-700/amber-500 in light mode (cyber-yellow reserved for dark mode)
- Zero changes to dark mode — cyberpunk aesthetic preserved exactly

---
Task ID: 11
Agent: Main Orchestrator
Task: Zaki v0 Redesign — Koala Neovim dark-only palette, Linear/Raycast aesthetic, complete component restructure

Work Log:
- Complete visual redesign: removed light mode entirely, Koala Neovim palette only
- Rewrote globals.css with full Koala color system mapped to both CSS variables and @theme tokens
  - Backgrounds: base #1a1a2e, surface #16213e, elevated #0f3460, hover #1e2a4a
  - Text: primary #a9b1d6, secondary #565f89, muted #3b4261, bright #c0caf5
  - Accents: coral #e94560, blue #7aa2f7, purple #bb9af7, teal #73daca, yellow #e0af68, orange #ff9e64, green #9ece6a
  - Borders: subtle #292e42, default #3b4261, strong #565f89
  - All shadcn/ui semantic variables remapped to Koala values
  - 4 minimal animations: check-in, dot-pulse, slide-up, shimmer
- Updated tailwind.config.ts with font families (Inter, Cairo, JetBrains Mono) and border radius
- Created types/index.ts with all shared TypeScript interfaces (Task, ChatMessage, HeatmapDay, Account, etc.)
- Created lib/auth.ts + lib/api.ts: auth helpers + complete API client with all existing endpoints
- Created 3 Zustand stores:
  - store/auth.ts: multi-account system with add/remove/switch/logout
  - store/ui.ts: sidebar, heatmap, chat, day detail state
  - store/tasks.ts: active filter, selected task
- Created 3 hooks:
  - hooks/useActiveAccount.ts: returns active account + initials + actions
  - hooks/useTasks.ts: useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask
  - hooks/useChat.ts: messages state + send function with React Query invalidation
- Built 5 ui-koala/ components: Skeleton, EmptyState, PriorityBorder
- Built 2 account/ components: AccountSwitcher (28px avatar + teal dot), AccountDropdown
- Built 5 tasks/ components: TaskRow, TaskFilters, AddTaskInput, AddTaskForm, TaskList
- Built 5 chat/ components: TypingIndicator, ChatMessage, ToolCallRow, ChatInput, ChatPanel
- Built 4 heatmap/ components: YearlyHeatmap, HeatmapGrid, DayDetailPanel, DayTaskList
- Rewrote layout.tsx: removed ThemeProvider, dark-only, Inter + Cairo + JetBrains Mono fonts
- Rewrote page.tsx: 3-state UI (empty/has-tasks/loading), sidebar + canvas layout, tab switcher
- Removed all old component files (PomodoroTimer, ThemeToggle, IntegrationsPanel, etc.)
- Lint passes clean, dev server returning 200

Stage Summary:
- Complete v0 redesign with Koala Neovim dark-only palette
- Linear.app / Raycast aesthetic: calm, typographic, minimal chrome
- Dark-only — no light mode toggle, no ThemeProvider
- Component architecture restructured into directories: chat/, tasks/, heatmap/, account/, ui-koala/
- All components under 150 lines, strict TypeScript, no any, no console.log
- RTL-compliant: ps-/pe- padding, scale-x-[-1] on directional icons
- Zustand stores for auth, ui, and tasks state
- Custom hooks wrapping React Query for tasks and chat
- Backend API endpoints unchanged — all existing routes still functional
