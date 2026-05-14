'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: 'work', label: 'شغل' },
  { value: 'personal', label: 'شخصي' },
  { value: 'errands', label: 'مهام' },
  { value: 'calls', label: 'مكالمات' },
  { value: 'reading', label: 'قراءة' },
];

const priorities = [
  { value: 'urgent', label: 'عاجل' },
  { value: 'high', label: 'عالي' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'منخفض' },
];

export default function AddTaskDialog({ open, onOpenChange }: AddTaskDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('work');
  const [priority, setPriority] = useState('medium');
  const [dueDatetime, setDueDatetime] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      notes?: string;
      category?: string;
      priority?: string;
      dueDatetime?: string;
    }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
      resetForm();
      onOpenChange(false);
    },
  });

  function resetForm() {
    setTitle('');
    setNotes('');
    setCategory('work');
    setPriority('medium');
    setDueDatetime('');
    setShowDetails(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      notes: notes.trim() || undefined,
      category,
      priority,
      dueDatetime: dueDatetime || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-purple-800">مهمة جديدة</DialogTitle>
          <DialogDescription>أضف مهمة جديدة لقائمتك</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">عنوان المهمة *</Label>
            <Input
              id="task-title"
              placeholder="مثلاً: إنهاز التقرير"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {!showDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-purple-600 hover:text-purple-700 text-xs"
              onClick={() => setShowDetails(true)}
            >
              خيارات أكتر ▾
            </Button>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-notes">ملاحظات</Label>
                <Textarea
                  id="task-notes"
                  placeholder="أضف ملاحظات..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>التصنيف</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>الأولوية</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due">تاريخ الاستحقاق</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={dueDatetime}
                  onChange={(e) => setDueDatetime(e.target.value)}
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin ml-1.5" />
                جاري الإضافة...
              </>
            ) : (
              'أضف المهمة'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
