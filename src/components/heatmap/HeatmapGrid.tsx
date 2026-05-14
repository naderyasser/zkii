'use client';

import { useMemo } from 'react';
import type { HeatmapDay } from '@/types';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_DAYS = ['س', 'ر', 'خ', 'ج', 'ن', 'ث', ''];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-border-subtle/50',
  1: 'bg-koala-green/10',
  2: 'bg-koala-green/30',
  3: 'bg-koala-green/60',
  4: 'bg-koala-green/80',
  5: 'bg-koala-green',
};

interface CellData {
  date: string;
  level: number;
  total: number;
  done: number;
  month: number;
}

interface HeatmapGridProps {
  year: number;
  data: HeatmapDay[];
  todayStr: string;
  onDayClick: (date: string) => void;
}

export function HeatmapGrid({ year, data, todayStr, onDayClick }: HeatmapGridProps) {
  const heatmapMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const day of data) map.set(day.date, day);
    return map;
  }, [data]);

  const grid = useMemo(() => {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    const weeks: CellData[][] = [];
    let week: CellData[] = [];
    const empty: CellData = { date: '', level: -1, total: 0, done: 0, month: -1 };

    const startDow = firstDay.getDay();
    const offset = startDow === 0 ? 6 : startDow - 1;
    for (let i = 0; i < offset; i++) week.push(empty);

    const d = new Date(firstDay);
    while (d <= lastDay) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hm = heatmapMap.get(ds);
      week.push({
        date: ds,
        level: hm?.level ?? 0,
        total: hm?.total ?? 0,
        done: hm?.done ?? 0,
        month: d.getMonth(),
      });
      if (week.length === 7) { weeks.push(week); week = []; }
      d.setDate(d.getDate() + 1);
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(empty);
      weeks.push(week);
    }
    return weeks;
  }, [year, heatmapMap]);

  const monthLabels = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = [];
    let last = -1;
    for (let w = 0; w < grid.length; w++) {
      for (let d = 0; d < 7; d++) {
        if (grid[w][d].month >= 0 && grid[w][d].month !== last) {
          last = grid[w][d].month;
          labels.push({ weekIdx: w, label: ARABIC_MONTHS[last] });
          break;
        }
      }
    }
    return labels;
  }, [grid]);

  return (
    <div className="overflow-x-auto" dir="ltr">
      <div className="inline-flex flex-col gap-[2px]">
        {/* Month labels */}
        <div className="flex gap-[2px]" style={{ paddingInlineStart: '20px' }}>
          {grid.map((_w, wIdx) => {
            const ml = monthLabels.find((m) => m.weekIdx === wIdx);
            return (
              <div key={wIdx} className="w-[10px] text-[8px] text-koala-muted text-center overflow-visible">
                {ml?.label ?? ''}
              </div>
            );
          })}
        </div>

        {/* Day rows */}
        {Array.from({ length: 7 }).map((_, dayIdx) => (
          <div key={dayIdx} className="flex gap-[2px] items-center">
            <span className="w-[18px] text-[9px] text-koala-muted text-center shrink-0">
              {ARABIC_DAYS[dayIdx]}
            </span>
            {grid.map((week, wIdx) => {
              const cell = week[dayIdx];
              if (!cell || cell.level < 0) {
                return <div key={`${wIdx}-${dayIdx}`} className="w-[10px] h-[10px] rounded-[2px]" />;
              }
              const isToday = cell.date === todayStr;
              return (
                <button
                  key={`${wIdx}-${dayIdx}`}
                  className={`w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-colors duration-150 ${
                    LEVEL_COLORS[cell.level] ?? LEVEL_COLORS[0]
                  } ${isToday ? 'outline outline-[1.5px] outline-koala-secondary outline-offset-[-1.5px]' : ''}`}
                  onClick={() => onDayClick(cell.date)}
                  title={`${cell.date} — ${cell.done}/${cell.total}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-[6px] mt-3 text-[11px] text-koala-muted" dir="rtl">
        <span>أقل</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div key={level} className={`w-[10px] h-[10px] rounded-[2px] ${LEVEL_COLORS[level]}`} />
        ))}
        <span>أكتر</span>
      </div>
    </div>
  );
}
