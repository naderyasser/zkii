'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as echarts from 'echarts';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import * as api from '@/lib/api';
import type { Task, HeatmapDay, WeeklyScoreData, TaskCategory, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';

/* ─── Koala palette constants ──────────────────────────────── */
const KOALA = {
  bgBase: '#1a1a2e',
  bgSurface: '#16213e',
  textPrimary: '#a9b1d6',
  textSecondary: '#565f89',
  textMuted: '#3b4261',
  textBright: '#c0caf5',
  accentBlue: '#7aa2f7',
  accentPurple: '#bb9af7',
  accentTeal: '#73daca',
  accentYellow: '#e0af68',
  accentOrange: '#ff9e64',
  accentGreen: '#9ece6a',
  coral: '#e94560',
  borderSubtle: '#292e42',
} as const;

/* ─── Arabic label maps ────────────────────────────────────── */
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'عاجل',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: KOALA.coral,
  high: KOALA.accentOrange,
  medium: KOALA.accentYellow,
  low: KOALA.accentTeal,
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: 'عمل',
  personal: 'شخصي',
  errands: 'مهمات',
  calls: 'مكالمات',
  reading: 'قراءة',
};

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  work: KOALA.accentBlue,
  personal: KOALA.accentPurple,
  errands: KOALA.accentOrange,
  calls: KOALA.accentYellow,
  reading: KOALA.accentGreen,
};

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ─── Helpers ──────────────────────────────────────────────── */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES_AR[d.getDay()];
}

/* ─── Chart card shell ─────────────────────────────────────── */
function ChartCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] bg-surface border border-border-subtle p-4 flex flex-col',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-koala-green scale-x-[-1]" />
        <span className="text-[13px] text-koala-bright font-medium">{title}</span>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

/* ─── Skeleton placeholder ─────────────────────────────────── */
function ChartSkeleton() {
  return (
    <div className="w-full h-64 animate-pulse rounded bg-border-subtle/30 flex items-center justify-center">
      <Activity className="size-6 text-koala-muted animate-spin" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. Weekly Completion Trend — Line Chart
   ═══════════════════════════════════════════════════════════════ */
function WeeklyTrendChart({ data }: { data: HeatmapDay[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const last7 = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-7);
  }, [data]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    instanceRef.current = chart;

    const dates = last7.map((d) => formatShortDate(d.date));
    const totals = last7.map((d) => d.total);
    const dones = last7.map((d) => d.done);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: KOALA.bgSurface,
        borderColor: KOALA.borderSubtle,
        textStyle: { color: KOALA.textBright, fontFamily: 'Cairo, sans-serif', fontSize: 12 },
        axisPointer: { lineStyle: { color: KOALA.borderSubtle } },
      },
      legend: {
        data: ['المهام الكلية', 'المكتمل'],
        top: 0,
        right: 0,
        textStyle: { color: KOALA.textSecondary, fontFamily: 'Cairo, sans-serif', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 14,
      },
      grid: { left: 36, right: 16, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: KOALA.borderSubtle } },
        axisTick: { show: false },
        axisLabel: {
          color: KOALA.textSecondary,
          fontFamily: 'Cairo, sans-serif',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: KOALA.borderSubtle, type: 'dashed' } },
        axisLabel: {
          color: KOALA.textMuted,
          fontFamily: 'Cairo, sans-serif',
          fontSize: 11,
        },
      },
      series: [
        {
          name: 'المهام الكلية',
          type: 'line',
          data: totals,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: KOALA.accentBlue },
          itemStyle: { color: KOALA.accentBlue },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(122,162,247,0.25)' },
              { offset: 1, color: 'rgba(122,162,247,0.02)' },
            ]),
          },
        },
        {
          name: 'المكتمل',
          type: 'line',
          data: dones,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: KOALA.accentGreen },
          itemStyle: { color: KOALA.accentGreen },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(158,206,106,0.2)' },
              { offset: 1, color: 'rgba(158,206,106,0.02)' },
            ]),
          },
        },
      ],
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut',
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [last7]);

  return <div ref={chartRef} className="w-full h-64" />;
}

/* ═══════════════════════════════════════════════════════════════
   2. Priority Distribution — Donut / Pie Chart
   ═══════════════════════════════════════════════════════════════ */
