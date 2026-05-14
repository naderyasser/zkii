'use client';

import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/types';

interface PriorityBorderProps {
  priority: TaskPriority;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'border-coral',
  high: 'border-koala-orange',
  medium: 'border-koala-yellow',
  low: 'border-koala-teal',
} as const;

export function PriorityBorder({ priority }: PriorityBorderProps) {
  return (
    <div
      className={cn(
        'border-s-4 self-stretch shrink-0',
        PRIORITY_COLORS[priority]
      )}
      aria-hidden="true"
    />
  );
}
