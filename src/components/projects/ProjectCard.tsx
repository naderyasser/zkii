'use client';

import { motion } from 'framer-motion';
import { Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteProject } from '@/hooks/useProjects';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  className?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ProjectCard({ project, className }: ProjectCardProps) {
  const deleteProject = useDeleteProject();

  const taskCount = project.taskCount ?? project.tasks?.length ?? 0;
  const doneCount = project.doneCount ?? project.tasks?.filter((t) => t.status === 'done').length ?? 0;
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject.mutate(project.id);
  };

  return (
    <motion.div
      dir="rtl"
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-surface border border-border-subtle',
        'transition-shadow duration-200',
        'cursor-pointer group',
        className
      )}
      style={{
        borderRightWidth: '3px',
        borderRightColor: project.color,
      }}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top: Icon + Name + Delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-xl shrink-0 size-8 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: hexToRgba(project.color, 0.12) }}
            >
              {project.icon}
            </span>
            <h3 className="text-[14px] font-semibold text-koala-bright truncate">
              {project.name}
            </h3>
          </div>

          <button
            onClick={handleDelete}
            className={cn(
              'shrink-0 size-6 flex items-center justify-center rounded-md',
              'text-koala-muted transition-all duration-150',
              'opacity-0 group-hover:opacity-100',
              'hover:text-coral hover:bg-coral/10'
            )}
            aria-label={`حذف ${project.name}`}
          >
            <Trash2 className="size-3.5 scale-x-[-1]" />
          </button>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-[12px] text-koala-secondary leading-relaxed line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Progress bar */}
        {taskCount > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 w-full rounded-full bg-hover overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: project.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-koala-secondary">
              {doneCount}/{taskCount} مكتمل
            </span>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-1">
          {/* Task count badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5',
              'text-[10px] font-medium',
            )}
            style={{
              backgroundColor: hexToRgba(project.color, 0.08),
              color: project.color,
            }}
          >
            <FolderOpen className="size-2.5 scale-x-[-1]" />
            {taskCount} {taskCount === 1 ? 'مهمة' : 'مهام'}
          </span>

          {/* Created date */}
          <span className="text-[10px] text-koala-muted">
            {formatDate(project.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
