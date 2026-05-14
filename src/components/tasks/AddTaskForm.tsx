'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Repeat } from 'lucide-react';
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
const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekdays', label: 'أيام العمل' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهري' },
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('daily');
  const createTask = useCreateTask();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const data: CreateTaskInput & { isRecurring?: boolean; recurrenceRule?: string } = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      category, priority,
      dueDatetime: dueDatetime || undefined,
      isRecurring: isRecurring || undefined,
      recurrenceRule: isRecurring ? recurrenceRule : undefined,
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

      {/* Recurring toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border-subtle">
        <div className="flex items-center gap-2">
          <Repeat className="size-4 text-koala-teal scale-x-[-1]" />
          <span className="text-[13px] text-koala-bright">مهمة متكررة</span>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
          className="data-[state=checked]:bg-koala-teal"
        />
      </div>

      {/* Recurrence rule selector */}
      {isRecurring && (
        <div className="flex flex-col gap-1.5 animate-slide-up">
          <Label className={lbl}>التكرار</Label>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecurrenceRule(opt.value)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-150 ${
                  recurrenceRule === opt.value
                    ? 'bg-koala-teal/15 text-koala-teal border border-koala-teal/30'
                    : 'bg-hover text-koala-secondary border border-border-subtle hover:text-koala-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={!title.trim() || createTask.isPending}
        className="bg-accent-blue hover:bg-accent-blue/80 text-base font-medium text-[13px]">
        أضف المهمة
      </Button>
    </form>
  );
}
