'use client';

import { cn } from '@/lib/utils';
import { useTasksStore } from '@/store/tasks';
import { Inbox, Sun, AlertTriangle, CheckCircle2 } from 'lucide-react';

type TaskFilter = 'all' | 'today' | 'overdue' | 'done';

const TABS: { key: TaskFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'الكل', icon: Inbox },
  { key: 'today', label: 'النهارده', icon: Sun },
  { key: 'overdue', label: 'المتأخرة', icon: AlertTriangle },
  { key: 'done', label: 'المكتملة', icon: CheckCircle2 },
];

export default function TaskFilters() {
  const activeFilter = useTasksStore((s) => s.activeFilter);
  const setFilter = useTasksStore((s) => s.setFilter);

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border-subtle"
      dir="rtl"
      role="tablist"
      aria-label="تصفية المهام"
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors duration-150',
              isActive
                ? 'bg-hover text-accent-blue font-medium'
                : 'text-koala-secondary hover:text-koala-primary hover:bg-hover/50'
            )}
            role="tab"
            aria-selected={isActive}
          >
            <Icon className="size-3 scale-x-[-1]" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
