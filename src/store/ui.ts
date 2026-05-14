import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  heatmapExpanded: boolean;
  chatOpen: boolean;
  dayDetailDate: string | null;
  dayDetailOpen: boolean;

  toggleSidebar: () => void;
  toggleHeatmap: () => void;
  toggleChat: () => void;
  openDayDetail: (date: string) => void;
  closeDayDetail: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  heatmapExpanded: false,
  chatOpen: true,
  dayDetailDate: null,
  dayDetailOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleHeatmap: () => set((s) => ({ heatmapExpanded: !s.heatmapExpanded })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openDayDetail: (date) => set({ dayDetailDate: date, dayDetailOpen: true }),
  closeDayDetail: () => set({ dayDetailOpen: false, dayDetailDate: null }),
}));
