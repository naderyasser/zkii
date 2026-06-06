import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { WorkspacePageNode, WorkspacePage, PageWithDatabase } from '@/types';

/* ─── Pages tree ───────────────────────────────────────────── */
export function usePagesTree() {
  return useQuery<WorkspacePageNode[]>({
    queryKey: ['pages', 'tree'],
    queryFn: () => api.getPagesTree(),
    staleTime: 15_000,
  });
}

export function useTrashPages() {
  return useQuery<WorkspacePage[]>({
    queryKey: ['pages', 'trash'],
    queryFn: () => api.getTrashPages(),
    staleTime: 10_000,
  });
}

export function usePage(id: string | null) {
  return useQuery<PageWithDatabase>({
    queryKey: ['page', id],
    queryFn: () => api.getPage(id as string),
    enabled: !!id,
    staleTime: 5_000,
  });
}

/* ─── Mutations ────────────────────────────────────────────── */
function useInvalidatePages() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['pages'] });
  };
}

export function useCreatePage() {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      icon?: string;
      parentId?: string | null;
      type?: 'page' | 'database';
    }) => api.createPage(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ title: string; icon: string | null; coverUrl: string | null; content: string; isFavorite: boolean }>;
    }) => api.updatePage(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['pages'] });
      qc.invalidateQueries({ queryKey: ['page', vars.id] });
    },
  });
}

export function useArchivePage() {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: (id: string) => api.archivePage(id),
    onSuccess: () => invalidate(),
  });
}

export function useHardDeletePage() {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: (id: string) => api.hardDeletePage(id),
    onSuccess: () => invalidate(),
  });
}

export function useMovePage() {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: ({ id, parentId, position }: { id: string; parentId?: string | null; position?: number }) =>
      api.movePage(id, { parentId, position }),
    onSuccess: () => invalidate(),
  });
}

export function useRestorePage() {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: (id: string) => api.restorePage(id),
    onSuccess: () => invalidate(),
  });
}
