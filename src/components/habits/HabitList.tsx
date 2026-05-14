'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui-koala/Skeleton';
import { useHabits, useCreateHabit } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import type { HabitFrequency } from '@/types';

/* ─── Constants ─────────────────────────────────────────────── */
const EMOJI_OPTIONS = ['✅', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🎵', '🍎', '😴', '💊'];

const COLOR_OPTIONS = [
  { label: 'أخضر', value: '#9ece6a' },
  { label: 'أزرق', value: '#7aa2f7' },
  { label: 'بنفسجي', value: '#bb9af7' },
  { label: 'أزرق مخضر', value: '#73daca' },
  { label: 'برتقالي', value: '#ff9e64' },
  { label: 'مرجاني', value: '#e94560' },
];

/* ─── Loading skeleton ──────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center rounded-[10px] bg-surface border border-border-subtle overflow-hidden p-3 gap-3"
        >
          <div className="w-[3px] self-stretch rounded bg-border-subtle" />
          <Skeleton width="24px" height="24px" />
          <Skeleton width={`${45 + i * 15}%`} height="14px" />
          <Skeleton width="36px" height="28px" className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Add Habit Form ────────────────────────────────────────── */
function AddHabitForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('✅');
  const [color, setColor] = useState('#9ece6a');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [open, setOpen] = useState(true);

  const createHabit = useCreateHabit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createHabit.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        frequency,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setIcon('✅');
          setColor('#9ece6a');
          setFrequency('daily');
          setOpen(false);
          onSuccess();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-koala-secondary hover:text-koala-green hover:bg-koala-green/10"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4 scale-x-[-1]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border-default text-koala-bright sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-koala-bright text-right">
            إضافة عادة جديدة
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary">الاسم</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: قراءة ١٠ صفحات"
              className="h-8 text-[13px] bg-elevated border-border-default text-koala-bright placeholder:text-koala-muted"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary">الوصف</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اختياري..."
              className="h-8 text-[13px] bg-elevated border-border-default text-koala-bright placeholder:text-koala-muted"
            />
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary">الأيقونة</label>
            <div className="grid grid-cols-6 gap-1.5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'size-8 rounded-[6px] flex items-center justify-center text-base transition-all duration-150',
                    icon === emoji
                      ? 'bg-elevated ring-2 ring-accent-blue/60 scale-110'
                      : 'bg-hover/50 hover:bg-hover',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary">اللون</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={cn(
                    'size-6 rounded-full transition-all duration-150',
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-surface scale-110'
                      : 'hover:scale-110',
                  )}
                  style={{
                    backgroundColor: c.value,
                    ringColor: color === c.value ? c.value : undefined,
                    ...(color === c.value ? { '--tw-ring-color': c.value } as React.CSSProperties : {}),
                  }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary">التكرار</label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as HabitFrequency)}>
              <SelectTrigger className="h-8 text-[13px] bg-elevated border-border-default text-koala-bright w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-default">
                <SelectItem value="daily" className="text-koala-bright text-[13px]">
                  يومي
                </SelectItem>
                <SelectItem value="weekly" className="text-koala-bright text-[13px]">
                  أسبوعي
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!name.trim() || createHabit.isPending}
            className="h-8 text-[13px] bg-koala-green/20 text-koala-green hover:bg-koala-green/30 border border-koala-green/25"
          >
            {createHabit.isPending ? 'جارٍ الإضافة...' : 'إضافة'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Empty State ───────────────────────────────────────────── */
function EmptyHabits() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" dir="rtl">
      <div className="size-14 rounded-full flex items-center justify-center mb-4 bg-koala-green/10 text-koala-green ring-2 ring-koala-green/20">
        <span className="text-xl">🌿</span>
      </div>
      <p className="text-[14px] font-medium text-koala-bright mb-1">
        لا توجد عادات بعد
      </p>
      <p className="text-[12px] text-koala-secondary max-w-[240px] leading-relaxed">
        أضف عادتك الأولى وابدأ بتتبع تقدمك اليومي
      </p>
    </div>
  );
}

/* ─── HabitList (main component) ────────────────────────────── */
export default function HabitList() {
  const { data: habits, isLoading } = useHabits();
  const [, setRefreshKey] = useState(0);

  const hasHabits = habits && habits.length > 0;

  return (
    <section className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-koala-bright">
          العادات
        </h2>
        <AddHabitForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Habit list */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : hasHabits ? (
        <div className="flex flex-col gap-2">
          {habits!.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      ) : (
        <EmptyHabits />
      )}
    </section>
  );
}
