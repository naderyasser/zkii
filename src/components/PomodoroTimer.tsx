'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Coffee, Link2, Unlink, CheckCircle2, Circle, Timer } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
}

type TimerMode = 'focus' | 'break';

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function PomodoroTimer() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [attachedTaskId, setAttachedTaskId] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/tasks?filter=all&sort_by=priority');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    select: (data) => data.filter((t) => t.status === 'pending'),
  });

  const attachedTask = tasks.find((t) => t.id === attachedTaskId);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            if (mode === 'focus' && attachedTaskId) {
              setShowCompleteDialog(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, attachedTaskId]);

  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} — ${mode === 'focus' ? '🎯' : '☕'} | زكي`;
    } else {
      document.title = 'زكي — مساعدك الشخصي';
    }
  }, [isRunning, timeLeft, mode, formatTime]);

  function toggleTimer() {
    setIsRunning((prev) => !prev);
  }

  function resetTimer() {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }

  function switchMode(newMode: TimerMode) {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }

  async function markTaskDone() {
    if (!attachedTaskId) return;
    try {
      const res = await fetch(`/api/tasks/${attachedTaskId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete task');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
    } catch (err) {
      console.error('Error completing task:', err);
    }
    setAttachedTaskId(null);
    setShowCompleteDialog(false);
    switchMode('break');
  }

  const totalDuration = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <>
      {/* ── Horizontal Pill Widget ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
        {/* Mode badge */}
        <button
          onClick={() => switchMode(mode === 'focus' ? 'break' : 'focus')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            mode === 'focus'
              ? 'bg-accent-brand/10 text-accent-brand'
              : 'bg-amber-100 text-amber-700 dark:bg-cyber-yellow/10 dark:text-cyber-yellow'
          }`}
        >
          {mode === 'focus' ? <Timer className="size-3" /> : <Coffee className="size-3" />}
          {mode === 'focus' ? 'تركيز' : 'استراحة'}
        </button>

        {/* Timer display */}
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold font-mono tabular-nums ${
            mode === 'focus' ? 'text-accent-brand' : 'text-amber-700 dark:text-cyber-yellow'
          }`}>
            {formatTime(timeLeft)}
          </span>

          {/* Mini progress bar */}
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                mode === 'focus' ? 'bg-accent-brand' : 'bg-amber-500 dark:bg-cyber-yellow'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={resetTimer}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            size="icon"
            className={`size-8 rounded-full ${
              mode === 'focus'
                ? 'bg-accent-brand hover:bg-accent-brand-dim text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white dark:bg-cyber-yellow dark:hover:bg-yellow-500 dark:text-background'
            }`}
            onClick={toggleTimer}
          >
            {isRunning ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5 mr-[-1px]" />
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Task attachment */}
        {attachedTask ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-brand/5 border border-accent-brand/20">
            <CheckCircle2 className="size-3.5 text-accent-brand shrink-0" />
            <span className="text-xs text-foreground truncate max-w-[140px] font-medium">
              {attachedTask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-destructive shrink-0 ml-0.5"
              onClick={() => setAttachedTaskId(null)}
            >
              <Unlink className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link2 className="size-3.5 text-muted-foreground shrink-0" />
            <Select
              value={attachedTaskId || ''}
              onValueChange={(v) => setAttachedTaskId(v || null)}
            >
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent text-muted-foreground hover:text-foreground p-0 w-[130px] shadow-none focus:ring-0">
                <SelectValue placeholder="اربط مهمة..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-48">
                {tasks.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    مفيش مهام
                  </div>
                ) : (
                  tasks.slice(0, 15).map((task) => (
                    <SelectItem
                      key={task.id}
                      value={task.id}
                      className="text-foreground focus:bg-accent focus:text-accent-foreground text-xs"
                    >
                      {task.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Focus Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-accent-brand flex items-center gap-2">
              🎯 جلسة التركيز خلصت!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {attachedTask
                ? `هل خلصت "${attachedTask.title}"؟`
                : 'جلسة التركيز انتهت — وقت الاستراحة!'}
            </DialogDescription>
          </DialogHeader>
          {attachedTask && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-brand/5 border border-accent-brand/20">
                <Circle className="size-4 text-accent-brand" />
                <span className="text-sm text-foreground">{attachedTask.title}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCompleteDialog(false);
                    switchMode('break');
                  }}
                >
                  لسه شغال
                </Button>
                <Button
                  className="flex-1 bg-accent-brand hover:bg-accent-brand-dim text-white font-semibold"
                  onClick={markTaskDone}
                >
                  <CheckCircle2 className="size-4 ml-1.5" />
                  خلصت!
                </Button>
              </div>
            </div>
          )}
          {!attachedTask && (
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white dark:bg-cyber-yellow dark:hover:bg-yellow-500 dark:text-background font-semibold"
              onClick={() => {
                setShowCompleteDialog(false);
                switchMode('break');
              }}
            >
              <Coffee className="size-4 ml-1.5" />
              ابدأ الاستراحة
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
