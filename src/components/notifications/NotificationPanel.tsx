'use client';

import { AlertTriangle, Clock, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/store/notifications';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  overdue: {
    icon: AlertTriangle,
    color: 'text-coral',
    label: 'متأخرة',
  },
  due_today: {
    icon: Clock,
    color: 'text-koala-orange',
    label: 'مطلوبة اليوم',
  },
  due_soon: {
    icon: Bell,
    color: 'text-koala-yellow',
    label: 'قريباً',
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-coral',
  high: 'bg-koala-orange',
  medium: 'bg-koala-yellow',
  low: 'bg-koala-teal',
};

function formatOverdueLabel(daysOverdue?: number): string {
  if (!daysOverdue || daysOverdue <= 0) return 'متأخرة';
  if (daysOverdue === 1) return 'متأخرة يوم واحد';
  if (daysOverdue === 2) return 'متأخرة يومان';
  if (daysOverdue <= 10) return `متأخرة ${daysOverdue} أيام`;
  return `متأخرة ${daysOverdue} يوم`;
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;
  const priorityColor = PRIORITY_COLORS[notification.priority] ?? 'bg-koala-yellow';

  const contextLabel =
    notification.type === 'overdue'
      ? formatOverdueLabel(notification.daysOverdue)
      : config.label;

  return (
    <button
      dir="rtl"
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-hover transition-colors text-right"
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className={`size-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <span className={`size-1.5 rounded-full shrink-0 ${priorityColor}`} />
          <span className="text-[12px] font-medium text-koala-bright truncate">
            {notification.taskTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[11px] ${config.color}`}>{contextLabel}</span>
          {!notification.read && (
            <span className="size-1.5 rounded-full bg-coral shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function NotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const hasNotifications = notifications.length > 0;

  return (
    <div dir="rtl" className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[13px] font-semibold text-koala-bright">
          الإشعارات
        </span>
        {hasNotifications && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-koala-secondary hover:text-koala-bright hover:bg-hover gap-1"
              onClick={markAllRead}
            >
              <CheckCheck className="size-3" />
              قراءة الكل
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-koala-secondary hover:text-coral hover:bg-coral/10 gap-1"
              onClick={clearAll}
            >
              <Trash2 className="size-3" />
              مسح الكل
            </Button>
          </div>
        )}
      </div>

      <Separator className="bg-border-subtle" />

      {/* Notification list */}
      {hasNotifications ? (
        <div className="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
          <Bell className="size-8 text-koala-muted" />
          <p className="text-[12px] text-koala-secondary">لا توجد إشعارات</p>
          <p className="text-[11px] text-koala-muted">
            ستظهر هنا المهام المتأخرة أو المطلوبة اليوم
          </p>
        </div>
      )}
    </div>
  );
}
