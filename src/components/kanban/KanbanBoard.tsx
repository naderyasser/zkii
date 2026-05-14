'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Clock, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import type { Task, TaskCategory, TaskPriority, BoardColumn } from '@/types';

/* ─── Column definitions ──────────────────────────────────── */
const COLUMNS: { id: BoardColumn; label: string; accent: string; dotClass: string }[] = [
  { id: 'todo', label: 'للتنفيذ', accent: 'text-accent-blue', dotClass: 'bg-accent-blue' },
  { id: 'in_progress', label: 'جاري التنفيذ', accent: 'text-koala-orange', dotClass: 'bg-koala-orange' },
  { id: 'review', label: 'مراجعة', accent: 'text-koala-purple', dotClass: 'bg-koala-purple' },
  { id: 'done', label: 'مكتمل', accent: 'text-koala-green', dotClass: 'bg-koala-green' },
];

/* ─── Mappings ────────────────────────────────────────────── */
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'bg-coral',
  high: 'bg-koala-orange',
  medium: 'bg-koala-yellow',
  low: 'bg-koala-teal',
};

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  urgent: 'عاجل',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  urgent: 'border-s-coral',
  high: 'border-s-koala-orange',
  medium: 'border-s-koala-yellow',
  low: 'border-s-koala-teal',
};

const CAT_LABEL: Record<TaskCategory, string> = {
  work: 'عمل',
  personal: 'شخصي',
  errands: 'مهمات',
  calls: 'مكالمات',
  reading: 'قراءة',
};

const CAT_STYLE: Record<TaskCategory, string> = {
  work: 'bg-accent-blue/10 text-accent-blue',
  personal: 'bg-koala-purple/10 text-koala-purple',
  errands: 'bg-koala-yellow/10 text-koala-yellow',
  calls: 'bg-coral/10 text-coral',
  reading: 'bg-koala-green/10 text-koala-green',
};

function formatDueDate(d: string | null): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `متأخر ${Math.abs(diffDays)} يوم`;
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    return `${diffDays} أيام`;
  } catch {
    return '';
  }
}

/* ─── Kanban Task Card (Sortable) ─────────────────────────── */
interface KanbanCardProps {
  task: Task;
  onFocusTask?: (task: Task) => void;
}

