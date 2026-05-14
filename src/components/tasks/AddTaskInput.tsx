'use client';

import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTask } from '@/hooks/useTasks';
import AddTaskForm from '@/components/tasks/AddTaskForm';

export default function AddTaskInput() {
  const [quickValue, setQuickValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const createTask = useCreateTask();

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!quickValue.trim()) return;
      createTask.mutate({ title: quickValue.trim(), category: 'work', priority: 'medium' });
      setQuickValue('');
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      openDialog();
    }
  }

  function openDialog() {
    setDialogOpen(true);
  }

  function handleQuickSend() {
    if (!quickValue.trim()) return;
    createTask.mutate({ title: quickValue.trim(), category: 'work', priority: 'medium' });
    setQuickValue('');
  }

  function handleDialogSuccess() {
    setDialogOpen(false);
    setQuickValue('');
  }

  const hasValue = quickValue.trim().length > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          value={quickValue}
          onChange={(e) => setQuickValue(e.target.value)}
          onKeyDown={handleQuickKeyDown}
          placeholder="مهمة جديدة... اضغط Enter للحفظ"
          className="flex-1 bg-transparent text-[13px] text-koala-bright placeholder:text-koala-muted outline-none font-arabic"
          dir="rtl"
        />
        <button onClick={openDialog}
          className="text-koala-secondary hover:text-koala-primary transition-opacity duration-150"
          aria-label="خيارات إضافية">
          <Plus className="size-4 scale-x-[-1]" />
        </button>
        <button onClick={handleQuickSend} aria-label="إرسال"
          className={cn('transition-opacity duration-150',
            hasValue ? 'opacity-100 text-accent-blue' : 'opacity-0 pointer-events-none')}>
          <Send className="size-4 scale-x-[-1]" />
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-subtle max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-koala-bright text-[15px]">مهمة جديدة</DialogTitle>
          </DialogHeader>
          <AddTaskForm initialTitle={quickValue} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
