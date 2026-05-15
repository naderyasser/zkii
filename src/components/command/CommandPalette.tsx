'use client';

import { useEffect, useCallback, useMemo } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  Plus,
  MessageCircle,
  Zap,
  LayoutList,
  Activity,
  BarChart3,
  Focus,
  LayoutGrid,
  Target,
  FolderKanban,
  Globe,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

/* ─── Props ──────────────────────────────────────────────── */

type MainTab = 'tasks' | 'kanban' | 'habits' | 'projects' | 'heatmap' | 'analytics';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchTab: (tab: MainTab) => void;
  onToggleChat: () => void;
  onAddTask: (title: string) => void;
  onFocusTask: (taskId: string) => void;
  tasks?: Task[];
}

/* ─── Helpers ────────────────────────────────────────────── */

const priorityIcon: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

/* ─── Navigation items ──────────────────────────────────── */

const NAV_ITEMS: { tab: MainTab; label: string; icon: React.ElementType; iconClass: string }[] = [
  { tab: 'tasks', label: 'المهام', icon: LayoutList, iconClass: 'text-koala-purple' },
  { tab: 'kanban', label: 'كانبان', icon: LayoutGrid, iconClass: 'text-accent-blue' },
  { tab: 'habits', label: 'العادات', icon: Target, iconClass: 'text-koala-green' },
  { tab: 'projects', label: 'المشاريع', icon: FolderKanban, iconClass: 'text-koala-purple' },
  { tab: 'heatmap', label: 'النشاط', icon: Activity, iconClass: 'text-koala-teal' },
  { tab: 'analytics', label: 'التحليلات', icon: BarChart3, iconClass: 'text-koala-yellow' },
];

/* ─── Component ──────────────────────────────────────────── */

export default function CommandPalette({
  open,
  onOpenChange,
  onSwitchTab,
  onToggleChat,
  onAddTask,
  onFocusTask,
  tasks = [],
}: CommandPaletteProps) {
  /* ── Keyboard shortcut: Ctrl+K / Cmd+K ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    },
    [open, onOpenChange],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ── Lock body scroll when open ── */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  /* ── Only pending tasks for search ── */
  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending'),
    [tasks],
  );

  /* ── Handlers ── */
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSelect = useCallback(
    (callback: () => void) => {
      close();
      callback();
    },
    [close],
  );

  /* ── Render ── */
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-150"
        onClick={close}
        aria-hidden
      />

      {/* Palette */}
      <div
        dir="rtl"
        className="
          relative z-10 w-full max-w-[560px] mx-4
          rounded-lg border border-border-subtle
          bg-elevated shadow-2xl shadow-black/40
          animate-in fade-in-0 zoom-in-95 duration-150
          overflow-hidden
        "
      >
        <Command
          className="bg-transparent text-koala-bright"
          loop
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-4 border-b border-border-subtle">
            <Search className="size-4 shrink-0 text-koala-secondary" />
            <CommandInput
              placeholder="ابحث عن مهمة أو إجراء..."
              className="h-11 text-sm text-koala-bright placeholder:text-koala-secondary font-[family-name:var(--font-cairo)]"
            />
            <kbd
              className="
                hidden sm:inline-flex items-center gap-0.5
                rounded border border-border-subtle bg-hover
                px-1.5 py-0.5 text-[10px] text-koala-secondary
                font-mono shrink-0
              "
            >
              esc
            </kbd>
          </div>

          {/* List */}
          <CommandList className="max-h-[380px] overflow-y-auto">
            <CommandEmpty className="py-8 text-center text-sm text-koala-secondary font-[family-name:var(--font-cairo)]">
              لا توجد نتائج
            </CommandEmpty>

            {/* ── Group 1: Tasks ── */}
            {pendingTasks.length > 0 && (
              <CommandGroup
                heading={
                  <span className="flex items-center gap-1.5 text-koala-secondary font-[family-name:var(--font-cairo)]">
                    <Search className="size-3" />
                    المهام
                  </span>
                }
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
              >
                {pendingTasks.slice(0, 8).map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.title}
                    onSelect={() => handleSelect(() => onFocusTask(task.id))}
                    className="
                      flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                      cursor-pointer
                      text-sm text-koala-primary
                      data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                      transition-colors
                    "
                  >
                    <span className="text-xs">{priorityIcon[task.priority] ?? '⚪'}</span>
                    <span className="truncate flex-1 font-[family-name:var(--font-cairo)]">
                      {task.title}
                    </span>
                    <Focus className="size-3.5 shrink-0 text-koala-secondary" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator className="bg-border-subtle" />

            {/* ── Group 2: Quick Actions ── */}
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5 text-koala-secondary font-[family-name:var(--font-cairo)]">
                  <Zap className="size-3" />
                  إجراءات
                </span>
              }
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
            >
              <CommandItem
                value="إنشاء مهمة جديدة"
                onSelect={() => {
                  close();
                  const title = window.prompt?.('عنوان المهمة');
                  if (title?.trim()) onAddTask(title.trim());
                }}
                className="
                  flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                  cursor-pointer
                  text-sm text-koala-primary
                  data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                  transition-colors
                "
              >
                <Plus className="size-4 text-koala-green" />
                <span className="font-[family-name:var(--font-cairo)]">إنشاء مهمة جديدة</span>
              </CommandItem>

              <CommandItem
                value="تبديل المحادثة"
                onSelect={() => handleSelect(onToggleChat)}
                className="
                  flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                  cursor-pointer
                  text-sm text-koala-primary
                  data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                  transition-colors
                "
              >
                <MessageCircle className="size-4 text-accent-blue" />
                <span className="font-[family-name:var(--font-cairo)]">تبديل المحادثة</span>
              </CommandItem>

              <CommandItem
                value="بحث في الإنترنت"
                onSelect={() => {
                  close();
                  onToggleChat();
                }}
                className="
                  flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                  cursor-pointer
                  text-sm text-koala-primary
                  data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                  transition-colors
                "
              >
                <Globe className="size-4 text-koala-teal" />
                <span className="font-[family-name:var(--font-cairo)]">بحث في الإنترنت (عبر المحادثة)</span>
              </CommandItem>

              <CommandItem
                value="وضع التركيز"
                onSelect={() => {
                  close();
                  if (pendingTasks.length > 0) onFocusTask(pendingTasks[0].id);
                }}
                className="
                  flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                  cursor-pointer
                  text-sm text-koala-primary
                  data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                  transition-colors
                "
              >
                <Timer className="size-4 text-koala-green" />
                <span className="font-[family-name:var(--font-cairo)]">وضع التركيز</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* ── Group 3: Navigation ── */}
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5 text-koala-secondary font-[family-name:var(--font-cairo)]">
                  <LayoutList className="size-3" />
                  التنقل
                </span>
              }
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
            >
              {NAV_ITEMS.map(({ tab, label, icon: Icon, iconClass }) => (
                <CommandItem
                  key={tab}
                  value={label}
                  onSelect={() => handleSelect(() => onSwitchTab(tab))}
                  className="
                    flex items-center gap-2.5 px-3 py-2 mx-1 rounded-md
                    cursor-pointer
                    text-sm text-koala-primary
                    data-[selected=true]:bg-hover data-[selected=true]:text-koala-bright
                    transition-colors
                  "
                >
                  <Icon className={cn('size-4', iconClass)} />
                  <span className="font-[family-name:var(--font-cairo)]">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle">
            <span className="text-[11px] text-koala-muted font-[family-name:var(--font-cairo)]">
              ↵ للتنفيذ · ↑↓ للتصفح
            </span>
            <span className="text-[11px] text-koala-muted">
              ⌘K
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}