function KanbanCard({ task, onFocusTask }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cat = task.category as TaskCategory;
  const priority = task.priority as TaskPriority;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border border-border-subtle bg-surface overflow-hidden',
        'transition-colors duration-150 cursor-default',
        'hover:bg-hover hover:border-border-default',
        isDragging && 'opacity-50 shadow-lg',
      )}
      onClick={() => onFocusTask?.(task)}
    >
      {/* Priority start border */}
      <div className={cn('border-s-4', PRIORITY_BORDER[priority])}>
        <div className="p-3">
          {/* Drag handle + Title row */}
          <div className="flex items-start gap-2">
            <button
              className="mt-0.5 shrink-0 cursor-grab text-koala-secondary opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="اسحب المهمة"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-3.5 scale-x-[-1]" />
            </button>
            <span className="text-sm font-medium text-koala-bright leading-snug flex-1">
              {task.title}
            </span>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Priority badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-koala-primary">
              <span className={cn('size-1.5 rounded-full shrink-0', PRIORITY_COLORS[priority])} />
              {PRIORITY_TEXT[priority]}
            </span>

            {/* Category badge */}
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium',
              CAT_STYLE[cat] ?? 'bg-hover text-koala-secondary',
            )}>
              {CAT_LABEL[cat] ?? task.category}
            </span>
          </div>

          {/* Due date */}
          {task.dueDatetime && (
            <div className="flex items-center gap-1 mt-2">
              <Clock className="size-3 text-koala-secondary scale-x-[-1]" />
              <span className="text-[10px] text-koala-secondary">
                {formatDueDate(task.dueDatetime)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Drag Overlay Card (ghost while dragging) ────────────── */
function DragOverlayCard({ task }: { task: Task }) {
  const cat = task.category as TaskCategory;
  const priority = task.priority as TaskPriority;

  return (
    <div className="rounded-lg border border-border-default bg-elevated overflow-hidden shadow-xl shadow-black/30 w-[280px]">
      <div className={cn('border-s-4', PRIORITY_BORDER[priority])}>
        <div className="p-3">
          <div className="flex items-start gap-2">
            <GripVertical className="size-3.5 mt-0.5 shrink-0 text-koala-secondary scale-x-[-1]" />
            <span className="text-sm font-medium text-koala-bright leading-snug flex-1">
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-koala-primary">
              <span className={cn('size-1.5 rounded-full shrink-0', PRIORITY_COLORS[priority])} />
              {PRIORITY_TEXT[priority]}
            </span>
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium',
              CAT_STYLE[cat] ?? 'bg-hover text-koala-secondary',
            )}>
              {CAT_LABEL[cat] ?? task.category}
            </span>
          </div>
          {task.dueDatetime && (
            <div className="flex items-center gap-1 mt-2">
              <Clock className="size-3 text-koala-secondary scale-x-[-1]" />
              <span className="text-[10px] text-koala-secondary">
                {formatDueDate(task.dueDatetime)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Droppable Column Component ──────────────────────────── */
interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onFocusTask?: (task: Task) => void;
}

function KanbanColumn({ column, tasks, onFocusTask }: KanbanColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  // Make the column itself a droppable zone (for dropping into empty columns)
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] w-[280px] sm:min-w-[300px] sm:w-[300px] shrink-0',
        'rounded-xl bg-base/50 border border-border-subtle/50',
        'transition-colors duration-200',
        isOver && 'bg-hover/50 border-accent-blue/30',
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
        <span className={cn('size-2.5 rounded-full shrink-0', column.dotClass)} />
        <h3 className={cn('text-sm font-semibold', column.accent)}>
          {column.label}
        </h3>
        <span className="bg-hover rounded-full px-1.5 py-0.5 text-[10px] font-medium text-koala-secondary me-auto">
          {tasks.length}
        </span>
      </div>

      {/* Cards area */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 max-h-[calc(100vh-200px)] overflow-y-auto p-2 kanban-scroll">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Flag className="size-6 text-koala-secondary/40 mb-2 scale-x-[-1]" />
              <p className="text-[11px] text-koala-secondary">لا توجد مهام</p>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onFocusTask={onFocusTask} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ─── Main Kanban Board ───────────────────────────────────── */
interface KanbanBoardProps {
  onFocusTask?: (task: Task) => void;
}

export default function KanbanBoard({ onFocusTask }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Fetch all tasks for kanban view
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'kanban'],
    queryFn: () => api.getKanbanTasks(),
    staleTime: 30_000,
  });

  // Mutation for updating board column
  const updateBoardColumn = useMutation({
    mutationFn: ({ id, boardColumn }: { id: string; boardColumn: BoardColumn }) =>
      api.updateTask(id, { boardColumn } as Partial<Task>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<BoardColumn, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of tasks) {
      const col = (task.boardColumn as BoardColumn) || 'todo';
      if (grouped[col]) {
        grouped[col].push(task);
      } else {
        grouped.todo.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  // Build a lookup of task-id → column for quick access
  const taskColumnMap = useMemo(() => {
    const map = new Map<string, BoardColumn>();
    for (const col of COLUMNS) {
      for (const task of tasksByColumn[col.id]) {
        map.set(task.id, col.id);
      }
    }
    return map;
  }, [tasksByColumn]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Find the target column from an over ID
  const findTargetColumn = useCallback(
    (overId: string): BoardColumn | null => {
      // If over a column droppable directly
      if (COLUMNS.some((c) => c.id === overId)) {
        return overId as BoardColumn;
      }
      // If over a task, return that task's column
      const col = taskColumnMap.get(overId);
      return col ?? null;
    },
    [taskColumnMap]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (_event: DragOverEvent) => {
      // Visual feedback is handled by isOver on KanbanColumn
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const sourceColumn = taskColumnMap.get(activeId) ?? null;
      const targetColumn = findTargetColumn(overId);

      if (!sourceColumn || !targetColumn) return;
      if (sourceColumn === targetColumn) return;

      // Update the task's board column via API
      updateBoardColumn.mutate({ id: activeId, boardColumn: targetColumn });
    },
    [taskColumnMap, findTargetColumn, updateBoardColumn]
  );

  if (isLoading) {
    return (
      <div dir="rtl" className="flex gap-4 overflow-x-auto pb-4 kanban-scroll-x">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[280px] w-[280px] shrink-0 rounded-xl bg-base/50 border border-border-subtle/50">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
              <span className={cn('size-2.5 rounded-full shrink-0', col.dotClass)} />
              <h3 className={cn('text-sm font-semibold', col.accent)}>{col.label}</h3>
              <span className="bg-hover rounded-full px-1.5 py-0.5 text-[10px] font-medium text-koala-secondary me-auto">
                0
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border-subtle bg-surface p-3 animate-pulse"
                >
                  <div className="h-4 w-3/4 rounded bg-hover mb-2" />
                  <div className="h-3 w-1/2 rounded bg-hover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div dir="rtl">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll-x">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn[col.id]}
              onFocusTask={onFocusTask}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'ease',
        }}>
          {activeTask ? <DragOverlayCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
