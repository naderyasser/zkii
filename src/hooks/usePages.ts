import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { WorkspacePageNode, WorkspacePage, PageWithDatabase } from '@/types';

// تحديث عقدة داخل شجرة (للـ optimistic updates)
function patchTree(
  nodes: WorkspacePageNode[],
  id: string,
  patch: Partial<WorkspacePage>
): WorkspacePageNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : n.children.length
        ? { ...n, children: patchTree(n.children, id, patch) }
        : n
  );
}

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
    // optimistic: حدّث الشجرة فوراً للحقول الظاهرة في الـ sidebar (عنوان/أيقونة/مفضلة)
    onMutate: async ({ id, data }) => {
      const visible: Partial<WorkspacePage> = {};
      if (data.title !== undefined) visible.title = data.title;
      if (data.icon !== undefined) visible.icon = data.icon;
      if (data.isFavorite !== undefined) visible.isFavorite = data.isFavorite;
      if (Object.keys(visible).length === 0) return { prevTree: undefined };
      await qc.cancelQueries({ queryKey: ['pages', 'tree'] });
      const prevTree = qc.getQueryData<WorkspacePageNode[]>(['pages', 'tree']);
      if (prevTree) qc.setQueryData(['pages', 'tree'], patchTree(prevTree, id, visible));
      return { prevTree };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevTree) qc.setQueryData(['pages', 'tree'], ctx.prevTree);
    },
    onSettled: (_res, _e, vars) => {
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
