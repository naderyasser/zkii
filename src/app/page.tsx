'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import WeeklyScore from '@/components/WeeklyScore';
import TaskList from '@/components/TaskList';
import YearlyHeatmap from '@/components/YearlyHeatmap';
import ChatPanel from '@/components/ChatPanel';
import DayDetailModal from '@/components/DayDetailModal';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setDayDetailOpen(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-50/50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-purple-800">زكي</h1>
              <p className="text-[11px] text-purple-500 -mt-0.5">مساعدك الشخصي الذكي</p>
            </div>
          </div>
          <WeeklyScore />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Tasks & Heatmap */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <TaskList />
            <YearlyHeatmap onDayClick={handleDayClick} />
          </div>

          {/* Right column - Chat */}
          <div className="lg:col-span-1">
            <ChatPanel />
          </div>
        </div>
      </main>

      {/* Day Detail Modal */}
      <DayDetailModal
        date={selectedDate}
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
      />
    </div>
  );
}
