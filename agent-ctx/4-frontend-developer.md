# Task 4: Smart Notifications — Overdue + Due-Today Alerts

## Agent: frontend-developer

## Summary
Built a complete smart notification system for the Zaki productivity app that checks for overdue and due-today tasks, shows toast alerts, and provides a bell icon with dropdown panel.

## Files Created
1. **`/home/z/my-project/src/store/notifications.ts`** — Zustand store with notification state management (notifications list, unread count, open state, mark read, mark all read, clear all)
2. **`/home/z/my-project/src/components/notifications/NotificationBell.tsx`** — Bell icon with coral badge showing unread count, wrapped in shadcn Popover for dropdown toggle
3. **`/home/z/my-project/src/components/notifications/NotificationPanel.tsx`** — RTL dropdown panel showing notification list with type-specific icons/colors, priority dots, Arabic context labels, mark all read & clear all buttons, empty state
4. **`/home/z/my-project/src/hooks/useNotifications.ts`** — Hook that fetches from `/api/tasks/overdue` and `/api/tasks/today`, converts to Notification objects, updates store, runs on mount + every 5 min, shows toast for new overdue items

## Files Modified
1. **`/home/z/my-project/src/app/page.tsx`** — Added `useNotifications()` hook call and `<NotificationBell />` component in the header

## Design Decisions
- **Color coding**: overdue=coral (#e94560), due_today=koala-orange (#ff9e64), due_soon=koala-yellow (#e0af68)
- **Deduplication**: Overdue tasks are also returned by `/api/tasks/today`, so they're deduplicated before creating notifications
- **Read state preservation**: When re-fetching notifications, existing read states are preserved across refreshes
- **Toast only on new overdue**: First fetch is silent; subsequent polls show toasts only for newly overdue tasks (diffing against previous IDs)
- **RTL throughout**: All notification UI uses `dir="rtl"` with Arabic labels
- **Koala theme**: bg-elevated popover, bg-hover row hover, border-subtle separators

## API Routes Used (already existing)
- `GET /api/tasks/overdue` — returns pending tasks past their due date
- `GET /api/tasks/today` — returns pending tasks due today + overdue tasks

## Verification
- `bun run lint` — passes with no errors
- Dev server log shows successful `/api/tasks/overdue` and `/api/tasks/today` calls with 200 responses
