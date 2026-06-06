'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Terminal, Activity, PanelRightClose, PanelRightOpen, BarChart3, Zap, Search, LayoutGrid, Target, FolderKanban } from 'lucide-react';
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
import CommandPalette from '@/components/command/CommandPalette';
import { Button } from '@/components/ui/button';
import { useCreateTask, useCompleteTask } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/notifications/NotificationBell';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import HabitList from '@/components/habits/HabitList';
import ProjectList from '@/components/projects/ProjectList';
import MotivationPanel from '@/components/motivation/MotivationPanel';
import ExportPanel from '@/components/export/ExportPanel';

type MainTab = 'tasks' | 'kanban' | 'habits' | 'projects' | 'heatmap' | 'analytics';

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

  // Command palette state
  const [cmdOpen, setCmdOpen] = useState(false);

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const { sendMessage } = useChat();

  // Smart notifications
  useNotifications();

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

  // Command palette: focus task by ID
  const handleCmdFocusTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setFocusTask(task);
      setFocusOpen(true);
    }
  }, [tasks]);

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
                mainTab === 'kanban'
                  ? 'bg-hover text-accent-blue'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('kanban')}
            >
              <LayoutGrid className="size-3 me-1" />
              كانبان
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2.5 text-[12px] rounded-sm transition-colors ${
                mainTab === 'habits'
                  ? 'bg-hover text-koala-green'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('habits')}
            >
              <Target className="size-3 me-1" />
              العادات
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2.5 text-[12px] rounded-sm transition-colors ${
                mainTab === 'projects'
                  ? 'bg-hover text-koala-purple'
                  : 'text-koala-secondary hover:text-koala-primary'
              }`}
              onClick={() => setMainTab('projects')}
            >
              <FolderKanban className="size-3 me-1" />
              المشاريع
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
          {/* Search / Cmd+K button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-koala-secondary hover:text-koala-bright hover:bg-hover gap-1.5"
            onClick={() => setCmdOpen(true)}
          >
            <Search className="size-3" />
            <span className="hidden sm:inline">بحث</span>
            <kbd className="hidden md:inline-flex items-center rounded border border-border-subtle bg-hover px-1 py-0.5 text-[9px] font-mono text-koala-muted">
              ⌘K
            </kbd>
          </Button>

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

          {/* Notification bell */}
          <NotificationBell />

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
          <div className={mainTab === 'kanban' ? 'h-full' : 'max-w-3xl mx-auto p-6'}>
            <div className="flex flex-col gap-6">
              {mainTab === 'tasks' && (
                <>
                  <TaskList onFocusTask={handleFocusTask} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeeklyScore />
                    <IntegrationsPanel />
                  </div>
                  <MotivationPanel />
                  <ExportPanel />
                </>
              )}

              {mainTab === 'kanban' && (
                <div className="p-4 md:p-6">
                  <KanbanBoard onFocusTask={handleFocusTask} />
                </div>
              )}

              {mainTab === 'habits' && (
                <HabitList />
              )}

              {mainTab === 'projects' && (
                <ProjectList />
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

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onSwitchTab={setMainTab}
        onToggleChat={toggleChat}
        onAddTask={handleAddTask}
        onFocusTask={handleCmdFocusTask}
        tasks={tasks}
      />
    </div>
  );
}
