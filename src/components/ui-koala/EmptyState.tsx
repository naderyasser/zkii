'use client';

import { cn } from '@/lib/utils';
import { Plus, MessageCircle, BarChart3, Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  { text: 'إيه اللي عندي النهارده؟', icon: BarChart3 },
  { text: 'أهم مهامي', icon: MessageCircle },
  { text: 'فكّر معايا', icon: Lightbulb },
] as const;

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
  onAddTask: (title: string) => void;
}

export function EmptyState({ onSuggestionClick, onAddTask }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Purple-glowing avatar circle */}
      <div
        className={cn(
          'size-20 rounded-full flex items-center justify-center mb-6',
          'bg-koala-purple/20 text-koala-purple',
          'ring-2 ring-koala-purple/30'
        )}
      >
        <span className="text-2xl font-semibold select-none">زكي</span>
      </div>

      {/* Heading */}
      <h2 className="text-lg font-semibold text-koala-bright mb-2">
        أهلاً، أنا زكي
      </h2>

      {/* Subtitle */}
      <p className="text-[13px] text-koala-secondary mb-8 max-w-[280px] leading-relaxed">
        مساعدك الشخصي — ابدأ بإضافة مهمتك الأولى
      </p>

      {/* Add task button */}
      <button
        onClick={() => onAddTask('')}
        className={cn(
          'inline-flex items-center gap-2 px-5 py-2.5 mb-8',
          'rounded-[10px] text-[13px] font-medium',
          'bg-koala-purple/15 text-koala-purple',
          'border border-koala-purple/25',
          'transition-colors duration-150',
          'hover:bg-koala-purple/25 hover:border-koala-purple/40'
        )}
      >
        <Plus className="size-4 scale-x-[-1]" />
        أضف مهمة جديدة
      </button>

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggestionClick(s.text)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5',
              'rounded-[4px] text-[12px] text-koala-secondary',
              'bg-surface border border-border-subtle',
              'transition-colors duration-150',
              'hover:bg-hover hover:text-koala-primary hover:border-border-default'
            )}
          >
            <s.icon className="size-3 scale-x-[-1]" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
