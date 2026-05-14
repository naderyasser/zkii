import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Tag } from '@/types';

/* ─── All Tags ────────────────────────────────────────────── */
export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
    staleTime: 30_000,
  });
}

/* ─── Create Tag ──────────────────────────────────────────── */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      api.createTag(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

/* ─── Delete Tag ──────────────────────────────────────────── */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['task-tags'] });
    },
  });
}

/* ─── Task Tags ───────────────────────────────────────────── */
export function useTaskTags(taskId: string | null) {
  return useQuery<Tag[]>({
    queryKey: ['task-tags', taskId],
    queryFn: () => (taskId ? api.getTaskTags(taskId) : Promise.resolve([])),
    enabled: !!taskId,
    staleTime: 30_000,
  });
}

/* ─── Add Tag to Task ─────────────────────────────────────── */
export function useAddTagToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.addTagToTask(taskId, tagId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-tags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Remove Tag from Task ────────────────────────────────── */
export function useRemoveTagFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.removeTagFromTask(taskId, tagId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-tags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
