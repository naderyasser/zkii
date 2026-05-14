'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { getDayDetail, generateDaySummary } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DayTaskList } from './DayTaskList';

interface DayDetailPanelProps {
  date: string | null;
  open: boolean;
  onClose: () => void;
}

function fmtDate(d: string): string {
  try { return format(new Date(d), 'EEEE d MMMM yyyy', { locale: ar }); }
  catch { return d; }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-md bg-base border border-border-subtle">
      <span className="text-[18px] text-koala-bright font-semibold font-mono">{value}</span>
      <span className="text-[11px] text-koala-secondary mt-1">{label}</span>
    </div>
  );
}

export default function DayDetailPanel({ date, open, onClose }: DayDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['day-detail', date],
    queryFn: () => getDayDetail(date!),
    enabled: !!date && open,
  });

  const summaryMut = useMutation({
    mutationFn: () => generateDaySummary(date!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-detail', date] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    },
  });

  if (!open || !date) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-base/80" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] bg-surface border-t border-border-subtle rounded-t-[10px] animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border-subtle">
          <h2 className="text-[18px] text-koala-bright font-semibold">
            {fmtDate(date)}
          </h2>
          <button
            className="size-7 rounded-[4px] flex items-center justify-center text-koala-secondary hover:text-koala-bright hover:bg-hover transition-colors duration-150"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-koala-green" />
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="إجمالي المهام" value={String(detail.totalTasks)} />
                <StatCard label="مكتمل" value={String(detail.completedTasks)} />
                <StatCard label="الإنتاجية" value={`${Math.round(detail.productivityScore)}%`} />
              </div>

              {/* AI Summary */}
              {detail.summary ? (
                <div className="bg-koala-purple/5 border border-koala-purple/20 rounded-md p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="size-3.5 text-koala-purple" />
                    <span className="text-[13px] text-koala-purple font-medium">تحليل زكي</span>
                  </div>
                  <p className="text-[13px] text-koala-primary font-mono leading-relaxed whitespace-pre-wrap">
                    {detail.summary}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-koala-purple/30 text-koala-purple hover:bg-koala-purple/10 gap-1.5"
                  onClick={() => summaryMut.mutate()}
                  disabled={summaryMut.isPending}
                >
                  {summaryMut.isPending ? (
                    <><Loader2 className="size-3.5 animate-spin" /> جاري التحليل...</>
                  ) : (
                    <><Sparkles className="size-3.5" /> تحليل بالذكاء</>
                  )}
                </Button>
              )}

              {/* Task list */}
              <DayTaskList tasks={detail.tasks} />
            </div>
          ) : null}
        </ScrollArea>
      </div>
    </>
  );
}
