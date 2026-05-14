'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, AlertTriangle, Terminal, Pencil, Check, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
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
  work: 'bg-accent-brand/10 text-accent-brand border-accent-brand/20',
  personal: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  errands: 'bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/20',
  calls: 'bg-cyber-pink/10 text-cyber-pink border-cyber-pink/20',
  reading: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
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
  chill: 'bg-accent-brand/10 text-accent-brand',
  normal: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  urgent: 'bg-cyber-yellow/10 text-cyber-yellow',
  overdue: 'bg-red-500/10 text-red-500 dark:text-red-400',
};

const pressureLabels: Record<string, string> = {
  chill: 'مريح',
  normal: 'عادي',
  urgent: 'مستعجل',
  overdue: 'متأخر',
};

// Animation variants
const taskVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

export default function TaskList() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTaskId(null);
    },
  });

  // Focus the edit input when it appears
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }

  function saveEdit() {
    if (editingTaskId && editingTitle.trim()) {
      updateTaskMutation.mutate({ id: editingTaskId, title: editingTitle.trim() });
    } else {
      setEditingTaskId(null);
    }
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditingTitle('');
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

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
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-accent-brand dark:neon-glow-subtle flex items-center gap-2">
              <Terminal className="size-4" />
              المهام
            </CardTitle>
            <Button
              size="sm"
              className="bg-accent-brand hover:bg-accent-brand-dim text-white gap-1.5 font-semibold shadow-sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="size-4" />
              مهمة جديدة
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9 bg-surface-alt border border-border">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-card data-[state=active]:text-accent-brand data-[state=active]:shadow-sm">{`// الكل`}</TabsTrigger>
              <TabsTrigger value="today" className="text-xs data-[state=active]:bg-card data-[state=active]:text-accent-brand data-[state=active]:shadow-sm">النهارده</TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs data-[state=active]:bg-card data-[state=active]:text-red-500 data-[state=active]:shadow-sm">المتأخرة</TabsTrigger>
              <TabsTrigger value="done" className="text-xs data-[state=active]:bg-card data-[state=active]:text-accent-brand data-[state=active]:shadow-sm">المكتملة</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="size-5 border-2 border-accent-brand/40 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono">{'>'} جاري التحميل...</span>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">⌨️</span>
                  <span className="text-sm font-medium">مفيش مهام هنا</span>
                  <span className="text-xs mt-1 font-mono">$ add-task --to start your day</span>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <AnimatePresence mode="popLayout">
                    <div className="flex flex-col gap-2 pr-1">
                      {tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          variants={taskVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          layout
                          layoutId={task.id}
                        >
                          <div
                            className={`group flex items-start gap-3 rounded-xl border border-border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-accent-brand/30 cursor-default ${
                              task.status === 'done' ? 'opacity-40' : 'bg-card'
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
                              className="mt-0.5 data-[state=checked]:bg-accent-brand data-[state=checked]:border-accent-brand"
                            />

                            <div className="flex-1 min-w-0">
                              {/* Title — inline editable */}
                              {editingTaskId === task.id ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    ref={editInputRef}
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    onBlur={saveEdit}
                                    className="h-7 text-sm bg-surface-alt border-accent-brand/30 focus:border-accent-brand"
                                    disabled={updateTaskMutation.isPending}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-accent-brand shrink-0"
                                    onMouseDown={(e) => { e.preventDefault(); saveEdit(); }}
                                  >
                                    <Check className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-muted-foreground shrink-0"
                                    onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-sm font-medium text-foreground cursor-text rounded px-0.5 -mx-0.5 hover:bg-surface-alt ${
                                      task.status === 'done'
                                        ? 'line-through text-muted-foreground'
                                        : ''
                                    }`}
                                    onClick={() => {
                                      if (task.status !== 'done') startEditing(task);
                                    }}
                                    title="اضغط للتعديل"
                                  >
                                    {task.title}
                                  </span>
                                  <button
                                    onClick={() => startEditing(task)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent-brand"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <span className="text-xs">
                                    {priorityIcons[task.priority] || '⚪'}
                                  </span>
                                </div>
                              )}

                              {/* Meta row */}
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
                              className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => setDeleteConfirmId(task.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-80 shadow-2xl border-destructive/30 bg-card">
                <CardContent className="p-6 flex flex-col items-center gap-4">
                  <span className="text-3xl">⚡</span>
                  <p className="text-sm font-medium text-center text-foreground">
                    متأكد إنك عايز تحذف المهمة دي؟
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">$ rm -rf task/{deleteConfirmId.slice(0, 8)}</p>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  );
}
