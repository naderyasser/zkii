'use client';

import { motion } from 'framer-motion';
import { Check, Trash2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToggleHabit, useDeleteHabit } from '@/hooks/useHabits';
import type { Habit } from '@/types';

/* ─── 7-day mini heatmap ────────────────────────────────────── */
function MiniHeatmap({ habit }: { habit: Habit }) {
  // Build a map of logged dates from weekLogs
  const loggedDates = new Set(
    (habit.weekLogs ?? []).map((l) => l.date)
  );

  // Generate last 7 days
  const days: { date: string; done: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, done: loggedDates.has(dateStr) });
  }

  return (
    <div className="flex items-center gap-[3px]" dir="ltr">
      {days.map((d) => (
        <div
          key={d.date}
          title={d.date}
          className={cn(
            'size-[10px] rounded-[2px] transition-colors duration-150',
            d.done
              ? 'bg-koala-green/80'
              : 'bg-border-subtle/60'
          )}
        />
      ))}
    </div>
  );
}

/* ─── HabitCard ─────────────────────────────────────────────── */
interface HabitCardProps {
  habit: Habit;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const toggle = useToggleHabit();
  const remove = useDeleteHabit();

  const borderColor = habit.color || '#9ece6a';

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group flex flex-col rounded-[10px] border border-border-subtle overflow-hidden',
        'bg-surface transition-colors duration-150 hover:bg-hover',
      )}
      style={{ borderRightWidth: '3px', borderRightColor: borderColor }}
      dir="rtl"
    >
      {/* Top row: icon + name + streak */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-base leading-none select-none">{habit.icon}</span>
        <span className="text-[13px] font-medium text-koala-bright truncate flex-1">
          {habit.name}
        </span>
        {habit.streak !== undefined && habit.streak > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium bg-koala-orange/10 text-koala-orange">
            <Flame className="size-3 scale-x-[-1]" />
            {habit.streak}
          </span>
        )}
        <button
          onClick={() => remove.mutate(habit.id)}
          aria-label="حذف العادة"
          className="shrink-0 text-koala-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-coral p-0.5"
        >
          <Trash2 className="size-3.5 scale-x-[-1]" />
        </button>
      </div>

      {/* Description */}
      {habit.description && (
        <p className="px-3 pb-1 text-[11px] text-koala-secondary leading-relaxed truncate">
          {habit.description}
        </p>
      )}

      {/* Bottom row: mini heatmap + toggle button */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <MiniHeatmap habit={habit} />
        <button
          onClick={() => toggle.mutate(habit.id)}
          disabled={toggle.isPending}
          aria-label={habit.todayDone ? 'إلغاء الإنجاز' : 'إنجاز العادة'}
          className={cn(
            'size-7 rounded-full flex items-center justify-center transition-all duration-200 shrink-0',
            habit.todayDone
              ? 'bg-koala-green/20 text-koala-green hover:bg-koala-green/30'
              : 'bg-border-subtle/40 text-koala-muted hover:bg-border-subtle/70 hover:text-koala-secondary',
            toggle.isPending && 'opacity-50 cursor-wait',
          )}
        >
          <Check className={cn('size-4 scale-x-[-1]', habit.todayDone && 'stroke-[2.5]')} />
        </button>
      </div>
    </motion.div>
  );
}
