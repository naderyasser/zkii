'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import type { DayDetailTask } from '@/types';

const PRIORITY_MAP: Record<string, string> = {
  urgent: 'عاجل', high: 'عالي', medium: 'متوسط', low: 'منخفض',
};

const CATEGORY_MAP: Record<string, string> = {
  work: 'شغل', personal: 'شخصي', errands: 'مهام', calls: 'مكالمات', reading: 'قراءة',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-coral', high: 'text-koala-orange',
  medium: 'text-koala-yellow', low: 'text-koala-green',
};

const CATEGORY_COLORS: Record<string, string> = {
  work: 'bg-accent-blue/10 text-accent-blue',
  personal: 'bg-koala-purple/10 text-koala-purple',
  errands: 'bg-koala-orange/10 text-koala-orange',
  calls: 'bg-koala-teal/10 text-koala-teal',
  reading: 'bg-koala-green/10 text-koala-green',
};

interface DayTaskListProps {
  tasks: DayDetailTask[];
}

export function DayTaskList({ tasks }: DayTaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2 p-2 rounded-md bg-base border border-border-subtle"
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="size-4 text-koala-green shrink-0" />
          ) : (
            <Circle className="size-4 text-koala-muted shrink-0" />
          )}
          <span
            className={`text-[13px] flex-1 ${
              task.status === 'done'
                ? 'opacity-60 line-through text-koala-secondary'
                : 'text-koala-primary'
            }`}
          >
            {task.title}
          </span>
          <span
            className={`text-[11px] font-medium ${
              PRIORITY_COLORS[task.priority] ?? 'text-koala-secondary'
            }`}
          >
            {PRIORITY_MAP[task.priority] ?? task.priority}
          </span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-[4px] ${
              CATEGORY_COLORS[task.category] ?? 'bg-hover text-koala-secondary'
            }`}
          >
            {CATEGORY_MAP[task.category] ?? task.category}
          </span>
        </div>
      ))}
    </div>
  );
}
