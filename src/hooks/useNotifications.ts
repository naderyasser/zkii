'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore, type Notification } from '@/store/notifications';
import { toast } from '@/hooks/use-toast';
import type { Task } from '@/types';

/* ── Helper: compute days overdue ────────────────────────── */
function getDaysOverdue(dueDatetime: string | null): number {
  if (!dueDatetime) return 0;
  const now = new Date();
  const due = new Date(dueDatetime);
  const diffMs = now.getTime() - due.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/* ── Helper: determine notification type from task ───────── */
function getNotificationType(task: Task): Notification['type'] {
  if (task.dueDatetime) {
    const now = new Date();
    const due = new Date(task.dueDatetime);
    if (due < now) return 'overdue';

    const todayStr = now.toISOString().split('T')[0];
    const dueStr = due.toISOString().split('T')[0];
    if (dueStr === todayStr) return 'due_today';
  }
  return 'due_soon';
}

/* ── Convert API tasks → Notification objects ────────────── */
function tasksToNotifications(tasks: Task[]): Notification[] {
  return tasks.map((task) => {
    const type = getNotificationType(task);
    return {
      id: `notif-${type}-${task.id}`,
      type,
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      timestamp: Date.now(),
      read: false,
      daysOverdue: type === 'overdue' ? getDaysOverdue(task.dueDatetime) : undefined,
    };
  });
}

/* ── The Hook ────────────────────────────────────────────── */
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useNotifications() {
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const currentNotifications = useNotificationStore((s) => s.notifications);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [overdueRes, todayRes] = await Promise.all([
        fetch('/api/tasks/overdue'),
        fetch('/api/tasks/today'),
      ]);

      if (!overdueRes.ok || !todayRes.ok) return;

      const overdueTasks: Task[] = await overdueRes.json();
      const todayTasks: Task[] = await todayRes.json();

      // Deduplicate: overdue tasks are also in today's list
      const overdueIds = new Set(overdueTasks.map((t) => t.id));
      const onlyTodayTasks = todayTasks.filter((t) => !overdueIds.has(t.id));

      const allNotifications = [
        ...tasksToNotifications(overdueTasks),
        ...tasksToNotifications(onlyTodayTasks),
      ];

      // Preserve read state from existing notifications
      const readMap = new Map(
        currentNotifications.map((n) => [n.id, n.read])
      );
      const merged = allNotifications.map((n) => ({
        ...n,
        read: readMap.get(n.id) ?? false,
      }));

      setNotifications(merged);

      // Show toasts for NEW overdue items (not on first fetch)
      if (!isFirstFetchRef.current) {
        const newTaskIds = new Set(
          allNotifications
            .filter((n) => n.type === 'overdue')
            .map((n) => n.taskId)
        );
        const brandNew = [...newTaskIds].filter(
          (id) => !prevTaskIdsRef.current.has(id)
        );
        for (const taskId of brandNew) {
          const notif = allNotifications.find((n) => n.taskId === taskId);
          if (notif) {
            toast({
              title: '⚠️ مهمة متأخرة',
              description: notif.taskTitle,
              variant: 'destructive',
            });
          }
        }
      }

      // Track overdue task IDs for diffing
      prevTaskIdsRef.current = new Set(
        allNotifications
          .filter((n) => n.type === 'overdue')
          .map((n) => n.taskId)
      );
      isFirstFetchRef.current = false;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [setNotifications, currentNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);
}
