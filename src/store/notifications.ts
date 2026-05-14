import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'overdue' | 'due_today' | 'due_soon';
  taskId: string;
  taskTitle: string;
  priority: string;
  timestamp: number;
  read: boolean;
  daysOverdue?: number;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;

  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setNotifications: (n) =>
    set({
      notifications: n,
      unreadCount: n.filter((x) => !x.read).length,
    }),

  addNotification: (n) =>
    set((s) => {
      const exists = s.notifications.some((x) => x.taskId === n.taskId && x.type === n.type);
      if (exists) return s;
      const updated = [n, ...s.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((x) => !x.read).length,
      };
    }),

  markRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((x) => !x.read).length,
      };
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}));
