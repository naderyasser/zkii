# Task 1 — CommandPalette Component

## Summary
Built the `⌘K` Command Palette component at `/home/z/my-project/src/components/command/CommandPalette.tsx`.

## What was created
- **File**: `src/components/command/CommandPalette.tsx`
- **Export**: `default` export + named `CommandPaletteProps` interface

## Design decisions
1. **Custom overlay** instead of shadcn `CommandDialog` — positioned at top-center (12vh) like VS Code's command palette, not centered like a modal dialog
2. **Koala dark theme** — uses `bg-elevated`, `border-border-subtle`, `text-koala-bright`, `text-koala-secondary`, etc. from the existing theme tokens
3. **RTL Arabic-first** — `dir="rtl"` on the palette container, all labels in Arabic, Cairo font applied via `font-[family-name:var(--font-cairo)]`
4. **Animation** — `animate-in fade-in-0 zoom-in-95 duration-150` on the palette; `animate-in fade-in-0 duration-150` on the backdrop
5. **Keyboard shortcut** — Ctrl+K / Cmd+K registered internally via `useEffect` + `keydown` listener; Escape also closes
6. **Body scroll lock** — when palette is open, `document.body.style.overflow = 'hidden'`

## Three command groups
| Group | Icon | Heading | Items |
|-------|------|---------|-------|
| 🔍 المهام | Search | Search tasks by title | Pending tasks (max 8), click to focus |
| ⚡ إجراءات | Zap | Quick actions | Create task, Toggle chat |
| 🧭 التنقل | LayoutList | Navigation | المهام, النشاط, التحليلات tabs |

## Component interface
```typescript
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchTab: (tab: 'tasks' | 'heatmap' | 'analytics') => void;
  onToggleChat: () => void;
  onAddTask: (title: string) => void;
  onFocusTask: (taskId: string) => void;
  tasks?: Task[];
}
```

## Lint status
✅ No lint errors in the new file
