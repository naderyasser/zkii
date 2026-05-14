'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WeeklyScoreData {
  thisWeek: number;
  lastWeek: number;
  diff: number;
  direction: 'up' | 'down' | 'same';
}

export default function WeeklyScore() {
  const { data, isLoading } = useQuery<WeeklyScoreData>({
    queryKey: ['weekly-score'],
    queryFn: async () => {
      const res = await fetch('/api/tasks/weekly-score');
      if (!res.ok) throw new Error('Failed to fetch weekly score');
      return res.json();
    },
  });

  const score = data?.thisWeek ?? 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="border-purple-200 bg-gradient-to-bl from-purple-50 to-white shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-purple-100"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-purple-600 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-purple-700">
              {isLoading ? '...' : `${Math.round(score)}%`}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-purple-800">نتيجة الأسبوع</span>
          {data && (
            <div className="flex items-center gap-1.5 text-xs">
              {data.direction === 'up' && (
                <TrendingUp className="size-4 text-emerald-600" />
              )}
              {data.direction === 'down' && (
                <TrendingDown className="size-4 text-amber-500" />
              )}
              {data.direction === 'same' && (
                <Minus className="size-4 text-muted-foreground" />
              )}
              <span
                className={
                  data.direction === 'up'
                    ? 'text-emerald-600 font-medium'
                    : data.direction === 'down'
                      ? 'text-amber-500 font-medium'
                      : 'text-muted-foreground'
                }
              >
                {data.direction === 'same'
                  ? 'زي الأسبوع الماضي'
                  : data.direction === 'up'
                    ? `+${data.diff.toFixed(1)}%`
                    : `${data.diff.toFixed(1)}%`}
              </span>
              <span className="text-muted-foreground">من الأسبوع الماضي</span>
            </div>
          )}
          {isLoading && (
            <span className="text-xs text-muted-foreground">جاري التحميل...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
