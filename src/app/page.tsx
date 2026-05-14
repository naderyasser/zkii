'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Terminal, Activity } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useChat } from '@/hooks/useChat';
import * as api from '@/lib/api';
import type { Task } from '@/types';

import ChatPanel from '@/components/chat/ChatPanel';
import TaskList from '@/components/tasks/TaskList';
import EmptyState from '@/components/ui-koala/EmptyState';
import YearlyHeatmap from '@/components/heatmap/YearlyHeatmap';
import DayDetailPanel from '@/components/heatmap/DayDetailPanel';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useTasks';

type MainTab = 'tasks' | 'heatmap';

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>('tasks');
  const chatOpen = useUIStore((s) => s.chatOpen);
  const toggleChat = useUIStore((s) => s.toggleChat);
  const dayDetailDate = useUIStore((s) => s.dayDetailDate);
  const dayDetailOpen = useUIStore((s) => s.dayDetailOpen);
  const openDayDetail = useUIStore((s) => s.openDayDetail);
  const closeDayDetail = useUIStore((s) => s.closeDayDetail);
  const heatmapExpanded = useUIStore((s) => s.heatmapExpanded);
  const toggleHeatmap = useUIStore((s) => s.toggleHeatmap);

  const createTask = useCreateTask();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.getTasks('all', 'priority'),
  });

  const hasTasks = tasks.length > 0;

  const { data: oauthStatus } = useQuery({
    queryKey: ['oauth-status'],
    queryFn: api.getOAuthStatus,
    refetchInterval: 30000,
  });

  function handleSuggestionClick(text: string) {
    // Will be wired to chat
  }

  function handleAddTask(title: string) {
    createTask.mutate({ title });
  }

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
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-koala-purple/20 flex items-center justify-center">
            <Terminal className="size-3.5 text-koala-purple" />
          </div>
          <span className="text-[15px] font-semibold text-koala-bright font-[family-name:var(--font-cairo)]">
            زكي
          </span>
        </div>

        <div className="flex items-center gap-2">
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
          </div>

          <AccountSwitcher />
        </div>
      </header>

      {/* Main: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        {chatOpen && (
          <aside className="w-[240px] min-w-[240px] border-e border-border-subtle bg-surface">
            <ChatPanel />
          </aside>
        )}

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            {mainTab === 'tasks' ? (
              <TaskList />
            ) : (
              <YearlyHeatmap onDayClick={openDayDetail} />
            )}
          </div>
        </main>
      </div>

      {/* Day Detail Panel */}
      <DayDetailPanel
        date={dayDetailDate}
        open={dayDetailOpen}
        onClose={closeDayDetail}
      />
    </div>
  );
}
