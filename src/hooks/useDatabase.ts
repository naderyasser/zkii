import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { DatabaseWithRows, PropertyDef, ViewDef, WorkspaceRow } from '@/types';

export function useDatabase(id: string | null) {
  return useQuery<DatabaseWithRows>({
    queryKey: ['database', id],
    queryFn: () => api.getDatabase(id as string),
    enabled: !!id,
    staleTime: 5_000,
  });
}

function useInvalidate(databaseId: string | null) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['database', databaseId] });
}

export function useUpdateDatabase(databaseId: string) {
  const invalidate = useInvalidate(databaseId);
  return useMutation({
    mutationFn: (data: Partial<{ properties: PropertyDef[]; views: ViewDef[] }>) =>
      api.updateDatabase(databaseId, data),
    onSuccess: invalidate,
  });
}

export function useCreateRow(databaseId: string) {
  const invalidate = useInvalidate(databaseId);
  return useMutation({
    mutationFn: (properties: Record<string, unknown> = {}) => api.createRow(databaseId, properties),
    onSuccess: invalidate,
  });
}

export function useUpdateRow(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { properties?: Record<string, unknown>; position?: number; pageId?: string | null; replaceProperties?: boolean };
    }) => api.updateRow(id, data),
    // optimistic update للسلاسة
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['database', databaseId] });
      const prev = qc.getQueryData<DatabaseWithRows>(['database', databaseId]);
      if (prev && data.properties && !data.replaceProperties) {
        qc.setQueryData<DatabaseWithRows>(['database', databaseId], {
          ...prev,
          rows: prev.rows.map((r: WorkspaceRow) =>
            r.id === id ? { ...r, properties: { ...r.properties, ...data.properties } } : r
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['database', databaseId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['database', databaseId] }),
  });
}

export function useDeleteRow(databaseId: string) {
  const invalidate = useInvalidate(databaseId);
  return useMutation({
    mutationFn: (id: string) => api.deleteRow(id),
    onSuccess: invalidate,
  });
}
