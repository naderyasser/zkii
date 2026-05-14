'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Timer, Coffee, Link2, Unlink, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
}

type TimerMode = 'focus' | 'break';

const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes

export default function PomodoroTimer() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [attachedTaskId, setAttachedTaskId] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch pending tasks for attachment
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

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            // Timer finished
            if (mode === 'focus') {
              // Focus session complete — prompt user to mark task done
              if (attachedTaskId) {
                setShowCompleteDialog(true);
              }
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

  // Update document title with timer
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} — ${mode === 'focus' ? '🎯 تركيز' : '☕ استراحة'} | زكي`;
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
    // Auto-switch to break
    switchMode('break');
  }

  // Progress percentage for the circular indicator
  const totalDuration = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <>
      <Card className="border-border bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-neon neon-glow-subtle flex items-center gap-2">
              <Timer className="size-4" />
              بومودورو
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant={mode === 'focus' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs h-7 px-2.5 ${
                  mode === 'focus'
                    ? 'bg-neon/10 text-neon border border-neon/30 hover:bg-neon/20'
                    : 'text-muted-foreground hover:text-slate-300'
                }`}
                onClick={() => switchMode('focus')}
              >
                🎯 تركيز
              </Button>
              <Button
                variant={mode === 'break' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs h-7 px-2.5 ${
                  mode === 'break'
                    ? 'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30 hover:bg-cyber-yellow/20'
                    : 'text-muted-foreground hover:text-slate-300'
                }`}
                onClick={() => switchMode('break')}
              >
                ☕ استراحة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-4">
          {/* Circular Timer */}
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className={mode === 'focus' ? 'text-neon/10' : 'text-cyber-yellow/10'}
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  mode === 'focus' ? 'text-neon' : 'text-cyber-yellow'
                }`}
                style={{
                  filter: mode === 'focus'
                    ? 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.5))'
                    : 'drop-shadow(0 0 6px rgba(255, 230, 0, 0.5))',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl font-bold font-mono ${
                  mode === 'focus' ? 'text-neon neon-glow-subtle' : 'text-cyber-yellow'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {mode === 'focus' ? 'FOCUS' : 'BREAK'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-9 border-border text-muted-foreground hover:text-slate-300 hover:bg-surface-alt"
              onClick={resetTimer}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              size="icon"
              className={`size-12 rounded-full ${
                mode === 'focus'
                  ? 'bg-neon hover:bg-neon-dim text-background neon-border-glow'
                  : 'bg-cyber-yellow hover:bg-yellow-400 text-background'
              }`}
              onClick={toggleTimer}
            >
              {isRunning ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 mr-[-2px]" />
              )}
            </Button>
            <div className="w-9" /> {/* Spacer for alignment */}
          </div>

          {/* Task Attachment */}
          <div className="w-full flex flex-col gap-2">
            {attachedTask ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neon/5 border border-neon/20">
                <CheckCircle2 className="size-4 text-neon shrink-0" />
                <span className="text-sm text-slate-200 truncate flex-1 font-mono">
                  {attachedTask.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-red-400 shrink-0"
                  onClick={() => setAttachedTaskId(null)}
                >
                  <Unlink className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground shrink-0" />
                <Select
                  value={attachedTaskId || ''}
                  onValueChange={(v) => setAttachedTaskId(v || null)}
                >
                  <SelectTrigger className="flex-1 h-8 text-xs bg-surface-alt border-border text-slate-300 placeholder:text-muted-foreground">
                    <SelectValue placeholder="اربط مهمة بالتايمر..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-48">
                    {tasks.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        مفيش مهام متاحة
                      </div>
                    ) : (
                      tasks.slice(0, 15).map((task) => (
                        <SelectItem
                          key={task.id}
                          value={task.id}
                          className="text-slate-200 focus:bg-neon/10 focus:text-neon text-xs"
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
        </CardContent>
      </Card>

      {/* Focus Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-sm bg-card border-neon/30">
          <DialogHeader>
            <DialogTitle className="text-neon neon-glow-subtle flex items-center gap-2">
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-neon/5 border border-neon/20">
                <Circle className="size-4 text-neon" />
                <span className="text-sm text-slate-200 font-mono">{attachedTask.title}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-slate-300 hover:bg-surface-alt"
                  onClick={() => {
                    setShowCompleteDialog(false);
                    switchMode('break');
                  }}
                >
                  لسه شغال
                </Button>
                <Button
                  className="flex-1 bg-neon hover:bg-neon-dim text-background font-semibold"
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
              className="w-full bg-cyber-yellow hover:bg-yellow-400 text-background font-semibold"
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
