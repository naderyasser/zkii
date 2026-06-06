'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { usePagesTree, useCreatePage } from '@/hooks/usePages';
import * as api from '@/lib/api';
import PageIcon from './PageIcon';
import type { WorkspacePageNode } from '@/types';

function flatten(nodes: WorkspacePageNode[], acc: WorkspacePageNode[] = []): WorkspacePageNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children.length) flatten(n.children, acc);
  }
  return acc;
}

interface Props {
  onClose: () => void;
}

// لوحة أوامر/بحث في عناوين الصفحات + محتوى الـ blocks (server search عبر /api/search)
export default function WorkspaceCommand({ onClose }: Props) {
  const router = useRouter();
  const { data: tree } = usePagesTree();
  const createPage = useCreatePage();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // debounce (setTimeout داخل effect — غير متزامن، مسموح)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const recent = useMemo(() => (tree ? flatten(tree).slice(0, 8) : []), [tree]);

  const { data: searchResults } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => api.searchPages(debouncedQ),
    enabled: debouncedQ.length > 0,
    staleTime: 5_000,
  });

  const go = (id: string) => { onClose(); router.push(`/p/${id}`); };
  const create = async () => {
    const page = await createPage.mutateAsync({ title: q.trim() || undefined });
    onClose();
    router.push(`/p/${page.id}`);
  };

  const showSearch = debouncedQ.length > 0;
  const items = showSearch ? (searchResults ?? []) : recent.map((p) => ({ id: p.id, title: p.title, icon: p.icon, type: p.type, snippet: '' }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]" onClick={onClose}>
      <div
        dir="rtl"
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius)] border border-museum-gold bg-surface shadow-[var(--shadow-museum)] animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <Search size={16} className="text-koala-secondary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            placeholder="ابحث في الصفحات والمحتوى أو أنشئ صفحة…"
            className="flex-1 bg-transparent py-3 text-sm text-koala-bright outline-none placeholder:text-koala-muted"
          />
        </div>
        <div className="max-h-80 overflow-y-auto kanban-scroll p-1.5">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-start text-sm text-koala-primary hover:bg-hover"
            >
              <span className="mt-0.5 flex w-5 items-center justify-center">
                <PageIcon icon={p.icon} size={15} />
              </span>
              <span className="flex-1 overflow-hidden">
                <span className="block truncate">{p.title || 'بدون عنوان'}</span>
                {p.snippet && <span className="block truncate text-xs text-koala-muted">{p.snippet}</span>}
              </span>
            </button>
          ))}
          {showSearch && items.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-koala-muted">لا نتائج لـ «{debouncedQ}»</p>
          )}
          <button
            onClick={create}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-accent-blue hover:bg-hover"
          >
            <Plus size={15} />
            <span>إنشاء صفحة{q.trim() ? ` «${q.trim()}»` : ' جديدة'}</span>
          </button>
        </div>
        <div className="border-t border-border-subtle px-3 py-1.5 text-[11px] text-koala-muted">
          ↵ للفتح · Esc للإغلاق · بحث في العناوين والمحتوى
        </div>
      </div>
    </div>
  );
}
