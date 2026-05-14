'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
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

// Cyberpunk neon-green heatmap levels
const levelColors: Record<number, string> = {
  0: 'bg-slate-800/50',
  1: 'bg-neon/10',
  2: 'bg-neon/25',
  3: 'bg-neon/50',
  4: 'bg-neon/80',
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

    const weeks: { date: string; level: number; total: number; done: number; month: number }[][] = [];
    let currentWeek: { date: string; level: number; total: number; done: number; month: number }[] = [];

    const startDow = firstDay.getDay();
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

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', level: -1, total: 0, done: 0, month: -1 });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, heatmapMap]);

  const monthLabels = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < grid.length; w++) {
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
    <Card className="border-border bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-neon neon-glow-subtle flex items-center gap-2">
          <Activity className="size-4" />
          خريطة النشاط
          <span className="text-[10px] font-mono text-muted-foreground font-normal">{currentYear}</span>
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
                  <span className="w-6 text-[9px] text-muted-foreground text-left shrink-0 font-mono">
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
                            } ${isToday ? 'ring-2 ring-neon ring-offset-1 ring-offset-card' : ''} ${
                              isHovered ? 'scale-125 shadow-[0_0_6px_rgba(0,255,136,0.5)]' : ''
                            } hover:scale-110 cursor-pointer`}
                            onClick={() => onDayClick(cell.date)}
                            onMouseEnter={() => setHoveredCell(cell.date)}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs bg-card border-border text-slate-200">
                          <span className="font-mono">
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
