'use client';

import { cn } from '@/lib/utils';
import { useTasksStore } from '@/store/tasks';

type TaskFilter = 'all' | 'today' | 'overdue' | 'done';

const TABS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'today', label: 'النهارده' },
  { key: 'overdue', label: 'المتأخرة' },
  { key: 'done', label: 'المكتملة' },
];

export default function TaskFilters() {
  const activeFilter = useTasksStore((s) => s.activeFilter);
  const setFilter = useTasksStore((s) => s.setFilter);

  return (
    <nav className="flex items-center gap-1 border-b border-border-subtle" dir="rtl" aria-label="تصفية المهام">
      {TABS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        return (
          <button key={key} onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-2 text-[13px] font-arabic transition-colors duration-150 border-b-2',
              isActive
                ? 'text-accent-blue border-accent-blue'
                : 'text-koala-secondary hover:text-koala-primary border-transparent',
            )}
            aria-current={isActive ? 'page' : undefined}>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
