'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';
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
  work: 'bg-purple-100 text-purple-700 border-purple-200',
  personal: 'bg-teal-100 text-teal-700 border-teal-200',
  errands: 'bg-amber-100 text-amber-700 border-amber-200',
  calls: 'bg-orange-100 text-orange-700 border-orange-200',
  reading: 'bg-pink-100 text-pink-700 border-pink-200',
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
  chill: 'bg-emerald-50 text-emerald-600',
  normal: 'bg-sky-50 text-sky-600',
  urgent: 'bg-amber-50 text-amber-600',
  overdue: 'bg-red-50 text-red-600',
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
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-purple-800">
              المهام
            </CardTitle>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="size-4" />
              مهمة جديدة
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">النهارده</TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs">المتأخرة</TabsTrigger>
              <TabsTrigger value="done" className="text-xs">المكتملة</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="size-6 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">جاري التحميل...</span>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-4xl mb-3">📝</span>
                  <span className="text-sm font-medium">مفيش مهام هنا</span>
                  <span className="text-xs mt-1">ضيف مهمة جديدة وابدأ يومك!</span>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="flex flex-col gap-2 pr-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                          task.status === 'done' ? 'opacity-60' : ''
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
                          className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
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
                                className={`text-[10px] px-1.5 py-0 h-5 ${
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
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="size-3" />
                                {formatDueDate(task.dueDatetime)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-80 shadow-xl">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <span className="text-3xl">🗑️</span>
              <p className="text-sm font-medium text-center">
                متأكد إنك عايز تحذف المهمة دي؟
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
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
