'use client';

import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { Skeleton } from '@/components/ui-koala/Skeleton';
import ProjectCard from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

/* ─── Constants ──────────────────────────────────────────── */
const PROJECT_ICONS = ['📁', '💼', '🎨', '🏗️', '📱', '🔬', '🎓', '💡', '🚀', '🏠', '📊', '🎮'] as const;

const PROJECT_COLORS = [
  '#7aa2f7',
  '#bb9af7',
  '#73daca',
  '#e94560',
  '#e0af68',
  '#9ece6a',
] as const;

/* ─── Loading Skeleton ───────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl bg-surface border border-border-subtle p-4"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton width="32px" height="32px" className="rounded-lg" />
            <Skeleton width={`${50 + i * 10}%`} height="14px" />
          </div>
          <Skeleton width="80%" height="12px" />
          <Skeleton width="100%" height="6px" className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className={cn(
          'size-16 rounded-full flex items-center justify-center mb-4',
          'bg-koala-teal/15 text-koala-teal',
          'ring-2 ring-koala-teal/25'
        )}
      >
        <FolderOpen className="size-7 scale-x-[-1]" />
      </div>
      <h3 className="text-[15px] font-semibold text-koala-bright mb-1.5">
        لا توجد مشاريع بعد
      </h3>
      <p className="text-[12px] text-koala-secondary max-w-[240px] leading-relaxed">
        أنشئ مشروعًا لتنظيم مهامك في مجموعات منطقية وتتبع تقدمك بسهولة
      </p>
    </div>
  );
}

/* ─── Add Project Dialog ─────────────────────────────────── */
interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddProjectDialog({ open, onOpenChange }: AddProjectDialogProps) {
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>(PROJECT_ICONS[0]);
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon(PROJECT_ICONS[0]);
    setColor(PROJECT_COLORS[0]);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        dir="rtl"
        className="bg-surface border-border-subtle sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-koala-bright text-right">
            مشروع جديد
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary font-medium">
              اسم المشروع
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشروع التخرج"
              className="bg-base border-border-subtle text-koala-bright placeholder:text-koala-muted text-[13px] h-9"
              dir="rtl"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary font-medium">
              الوصف
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للمشروع..."
              className="bg-base border-border-subtle text-koala-bright placeholder:text-koala-muted text-[13px] min-h-[60px] resize-none"
              dir="rtl"
            />
          </div>

          {/* Icon Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary font-medium">
              الأيقونة
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {PROJECT_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'size-9 flex items-center justify-center rounded-lg text-base',
                    'border transition-all duration-150',
                    icon === emoji
                      ? 'border-accent-blue bg-accent-blue/15 scale-110'
                      : 'border-border-subtle bg-base hover:border-border-default hover:bg-hover'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-koala-secondary font-medium">
              اللون
            </label>
            <div className="flex items-center gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-all duration-150',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-offset-surface scale-110'
                      : 'hover:scale-110'
                  )}
                  style={{
                    backgroundColor: c,
                    ringColor: color === c ? c : undefined,
                  }}
                  aria-label={`لون ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-start">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createProject.isPending}
            className={cn(
              'bg-accent-blue/15 text-accent-blue border border-accent-blue/25',
              'hover:bg-accent-blue/25 hover:border-accent-blue/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
            variant="ghost"
          >
            {createProject.isPending ? 'جارٍ الإنشاء...' : 'إنشاء المشروع'}
          </Button>
          <Button
            onClick={() => handleOpenChange(false)}
            variant="ghost"
            className="text-koala-secondary hover:text-koala-primary hover:bg-hover"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main ProjectList Component ─────────────────────────── */
export default function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasProjects = projects && projects.length > 0;

  return (
    <section className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-koala-bright">
          المشاريع
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
            'text-accent-blue hover:text-accent-blue hover:bg-accent-blue/10',
            'transition-colors duration-150'
          )}
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5 scale-x-[-1]" />
          مشروع جديد
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : hasProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects!.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyProjects />
      )}

      {/* Add Project Dialog */}
      <AddProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}
