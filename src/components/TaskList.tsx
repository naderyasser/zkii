'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Clock, AlertTriangle, Terminal } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import AddTaskDialog from '@/components/AddTaskDialog';

interface Task {
  id: string;
  userId: string;
  title: string;
  notes: string;
  category: string;
  priority: string;
  status: string;
  dueDatetime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
  source: string;
  aiScore: number;
  daysUntilDue: number | null;
  pressureLevel: string;
}

const categoryLabels: Record<string, string> = {
  work: 'شغل',
  personal: 'شخصي',
  errands: 'مهام',
  calls: 'مكالمات',
  reading: 'قراءة',
};

const categoryColors: Record<string, string> = {
  work: 'bg-neon/10 text-neon border-neon/30',
  personal: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  errands: 'bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/30',
  calls: 'bg-cyber-pink/10 text-cyber-pink border-cyber-pink/30',
  reading: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
};

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

const priorityIcons: Record<string, string> = {
  urgent: '🔴',
  high: '🟡',
  medium: '🟢',
  low: '⚪',
};

const pressureColors: Record<string, string> = {
  chill: 'bg-neon/10 text-neon',
  normal: 'bg-cyan-500/10 text-cyan-400',
  urgent: 'bg-cyber-yellow/10 text-cyber-yellow',
  overdue: 'bg-red-500/10 text-red-400',
};

const pressureLabels: Record<string, string> = {
  chill: 'مريح',
  normal: 'عادي',
  urgent: 'مستعجل',
  overdue: 'متأخر',
};

export default function TaskList() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', activeTab],
    queryFn: async () => {
      const filterMap: Record<string, string> = {
        all: 'all',
        today: 'today',
        overdue: 'overdue',
        done: 'done',
      };
      const res = await fetch(
        `/api/tasks?filter=${filterMap[activeTab] || 'all'}&sort_by=priority`
      );
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      setDeleteConfirmId(null);
    },
  });

  function formatDueDate(dueDatetime: string | null): string {
    if (!dueDatetime) return '';
    try {
      const date = new Date(dueDatetime);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
      if (isToday) {
        return `اليوم ${format(date, 'h:mm a', { locale: ar })}`;
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: ar });
    } catch {
      return '';
    }
  }

  return (
    <>
      <Card className="border-border bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-neon neon-glow-subtle flex items-center gap-2">
              <Terminal className="size-4" />
              المهام
            </CardTitle>
            <Button
              size="sm"
              className="bg-neon hover:bg-neon-dim text-background gap-1.5 font-semibold"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="size-4" />
              مهمة جديدة
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9 bg-surface-alt border border-border">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-neon/10 data-[state=active]:text-neon">{`// الكل`}</TabsTrigger>
              <TabsTrigger value="today" className="text-xs data-[state=active]:bg-neon/10 data-[state=active]:text-neon">النهارده</TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400">المتأخرة</TabsTrigger>
              <TabsTrigger value="done" className="text-xs data-[state=active]:bg-neon/10 data-[state=active]:text-neon">المكتملة</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="size-6 border-2 border-neon/50 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-mono">{'>'} جاري التحميل...</span>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-4xl mb-3">⌨️</span>
                  <span className="text-sm font-medium">مفيش مهام هنا</span>
                  <span className="text-xs mt-1 font-mono">$ add-task --to start your day</span>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="flex flex-col gap-2 pr-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group flex items-start gap-3 rounded-lg border border-border p-3 transition-all hover:border-neon/30 hover:bg-neon/5 ${
                          task.status === 'done' ? 'opacity-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={() => {
                            if (task.status !== 'done') {
                              completeMutation.mutate(task.id);
                            }
                          }}
                          disabled={task.status === 'done' || completeMutation.isPending}
                          className="mt-0.5 data-[state=checked]:bg-neon data-[state=checked]:border-neon"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-medium text-slate-200 ${
                                task.status === 'done'
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className="text-xs">
                              {priorityIcons[task.priority] || '⚪'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-5 ${
                                categoryColors[task.category] || ''
                              }`}
                            >
                              {categoryLabels[task.category] || task.category}
                            </Badge>
                            {task.pressureLevel && task.pressureLevel !== 'chill' && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 h-5 bg-surface-alt ${
                                  pressureColors[task.pressureLevel] || ''
                                }`}
                              >
                                {task.pressureLevel === 'overdue' && (
                                  <AlertTriangle className="size-3 ml-0.5" />
                                )}
                                {pressureLabels[task.pressureLevel] || task.pressureLevel}
                              </Badge>
                            )}
                            {task.dueDatetime && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-mono">
                                <Clock className="size-3" />
                                {formatDueDate(task.dueDatetime)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                          onClick={() => setDeleteConfirmId(task.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <Card className="w-80 shadow-2xl border-red-500/30 bg-card">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <span className="text-3xl">⚡</span>
              <p className="text-sm font-medium text-center text-slate-200">
                متأكد إنك عايز تحذف المهمة دي؟
              </p>
              <p className="text-xs text-muted-foreground font-mono">$ rm -rf task/{deleteConfirmId.slice(0, 8)}</p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-slate-300 hover:bg-surface-alt"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => deleteMutation.mutate(deleteConfirmId)}
                  disabled={deleteMutation.isPending}
                >
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  );
}
