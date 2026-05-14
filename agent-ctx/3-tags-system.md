# Task 3 — Tags System

## Agent: Tags System Builder
## Status: ✅ Complete

## Summary
Built the complete 🏷️ Tags system for the Zaki productivity app, including Prisma models, API routes, UI components, API client functions, and React hooks.

## Files Created / Modified

### Prisma Schema (`prisma/schema.prisma`)
- Added `Tag` model with `id`, `userId`, `name`, `color` (default `#7aa2f7`), `createdAt`, and `tasks` relation
- Added `TagTask` join model with `id`, `tagId`, `taskId`, and composite unique constraint `@@unique([tagId, taskId])`
- Added `tags Tag[]` relation to User model
- Added `tags TagTask[]` relation to Task model
- Ran `bun run db:push` — database synced successfully

### Types (`src/types/index.ts`)
- Added `Tag` interface: `{ id, userId, name, color, createdAt }`

### API Routes
1. **`/api/tags/route.ts`** — GET (list all tags for DEFAULT_USER_ID), POST (create tag with name + optional color)
2. **`/api/tags/[id]/route.ts`** — DELETE (delete tag by ID)
3. **`/api/tasks/[id]/tags/route.ts`** — GET (get tags for task), POST (add tag to task, body: { tagId }), DELETE (remove tag from task, body: { tagId })

### UI Components
1. **`src/components/tags/TagBadge.tsx`** — Colored pill badge with hex dot + name, optional removable X button, uses hex color at 10% opacity for bg
2. **`src/components/tags/TagPicker.tsx`** — Dropdown with search input, existing tags with colored dots, click to toggle, type to create new tag with cycling default colors, assigned tags summary at bottom

### API Client (`src/lib/api.ts`)
- Added: `getTags()`, `createTag()`, `deleteTag()`, `getTaskTags()`, `addTagToTask()`, `removeTagFromTask()`
- Added `Tag as TagType` to type imports

### React Hooks (`src/hooks/useTags.ts`)
- `useTags()` — query all tags
- `useCreateTag()` — create tag mutation
- `useDeleteTag()` — delete tag mutation
- `useTaskTags(taskId)` — query tags for a task
- `useAddTagToTask()` — add tag to task mutation
- `useRemoveTagFromTask()` — remove tag from task mutation

## Design Notes
- Koala theme default colors cycle: accent-blue (#7aa2f7), koala-purple (#bb9af7), koala-teal (#73daca), koala-yellow (#e0af68), koala-green (#9ece6a), coral (#e94560), koala-orange (#ff9e64)
- TagBadge: small rounded pill with subtle bg (color at 10% opacity) + text in tag color
- TagPicker: bg-surface, border-border-subtle styling matching AddTaskInput
- All components default-exported, RTL-aware with dir="rtl"
- Lint: ✅ Clean
- Dev server: ✅ No errors
