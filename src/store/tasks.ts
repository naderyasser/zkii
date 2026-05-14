import { create } from 'zustand';

type TaskFilter = 'all' | 'today' | 'overdue' | 'done';

interface TasksStore {
  activeFilter: TaskFilter;
  selectedTaskId: string | null;

  setFilter: (filter: TaskFilter) => void;
  selectTask: (id: string | null) => void;
}

export const useTasksStore = create<TasksStore>((set) => ({
  activeFilter: 'all',
  selectedTaskId: null,

  setFilter: (filter) => set({ activeFilter: filter }),
  selectTask: (id) => set({ selectedTaskId: id }),
}));
