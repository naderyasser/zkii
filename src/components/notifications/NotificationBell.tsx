'use client';

import { Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useNotificationStore } from '@/store/notifications';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isOpen = useNotificationStore((s) => s.isOpen);
  const setOpen = useNotificationStore((s) => s.setOpen);

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-7 w-7 inline-flex items-center justify-center rounded-md text-koala-secondary hover:text-koala-bright hover:bg-hover transition-colors"
          aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروء)` : ''}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -start-0.5 flex size-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-white leading-none min-w-[16px] px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 p-0 rounded-[10px] border border-border-subtle bg-elevated shadow-lg"
      >
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
}
