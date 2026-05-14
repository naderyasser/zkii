'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import type { TaskCategory, TaskPriority, CreateTaskInput } from '@/types';

const CATS: { value: TaskCategory; label: string }[] = [
  { value: 'work', label: 'شغل' }, { value: 'personal', label: 'شخصي' },
  { value: 'errands', label: 'مهام' }, { value: 'calls', label: 'مكالمات' },
  { value: 'reading', label: 'قراءة' },
];
const PRIOS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'عاجل' }, { value: 'high', label: 'عالي' },
  { value: 'medium', label: 'متوسط' }, { value: 'low', label: 'منخفض' },
];

const field = 'bg-elevated border-border-subtle text-koala-bright text-[13px]';
const lbl = 'text-koala-primary text-[12px]';

interface AddTaskFormProps {
  initialTitle: string;
  onSuccess: () => void;
}

export default function AddTaskForm({ initialTitle, onSuccess }: AddTaskFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDatetime, setDueDatetime] = useState('');
  const createTask = useCreateTask();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const data: CreateTaskInput = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      category, priority,
      dueDatetime: dueDatetime || undefined,
    };
    createTask.mutate(data, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" dir="rtl">
      <div className="flex flex-col gap-1.5">
        <Label className={lbl}>عنوان المهمة</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className={lbl}>ملاحظات</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className={lbl}>التصنيف</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger className={field}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface border-border-subtle">
              {CATS.map((c) => <SelectItem key={c.value} value={c.value} className="text-koala-primary">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className={lbl}>الأولوية</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className={field}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface border-border-subtle">
              {PRIOS.map((p) => <SelectItem key={p.value} value={p.value} className="text-koala-primary">{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className={lbl}>تاريخ الاستحقاق</Label>
        <Input type="datetime-local" value={dueDatetime} onChange={(e) => setDueDatetime(e.target.value)} className={field} />
      </div>
      <Button type="submit" disabled={!title.trim() || createTask.isPending}
        className="bg-accent-blue hover:bg-accent-blue/80 text-base font-medium text-[13px]">
        أضف المهمة
      </Button>
    </form>
  );
}
