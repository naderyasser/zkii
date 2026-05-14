'use client';

import { useState, useEffect } from 'react';
import { Terminal, PanelRightOpen, PanelRightClose, Activity, ListTodo } from 'lucide-react';
import WeeklyScore from '@/components/WeeklyScore';
import TaskList from '@/components/TaskList';
import YearlyHeatmap from '@/components/YearlyHeatmap';
import ChatPanel from '@/components/ChatPanel';
import PomodoroTimer from '@/components/PomodoroTimer';
import DayDetailModal from '@/components/DayDetailModal';
import IntegrationsPanel from '@/components/IntegrationsPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type MainTab = 'tasks' | 'heatmap';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('tasks');
  const { toast } = useToast();

  // ─── Handle OAuth callback redirects ──────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');

    if (oauthSuccess === 'google') {
      toast({
        title: 'تم ربط Google ✓',
        description: 'حساب Google متصل بنجاح — تقدر تستخدم Gmail و Calendar دلوقتي',
        variant: 'default',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }

    if (oauthError) {
      const errorMessages: Record<string, string> = {
        access_denied: 'تم رفض الوصول — محتاج تسمح بالأذونات',
        no_code: 'لم يتم استلام كود التفويض',
        missing_tokens: 'لم يتم استلام التوكنز من Google',
        token_exchange_failed: 'فشل تبادل الكود — حاول تاني',
      };
      toast({
        title: 'فشل ربط Google',
        description: errorMessages[oauthError] || `خطأ: ${oauthError}`,
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [toast]);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setDayDetailOpen(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark:cyber-scanline">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center dark:neon-border-glow">
              <Terminal className="size-4 text-accent-brand" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-accent-brand dark:neon-glow-subtle tracking-wide">زكي</h1>
              <p className="text-[10px] text-muted-foreground font-mono -mt-0.5">v3.0 // مساعدك التقني الذكي + Google</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WeeklyScore />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-accent-brand hover:bg-accent-brand/10 border border-border"
              onClick={() => setChatOpen((prev) => !prev)}
              title={chatOpen ? 'إخفاء الشات' : 'إظهار الشات'}
            >
              {chatOpen ? (
                <PanelRightClose className="size-4" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content: Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            {/* Pomodoro Pill Widget */}
            <PomodoroTimer />

            {/* Tab switcher + Integrations */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-alt border border-border w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-7 px-3 rounded-md transition-all ${
                    mainTab === 'tasks'
                      ? 'bg-card text-accent-brand shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMainTab('tasks')}
                >
                  <ListTodo className="size-3.5 ml-1.5" />
                  المهام
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-7 px-3 rounded-md transition-all ${
                    mainTab === 'heatmap'
                      ? 'bg-card text-accent-brand shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMainTab('heatmap')}
                >
                  <Activity className="size-3.5 ml-1.5" />
                  خريطة النشاط
                </Button>
              </div>

              {/* Google Integration mini-widget */}
              <div className="flex-1 min-w-[200px] max-w-[320px]">
                <IntegrationsPanel />
              </div>
            </div>

            {/* Main content */}
            {mainTab === 'tasks' ? (
              <TaskList />
            ) : (
              <YearlyHeatmap onDayClick={handleDayClick} />
            )}
          </div>
        </main>

        {/* Chat Sidebar — slightly different shade for depth */}
        <aside
          className={`border-r border-border bg-sidebar transition-all duration-300 ease-in-out overflow-hidden ${
            chatOpen ? 'w-[380px] min-w-[340px]' : 'w-0 min-w-0'
          }`}
        >
          <div className="w-[380px] h-full">
            <ChatPanel />
          </div>
        </aside>
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        date={selectedDate}
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
      />
    </div>
  );
}
