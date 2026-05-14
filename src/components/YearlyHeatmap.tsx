'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface HeatmapDay {
  date: string;
  total: number;
  done: number;
  level: number;
}

interface YearlyHeatmapProps {
  onDayClick: (date: string) => void;
}

const arabicMonthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const arabicDayAbbr = ['س', 'ر', 'خ', 'ج', 'ن', 'ث', ''];

const levelColors: Record<number, string> = {
  0: 'bg-gray-100 dark:bg-gray-800',
  1: 'bg-emerald-100 dark:bg-emerald-900',
  2: 'bg-emerald-300 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-500',
  4: 'bg-emerald-700 dark:bg-emerald-300',
};

export default function YearlyHeatmap({ onDayClick }: YearlyHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const { data: heatmapData = [] } = useQuery<HeatmapDay[]>({
    queryKey: ['heatmap', currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/heatmap?year=${currentYear}`);
      if (!res.ok) throw new Error('Failed to fetch heatmap');
      return res.json();
    },
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const heatmapMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const day of heatmapData) {
      map.set(day.date, day);
    }
    return map;
  }, [heatmapData]);

  const grid = useMemo(() => {
    const year = currentYear;
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);

    // Build weeks (columns) × days (rows) grid
    const weeks: { date: string; level: number; total: number; done: number; month: number }[][] = [];
    let currentWeek: { date: string; level: number; total: number; done: number; month: number }[] = [];

    // Pad the first week with empty days
    const startDow = firstDay.getDay(); // 0=Sun
    // We want Monday as first day of week (index 0)
    const mondayOffset = startDow === 0 ? 6 : startDow - 1;
    for (let i = 0; i < mondayOffset; i++) {
      currentWeek.push({ date: '', level: -1, total: 0, done: 0, month: -1 });
    }

    const d = new Date(firstDay);
    while (d <= lastDay) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hm = heatmapMap.get(dateStr);
      currentWeek.push({
        date: dateStr,
        level: hm?.level ?? 0,
        total: hm?.total ?? 0,
        done: hm?.done ?? 0,
        month: d.getMonth(),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }

    // Pad the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', level: -1, total: 0, done: 0, month: -1 });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, heatmapMap]);

  // Determine which week index each month label should appear at
  const monthLabels = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < grid.length; w++) {
      // Find the first non-empty day in this week
      for (let d = 0; d < 7; d++) {
        if (grid[w][d].month >= 0 && grid[w][d].month !== lastMonth) {
          lastMonth = grid[w][d].month;
          labels.push({ weekIdx: w, label: arabicMonthNames[lastMonth] });
          break;
        }
      }
    }
    return labels;
  }, [grid]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-purple-800">
          خريطة النشاط
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <div className="inline-flex flex-col gap-0.5" dir="ltr">
              {/* Month labels row */}
              <div className="flex gap-0.5 mb-1" style={{ paddingLeft: '1.5rem' }}>
                {grid.map((_week, wIdx) => {
                  const ml = monthLabels.find((m) => m.weekIdx === wIdx);
                  return (
                    <div
                      key={wIdx}
                      className="w-[11px] text-[8px] text-muted-foreground text-center overflow-visible"
                    >
                      {ml ? ml.label : ''}
                    </div>
                  );
                })}
              </div>

              {/* Grid: 7 rows (days) × N columns (weeks) */}
              {Array.from({ length: 7 }).map((_, dayIdx) => (
                <div key={dayIdx} className="flex gap-0.5 items-center">
                  <span className="w-6 text-[9px] text-muted-foreground text-left shrink-0">
                    {arabicDayAbbr[dayIdx]}
                  </span>
                  {grid.map((week, wIdx) => {
                    const cell = week[dayIdx];
                    if (!cell || cell.level < 0) {
                      return (
                        <div
                          key={`${wIdx}-${dayIdx}`}
                          className="w-[11px] h-[11px] rounded-[2px]"
                        />
                      );
                    }
                    const isToday = cell.date === todayStr;
                    const isHovered = hoveredCell === cell.date;
                    return (
                      <Tooltip key={`${wIdx}-${dayIdx}`}>
                        <TooltipTrigger asChild>
                          <button
                            className={`w-[11px] h-[11px] rounded-[2px] transition-all ${
                              levelColors[cell.level] || levelColors[0]
                            } ${isToday ? 'ring-2 ring-purple-400 ring-offset-1' : ''} ${
                              isHovered ? 'scale-125' : ''
                            } hover:scale-110 cursor-pointer`}
                            onClick={() => onDayClick(cell.date)}
                            onMouseEnter={() => setHoveredCell(cell.date)}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <span>
                            {cell.date} — {cell.done}/{cell.total} مهمة
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </TooltipProvider>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground" dir="rtl">
            <span>أقل</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-[11px] h-[11px] rounded-[2px] ${levelColors[level]}`}
              />
            ))}
            <span>أكتر</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
