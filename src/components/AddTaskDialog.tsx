'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-accent-brand flex items-center gap-2">
            <Plus className="size-4" />
            مهمة جديدة
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-mono">{'$ add-task'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-foreground">عنوان المهمة *</Label>
            <Input
              id="task-title"
              placeholder="مثلاً: إنهاء التقرير"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="bg-surface-alt border-border text-foreground placeholder:text-muted-foreground focus:border-accent-brand/50 focus:ring-accent-brand/20"
            />
          </div>

          {!showDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-accent-brand hover:text-accent-brand hover:bg-accent-brand/10 text-xs font-mono"
              onClick={() => setShowDetails(true)}
            >
              {'> خيارات أكتر'}
            </Button>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-notes" className="text-foreground">ملاحظات</Label>
                <Textarea
                  id="task-notes"
                  placeholder="أضف ملاحظات..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="bg-surface-alt border-border text-foreground placeholder:text-muted-foreground focus:border-accent-brand/50 focus:ring-accent-brand/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-foreground">التصنيف</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full bg-surface-alt border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-foreground focus:bg-accent-brand/10 focus:text-accent-brand">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-foreground">الأولوية</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full bg-surface-alt border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-foreground focus:bg-accent-brand/10 focus:text-accent-brand">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due" className="text-foreground">تاريخ الاستحقاق</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={dueDatetime}
                  onChange={(e) => setDueDatetime(e.target.value)}
                  className="bg-surface-alt border-border text-foreground focus:border-accent-brand/50 focus:ring-accent-brand/20"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="bg-accent-brand hover:bg-accent-brand-dim text-background font-semibold"
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
