'use client';

import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui-koala/Skeleton';
import TaskRow from '@/components/tasks/TaskRow';
import TaskFilters from '@/components/tasks/TaskFilters';
import AddTaskInput from '@/components/tasks/AddTaskInput';
import type { Task } from '@/types';

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center rounded-[10px] bg-surface border border-border-subtle overflow-hidden p-3 gap-3"
        >
          <div className="w-1 self-stretch rounded bg-border-subtle" />
          <Skeleton width="16px" height="16px" />
          <Skeleton width={`${55 + i * 15}%`} height="14px" />
          <Skeleton width="48px" height="16px" />
        </div>
      ))}
    </div>
  );
}

function sortTasks(tasks: Task[]): Task[] {
  const pending = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  return [...pending, ...done];
}

export default function TaskList() {
  const { data: tasks, isLoading } = useTasks();

  const sortedTasks = tasks ? sortTasks(tasks) : [];
  const hasTasks = sortedTasks.length > 0;

  return (
    <section className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-koala-bright">
            المهام
          </h2>
        </div>
        <AddTaskInput />
      </div>

      {/* Filters */}
      <TaskFilters />

      {/* Task list */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : hasTasks ? (
        <div className="flex flex-col gap-2">
          {sortedTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
