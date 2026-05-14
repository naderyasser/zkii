'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Terminal, Activity, MessageCircle, PanelRightClose, PanelRightOpen, BarChart3, Zap } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useChat } from '@/hooks/useChat';
import * as api from '@/lib/api';
import type { Task } from '@/types';

import ChatPanel from '@/components/chat/ChatPanel';
import TaskList from '@/components/tasks/TaskList';
import EmptyState from '@/components/ui-koala/EmptyState';
import YearlyHeatmap from '@/components/heatmap/YearlyHeatmap';
import DayDetailPanel from '@/components/heatmap/DayDetailPanel';
import WeeklyScore from '@/components/heatmap/WeeklyScore';
import IntegrationsPanel from '@/components/integrations/IntegrationsPanel';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import FocusMode from '@/components/focus/FocusMode';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { Button } from '@/components/ui/button';
import { useCreateTask, useCompleteTask } from '@/hooks/useTasks';

type MainTab = 'tasks' | 'heatmap' | 'analytics';

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>('tasks');
  const chatOpen = useUIStore((s) => s.chatOpen);
  const toggleChat = useUIStore((s) => s.toggleChat);
  const dayDetailDate = useUIStore((s) => s.dayDetailDate);
  const dayDetailOpen = useUIStore((s) => s.dayDetailOpen);
  const openDayDetail = useUIStore((s) => s.openDayDetail);
  const closeDayDetail = useUIStore((s) => s.closeDayDetail);

  // Focus mode state
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const { sendMessage } = useChat();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.getTasks('all', 'priority'),
  });

  const hasTasks = tasks.length > 0;

  function handleSuggestionClick(text: string) {
    sendMessage(text);
    if (!chatOpen) toggleChat();
  }

  function handleAddTask(title: string) {
    if (!title.trim()) return;
    createTask.mutate({ title: title.trim() });
  }

  const handleFocusTask = useCallback((task: Task) => {
    setFocusTask(task);
    setFocusOpen(true);
  }, []);

  const handleFocusComplete = useCallback(() => {
    if (focusTask) {
      completeTask.mutate(focusTask.id);
    }
  }, [focusTask, completeTask]);

  const handleCloseFocus = useCallback(() => {
    setFocusOpen(false);
    setFocusTask(null);
  }, []);

  // ── State 1: Empty / First Visit ──────────────────────────────
  if (!tasksLoading && !hasTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <EmptyState
          onSuggestionClick={handleSuggestionClick}
          onAddTask={handleAddTask}
        />
      </div>
    );
  }

  // ── State 2: Has Tasks (Main Dashboard) ───────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-base">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-koala-purple/20 flex items-center justify-center">
              <Terminal className="size-3.5 text-koala-purple" />
            </div>
            <span className="text-[15px] font-semibold text-koala-bright font-[family-name:var(--font-cairo)]">
              زكي
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-surface border border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2.5 text-[12px] rounded-sm transition-colors ${
                mainTab === 'tasks'
                  ? 'bg-hover text-accent-blue'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('tasks')}
            >
              المهام
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2.5 text-[12px] rounded-sm transition-colors ${
                mainTab === 'heatmap'
                  ? 'bg-hover text-accent-blue'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('heatmap')}
            >
              <Activity className="size-3 me-1" />
              النشاط
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2.5 text-[12px] rounded-sm transition-colors ${
                mainTab === 'analytics'
                  ? 'bg-hover text-accent-blue'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('analytics')}
            >
              <BarChart3 className="size-3 me-1" />
              التحليلات
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Focus mode quick button */}
          {focusTask && !focusOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-koala-green hover:text-koala-green hover:bg-koala-green/10 gap-1"
              onClick={() => setFocusOpen(true)}
            >
              <Zap className="size-3" />
              تركيز
            </Button>
          )}

          {/* Chat toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-koala-secondary hover:text-koala-bright hover:bg-hover"
            onClick={toggleChat}
            aria-label={chatOpen ? 'إغلاق المحادثة' : 'فتح المحادثة'}
          >
            {chatOpen ? (
              <PanelRightClose className="size-4 scale-x-[-1]" />
            ) : (
              <PanelRightOpen className="size-4 scale-x-[-1]" />
            )}
          </Button>

          <AccountSwitcher />
        </div>
      </header>

      {/* Main: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        {chatOpen && (
          <aside className="w-[280px] min-w-[280px] border-e border-border-subtle bg-surface">
            <ChatPanel />
          </aside>
        )}

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="flex flex-col gap-6">
              {mainTab === 'tasks' && (
                <>
                  <TaskList onFocusTask={handleFocusTask} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeeklyScore />
                    <IntegrationsPanel />
                  </div>
                </>
              )}

              {mainTab === 'heatmap' && (
                <>
                  <WeeklyScore />
                  <YearlyHeatmap onDayClick={openDayDetail} />
                  <IntegrationsPanel />
                </>
              )}

              {mainTab === 'analytics' && (
                <AnalyticsDashboard />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Day Detail Panel */}
      <DayDetailPanel
        date={dayDetailDate}
        open={dayDetailOpen}
        onClose={closeDayDetail}
      />

      {/* Focus Mode */}
      <FocusMode
        task={focusTask}
        isOpen={focusOpen}
        onClose={handleCloseFocus}
        onComplete={handleFocusComplete}
      />
    </div>
  );
}
