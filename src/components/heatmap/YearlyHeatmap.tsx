'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { getHeatmap } from '@/lib/api';
import { HeatmapGrid } from './HeatmapGrid';

interface YearlyHeatmapProps {
  onDayClick: (date: string) => void;
}

export default function YearlyHeatmap({ onDayClick }: YearlyHeatmapProps) {
  const year = new Date().getFullYear();
  const [expanded, setExpanded] = useState(false);

  const { data: heatmapData = [] } = useQuery({
    queryKey: ['heatmap', year],
    queryFn: () => getHeatmap(year),
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const activeDays = useMemo(
    () => heatmapData.filter((d) => d.level > 0).length,
    [heatmapData]
  );

  return (
    <div className="rounded-[10px] bg-surface border border-border-subtle overflow-hidden">
      {/* Header — clickable toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-hover transition-colors duration-150"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-koala-green scale-x-[-1]" />
          <span className="text-[13px] text-koala-bright font-medium">
            خريطة النشاط
          </span>
          <span className="text-[12px] text-koala-secondary">
            {activeDays} يوم نشيط
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-koala-muted" />
        ) : (
          <ChevronDown className="size-4 text-koala-muted" />
        )}
      </button>

      {/* Expandable grid */}
      <div
        className="transition-[max-height] duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? '400px' : '0px' }}
      >
        <div className="px-4 pb-4">
          <HeatmapGrid
            year={year}
            data={heatmapData}
            todayStr={todayStr}
            onDayClick={onDayClick}
          />
        </div>
      </div>
    </div>
  );
}
