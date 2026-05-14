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
