import { db } from '@/lib/db';

export const DEFAULT_USER_ID = 'cmp4wfs1q0000jkubmtfn4mhc';

export interface TaskWithComputed {
  id: string;
  userId: string;
  title: string;
  notes: string;
  category: string;
  priority: string;
  status: string;
  dueDatetime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
  recurrenceRule: string;
  source: string;
  sourceEmailId: string;
  aiScore: number;
  daysUntilDue: number | null;
  pressureLevel: 'chill' | 'normal' | 'urgent' | 'overdue';
}

const PRIORITY_IMPORTANCE: Record<string, number> = {
  urgent: 10,
  high: 7,
  medium: 4,
  low: 1,
};

export function computeDaysUntilDue(dueDatetime: string | null): number | null {
  if (!dueDatetime) return null;
  const now = new Date();
  const due = new Date(dueDatetime);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function computePressureLevel(
  daysUntilDue: number | null,
  priority: string
): 'chill' | 'normal' | 'urgent' | 'overdue' {
  if (daysUntilDue === null) return 'chill';
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue === 0) return 'urgent';
  if (daysUntilDue <= 2) return priority === 'urgent' || priority === 'high' ? 'urgent' : 'normal';
  return 'chill';
}

export function computeAiScore(daysUntilDue: number | null, priority: string): number {
  const urgency = daysUntilDue !== null ? Math.max(0, 10 - daysUntilDue) : 0;
  const importance = PRIORITY_IMPORTANCE[priority] ?? 4;
  return parseFloat((urgency * 0.6 + importance * 0.4).toFixed(2));
}

export function enrichTask(task: Record<string, unknown>): TaskWithComputed {
  const daysUntilDue = computeDaysUntilDue(task.dueDatetime as string | null);
  const pressureLevel = computePressureLevel(daysUntilDue, task.priority as string);
  return {
    id: task.id as string,
    userId: task.userId as string,
    title: task.title as string,
    notes: (task.notes as string) ?? '',
    category: (task.category as string) ?? 'work',
    priority: (task.priority as string) ?? 'medium',
    status: (task.status as string) ?? 'pending',
    dueDatetime: task.dueDatetime as string | null,
    completedAt: task.completedAt as string | null,
    createdAt: task.createdAt as string,
    updatedAt: task.updatedAt as string,
    isRecurring: (task.isRecurring as boolean) ?? false,
    recurrenceRule: (task.recurrenceRule as string) ?? '',
    source: (task.source as string) ?? 'manual',
    sourceEmailId: (task.sourceEmailId as string) ?? '',
    aiScore: task.aiScore as number,
    daysUntilDue,
    pressureLevel,
  };
}

export async function getUserTasks(userId: string = DEFAULT_USER_ID) {
  return db.task.findMany({
    where: { userId },
    orderBy: { aiScore: 'desc' },
  });
}
