# Task 2-c: Habit Tracking UI

## Summary
Created complete Habit Tracking UI components for the Zaki app, including React Query hooks, API integration, and two main components (HabitCard and HabitList).

## Files Created/Modified

### New Files
- `/src/hooks/useHabits.ts` — 5 React Query hooks (useHabits, useCreateHabit, useDeleteHabit, useToggleHabit, useHabitLogs)
- `/src/components/habits/HabitCard.tsx` — Individual habit card with colored border, streak, mini heatmap, toggle
- `/src/components/habits/HabitList.tsx` — Main habits list with add dialog, empty state

### Modified Files
- `/src/lib/api.ts` — Added 5 habit API functions (getHabits, createHabit, deleteHabit, toggleHabit, getHabitLogs)
- `/src/types/index.ts` — Added CreateHabitInput interface

### API Routes (already existed from Task 2-a, verified working)
- `GET /api/habits` — List habits with streak + weekLogs enrichment
- `POST /api/habits` — Create habit
- `DELETE /api/habits/[id]` — Delete habit
- `POST /api/habits/[id]/toggle` — Toggle today's completion
- `GET /api/habits/[id]/logs` — Get logs for N days

## Component Design
- **HabitCard**: framer-motion hover animation, colored right border (RTL), emoji icon, streak badge with 🔥, 7-day mini heatmap (green/gray squares), toggle button (green circle when done), delete on hover
- **HabitList**: Header with add button, add dialog (name, description, 12-emoji icon picker, 6-color picker, daily/weekly frequency select), empty state with 🌿 icon
- All components use RTL layout, Koala dark theme, shadcn/ui components

## Lint
- ESLint passes with no errors
