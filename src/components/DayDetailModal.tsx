'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DayDetail {
  date: string;
  summary: string | null;
  totalTasks: number;
  completedTasks: number;
  productivityScore: number;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string;
  }[];
}

interface DayDetailModalProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

const categoryLabels: Record<string, string> = {
  work: 'شغل',
  personal: 'شخصي',
  errands: 'مهام',
  calls: 'مكالمات',
  reading: 'قراءة',
};

export default function DayDetailModal({ date, open, onOpenChange }: DayDetailModalProps) {
  const queryClient = useQueryClient();

  const { data: dayDetail, isLoading } = useQuery<DayDetail>({
    queryKey: ['day-detail', date],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/day-detail?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch day detail');
      return res.json();
    },
    enabled: !!date && open,
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (d: string) => {
      const res = await fetch('/api/chat/generate-day-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: d }),
      });
      if (!res.ok) throw new Error('Failed to generate summary');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-detail', date] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    },
  });

  function formatDateAr(dateStr: string): string {
    try {
      return format(new Date(dateStr), 'EEEE d MMMM yyyy', { locale: ar });
    } catch {
      return dateStr;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-purple-800">
            {date ? formatDateAr(date) : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">جاري التحميل...</span>
            </div>
          </div>
        ) : dayDetail ? (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <span className="text-2xl font-bold text-purple-700">
                  {dayDetail.totalTasks}
                </span>
                <span className="text-[10px] text-muted-foreground">إجمالي المهام</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">
                  {dayDetail.completedTasks}
                </span>
                <span className="text-[10px] text-muted-foreground">مكتملة</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-purple-50">
                <span className="text-2xl font-bold text-purple-600">
                  {Math.round(dayDetail.productivityScore)}%
                </span>
                <span className="text-[10px] text-muted-foreground">الإنتاجية</span>
              </div>
            </div>

            <Progress
              value={dayDetail.productivityScore}
              className="h-2"
            />

            {/* AI Summary */}
            {dayDetail.summary ? (
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="size-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-700">
                    ملخص زكي
                  </span>
                </div>
                <p className="text-sm text-purple-900 leading-relaxed">
                  {dayDetail.summary}
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 gap-1.5"
                onClick={() => {
                  if (date) generateSummaryMutation.mutate(date);
                }}
                disabled={generateSummaryMutation.isPending}
              >
                {generateSummaryMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    جاري توليد الملخص...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    ولّد ملخص بالذكاء الاصطناعي
                  </>
                )}
              </Button>
            )}

            {/* Tasks list */}
            {dayDetail.tasks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  المهام
                </span>
                <ScrollArea className="max-h-60">
                  <div className="flex flex-col gap-1.5">
                    {dayDetail.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={`text-sm flex-1 ${
                            task.status === 'done'
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          {categoryLabels[task.category] || task.category}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