function PriorityPieChart({ tasks }: { tasks: Task[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const priorityData = useMemo(() => {
    const counts: Record<TaskPriority, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return (Object.keys(counts) as TaskPriority[])
      .filter((p) => counts[p] > 0)
      .map((p) => ({
        name: PRIORITY_LABELS[p],
        value: counts[p],
        itemStyle: { color: PRIORITY_COLORS[p] },
      }));
  }, [tasks]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    instanceRef.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: KOALA.bgSurface,
        borderColor: KOALA.borderSubtle,
        textStyle: { color: KOALA.textBright, fontFamily: 'Cairo, sans-serif', fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '72%'],
          center: ['50%', '54%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: KOALA.bgSurface, borderWidth: 2 },
          label: {
            show: true,
            color: KOALA.textSecondary,
            fontFamily: 'Cairo, sans-serif',
            fontSize: 11,
            formatter: '{b}\n{d}%',
          },
          labelLine: {
            lineStyle: { color: KOALA.borderSubtle },
            smooth: 0.2,
            length: 10,
            length2: 12,
          },
          emphasis: {
            label: { show: true, fontWeight: 'bold', color: KOALA.textBright, fontSize: 13 },
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.4)' },
          },
          data: priorityData.length > 0
            ? priorityData
            : [{ name: 'لا توجد مهام', value: 1, itemStyle: { color: KOALA.borderSubtle } }],
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 700,
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [priorityData]);

  return <div ref={chartRef} className="w-full h-64" />;
}

/* ═══════════════════════════════════════════════════════════════
   3. Category Breakdown — Horizontal Bar Chart
   ═══════════════════════════════════════════════════════════════ */
function CategoryBarChart({ tasks }: { tasks: Task[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const categoryData = useMemo(() => {
    const counts: Record<TaskCategory, number> = {
      work: 0,
      personal: 0,
      errands: 0,
      calls: 0,
      reading: 0,
    };
    tasks.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    // Return in fixed order (for horizontal bars, last item appears at top)
    const order: TaskCategory[] = ['reading', 'calls', 'errands', 'personal', 'work'];
    return order.map((cat) => ({
      label: CATEGORY_LABELS[cat],
      value: counts[cat],
      color: CATEGORY_COLORS[cat],
    }));
  }, [tasks]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    instanceRef.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: KOALA.bgSurface,
        borderColor: KOALA.borderSubtle,
        textStyle: { color: KOALA.textBright, fontFamily: 'Cairo, sans-serif', fontSize: 12 },
      },
      grid: { left: 64, right: 24, top: 12, bottom: 20 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: KOALA.borderSubtle, type: 'dashed' } },
        axisLabel: {
          color: KOALA.textMuted,
          fontFamily: 'Cairo, sans-serif',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'category',
        data: categoryData.map((c) => c.label),
        axisLine: { lineStyle: { color: KOALA.borderSubtle } },
        axisTick: { show: false },
        axisLabel: {
          color: KOALA.textSecondary,
          fontFamily: 'Cairo, sans-serif',
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: categoryData.map((c) => ({
            value: c.value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: c.color },
                { offset: 1, color: c.color + '88' },
              ]),
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: '55%',
          label: {
            show: true,
            position: 'right',
            color: KOALA.textSecondary,
            fontFamily: 'Cairo, sans-serif',
            fontSize: 11,
          },
          animationDuration: 700,
          animationEasing: 'cubicOut',
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [categoryData]);

  return <div ref={chartRef} className="w-full h-64" />;
}

/* ═══════════════════════════════════════════════════════════════
   AnalyticsDashboard — Main Export
   ═══════════════════════════════════════════════════════════════ */
export default function AnalyticsDashboard() {
  const year = new Date().getFullYear();

  const {
    data: heatmapData = [],
    isLoading: heatmapLoading,
  } = useQuery<HeatmapDay[]>({
    queryKey: ['heatmap', year],
    queryFn: () => api.getHeatmap(year),
  });

  const {
    data: weeklyScore,
    isLoading: scoreLoading,
  } = useQuery<WeeklyScoreData>({
    queryKey: ['weekly-score'],
    queryFn: api.getWeeklyScore,
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = useQuery<Task[]>({
    queryKey: ['tasks', 'all', 'priority'],
    queryFn: () => api.getTasks('all', 'priority'),
  });

  const isLoading = heatmapLoading || tasksLoading;

  return (
    <section dir="rtl" className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="size-5 text-accent-blue scale-x-[-1]" />
        <h2 className="text-[15px] font-semibold text-koala-bright">تحليلات الإنتاجية</h2>
        {weeklyScore && !scoreLoading && (
          <span
            className={cn(
              'mr-auto text-[12px] font-mono font-medium',
              weeklyScore.direction === 'up' && 'text-koala-green',
              weeklyScore.direction === 'down' && 'text-coral',
              weeklyScore.direction === 'same' && 'text-koala-secondary',
            )}
          >
            {weeklyScore.direction === 'up' ? '↑' : weeklyScore.direction === 'down' ? '↓' : '→'}
            {' '}
            {Math.round(weeklyScore.thisWeek)}
          </span>
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Weekly Completion Trend */}
        <ChartCard title="اتجاه الإنجاز الأسبوعي" icon={TrendingUp}>
          {isLoading ? <ChartSkeleton /> : <WeeklyTrendChart data={heatmapData} />}
        </ChartCard>

        {/* 2. Priority Distribution */}
        <ChartCard title="توزيع الأولويات" icon={Activity}>
          {isLoading ? <ChartSkeleton /> : <PriorityPieChart tasks={tasks} />}
        </ChartCard>

        {/* 3. Category Breakdown */}
        <ChartCard title="تفصيل الفئات" icon={BarChart3}>
          {isLoading ? <ChartSkeleton /> : <CategoryBarChart tasks={tasks} />}
        </ChartCard>
      </div>
    </section>
  );
}
