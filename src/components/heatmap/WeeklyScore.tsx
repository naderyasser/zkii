'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWeeklyScore } from '@/lib/api';
import type { WeeklyScoreData } from '@/types';

export default function WeeklyScore() {
  const { data, isLoading } = useQuery<WeeklyScoreData>({
    queryKey: ['weekly-score'],
    queryFn: getWeeklyScore,
  });

  if (isLoading) {
    return (
      <div className="rounded-[10px] bg-surface border border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-koala-secondary animate-pulse scale-x-[-1]" />
          <span className="text-[13px] text-koala-secondary">النتيجة الأسبوعية</span>
        </div>
        <div className="mt-2 h-8 animate-shimmer rounded bg-border-subtle/50" />
      </div>
    );
  }

  if (!data) return null;

  const directionIcon = data.direction === 'up'
    ? TrendingUp
    : data.direction === 'down'
    ? TrendingDown
    : Minus;

  const directionColor = data.direction === 'up'
    ? 'text-koala-green'
    : data.direction === 'down'
    ? 'text-coral'
    : 'text-koala-secondary';

  const DirectionIcon = directionIcon;

  return (
    <div className="rounded-[10px] bg-surface border border-border-subtle p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-koala-green scale-x-[-1]" />
        <span className="text-[13px] text-koala-bright font-medium">
          النتيجة الأسبوعية
        </span>
      </div>

      <div className="flex items-end justify-between">
        {/* This week */}
        <div className="flex flex-col items-center">
          <span className="text-[28px] font-bold text-koala-bright font-mono leading-none">
            {Math.round(data.thisWeek)}
          </span>
          <span className="text-[11px] text-koala-secondary mt-1">هذا الأسبوع</span>
        </div>

        {/* Direction indicator */}
        <div className={cn('flex items-center gap-1', directionColor)}>
          <DirectionIcon className="size-4" />
          <span className="text-[13px] font-mono font-medium">
            {data.direction === 'up' ? '+' : data.direction === 'down' ? '' : ''}
            {Math.round(data.diff)}
          </span>
        </div>

        {/* Last week */}
        <div className="flex flex-col items-center">
          <span className="text-[20px] font-semibold text-koala-secondary font-mono leading-none">
            {Math.round(data.lastWeek)}
          </span>
          <span className="text-[11px] text-koala-muted mt-1">الأسبوع الماضي</span>
        </div>
      </div>
    </div>
  );
}
