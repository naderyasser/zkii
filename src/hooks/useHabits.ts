import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Habit, HabitLog, CreateHabitInput } from '@/types';

/* ─── All Habits ──────────────────────────────────────────── */
export function useHabits() {
  return useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => api.getHabits(),
    staleTime: 30_000,
  });
}

/* ─── Create Habit ────────────────────────────────────────── */
export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHabitInput) => api.createHabit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

/* ─── Delete Habit ────────────────────────────────────────── */
export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

/* ─── Toggle Habit ────────────────────────────────────────── */
export function useToggleHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.toggleHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

/* ─── Habit Logs ──────────────────────────────────────────── */
export function useHabitLogs(habitId: string | null, days: number = 7) {
  return useQuery<HabitLog[]>({
    queryKey: ['habit-logs', habitId, days],
    queryFn: () => (habitId ? api.getHabitLogs(habitId, days) : Promise.resolve([])),
    enabled: !!habitId,
    staleTime: 30_000,
  });
}
