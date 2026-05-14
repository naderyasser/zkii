'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Zap, Repeat, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PriorityBorder } from '@/components/ui-koala/PriorityBorder';
import TagBadge from '@/components/tags/TagBadge';
import TagPicker from '@/components/tags/TagPicker';
import { useCompleteTask, useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { useTags, useTaskTags, useAddTagToTask, useRemoveTagFromTask, useCreateTag } from '@/hooks/useTags';
import type { Task, TaskCategory } from '@/types';

const CAT_STYLE: Record<TaskCategory, string> = {
  work: 'bg-accent-blue/10 text-accent-blue', personal: 'bg-koala-purple/10 text-koala-purple',
  errands: 'bg-koala-yellow/10 text-koala-yellow', calls: 'bg-coral/10 text-coral',
  reading: 'bg-koala-green/10 text-koala-green',
};
const CAT_LABEL: Record<TaskCategory, string> = {
  work: 'شغل', personal: 'شخصي', errands: 'مهام', calls: 'مكالمات', reading: 'قراءة',
};

function formatDue(d: string | null): string {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ar }); } catch { return ''; }
}

interface TaskRowProps {
  task: Task;
  onFocus?: (task: Task) => void;
}

export default function TaskRow({ task, onFocus }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.title);
  const [justChecked, setJustChecked] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  const complete = useCompleteTask();
  const remove = useDeleteTask();
  const update = useUpdateTask();

  // Tags
  const { data: allTags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags(task.id);
  const addTagMutation = useAddTagToTask();
  const removeTagMutation = useRemoveTagFromTask();
  const createTagMutation = useCreateTag();

  const isDone = task.status === 'done';
  const isOverdue = task.pressureLevel === 'overdue' && !isDone;
  const cat = task.category as TaskCategory;

  useEffect(() => {
    if (editing && editRef.current) { editRef.current.focus(); editRef.current.select(); }
  }, [editing]);

  function handleCheck() {
    if (isDone) return;
    setJustChecked(true);
    complete.mutate(task.id);
    setTimeout(() => setJustChecked(false), 200);
  }

  function saveEdit() {
    const t = editVal.trim();
    if (t && t !== task.title) update.mutate({ id: task.id, data: { title: t } });
    setEditing(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditVal(task.title); }
  }

  return (
    <div className={cn(
      'group flex flex-col rounded-[10px] border border-border-subtle overflow-hidden',
      'bg-surface transition-colors duration-150 hover:bg-hover',
      isOverdue && 'bg-coral/6', isDone && 'opacity-60',
    )}>
      <div className="flex items-center">
        <PriorityBorder priority={task.priority} />
        <div className="ps-3 py-3">
          <Checkbox checked={isDone} onCheckedChange={handleCheck}
            disabled={isDone || complete.isPending} className={justChecked ? 'animate-check-in' : ''} />
        </div>
        <div className="ps-3 flex-1 min-w-0">
          {editing ? (
            <Input ref={editRef} value={editVal} onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={onKey} onBlur={saveEdit} disabled={update.isPending}
              className="h-6 text-[13px] bg-elevated border-border-default text-koala-bright px-1 py-0" />
          ) : (
            <span onClick={() => !isDone && (setEditVal(task.title), setEditing(true))}
              className={cn('text-[13px] font-medium cursor-text',
                isDone ? 'line-through text-koala-muted' : 'text-koala-bright')}>
              {task.title}
            </span>
          )}
        </div>
        <span className={cn('shrink-0 rounded-[4px] px-2 py-0.5 text-[9px] font-medium ms-2',
          CAT_STYLE[cat] ?? 'bg-hover text-koala-secondary')}>
          {CAT_LABEL[cat] ?? task.category}
        </span>
        {task.dueDatetime && (
          <span className="shrink-0 text-[9px] font-mono text-koala-secondary ms-3 me-3">
            {formatDue(task.dueDatetime)}
          </span>
        )}
        {/* Recurring indicator */}
        {task.isRecurring && (
          <span className="shrink-0 ms-1" title="مهمة متكررة">
            <Repeat className="size-3 text-koala-teal scale-x-[-1]" />
          </span>
        )}
        {/* Tag toggle button */}
        <button onClick={() => setShowTags(!showTags)} aria-label="الوسوم"
          className="shrink-0 py-3 text-koala-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-koala-purple ms-1">
          <Tag className="size-3.5 scale-x-[-1]" />
        </button>
        {/* Focus mode button - only for pending tasks */}
        {!isDone && onFocus && (
          <button onClick={() => onFocus(task)} aria-label="وضع التركيز"
            className="shrink-0 py-3 text-koala-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-koala-green ms-1">
            <Zap className="size-3.5 scale-x-[-1]" />
          </button>
        )}
        <button onClick={() => remove.mutate(task.id)} aria-label="حذف المهمة"
          className="shrink-0 pe-3 py-3 text-koala-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-coral">
          <Trash2 className="size-3.5 scale-x-[-1]" />
        </button>
      </div>

      {/* Tags row */}
      {(taskTags.length > 0 || showTags) && (
        <div className="flex items-center gap-1.5 px-3 pb-2 pt-0 border-t border-border-subtle/50">
          {taskTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              removable
              onRemove={(tagId) => removeTagMutation.mutate({ taskId: task.id, tagId })}
            />
          ))}
          {showTags && (
            <TagPicker
              allTags={allTags}
              assignedTags={taskTags}
              onAddTag={(tagId) => addTagMutation.mutate({ taskId: task.id, tagId })}
              onRemoveTag={(tagId) => removeTagMutation.mutate({ taskId: task.id, tagId })}
              onCreateTag={async (name, color) => {
                const newTag = await createTagMutation.mutateAsync({ name, color });
                addTagMutation.mutate({ taskId: task.id, tagId: newTag.id });
                return newTag;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
