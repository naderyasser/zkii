'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Plus, Database as DbIcon } from 'lucide-react';
import { usePagesTree, useCreatePage } from '@/hooks/usePages';
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

// لوحة أوامر/بحث في عناوين الصفحات (المرحلة 7 هتوسّعها لمحتوى الـ blocks)
// تُركّب فقط وهي مفتوحة (mount-conditional) فالحالة تبدأ نظيفة كل مرة.
export default function WorkspaceCommand({ onClose }: Props) {
  const router = useRouter();
  const { data: tree } = usePagesTree();
  const createPage = useCreatePage();
  const [q, setQ] = useState('');

  const allPages = useMemo(() => (tree ? flatten(tree) : []), [tree]);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allPages.slice(0, 8);
    return allPages.filter((p) => (p.title || '').toLowerCase().includes(term)).slice(0, 12);
  }, [q, allPages]);

  const go = (id: string) => { onClose(); router.push(`/p/${id}`); };
  const create = async () => {
    const page = await createPage.mutateAsync({ title: q.trim() || undefined });
    onClose();
    router.push(`/p/${page.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]" onClick={onClose}>
      <div
        dir="rtl"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-default bg-surface shadow-xl animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <Search size={16} className="text-koala-secondary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            placeholder="ابحث عن صفحة أو أنشئ واحدة…"
            className="flex-1 bg-transparent py-3 text-sm text-koala-bright outline-none placeholder:text-koala-muted"
          />
        </div>
        <div className="max-h-80 overflow-y-auto kanban-scroll p-1.5">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-koala-primary hover:bg-hover"
            >
              <span className="w-5 text-center text-[15px] leading-none">
                {p.icon || (p.type === 'database' ? <DbIcon size={15} className="inline text-koala-secondary" /> : <FileText size={15} className="inline text-koala-secondary" />)}
              </span>
              <span className="flex-1 truncate">{p.title || 'بدون عنوان'}</span>
            </button>
          ))}
          <button
            onClick={create}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-accent-blue hover:bg-hover"
          >
            <Plus size={15} />
            <span>إنشاء صفحة{q.trim() ? ` «${q.trim()}»` : ' جديدة'}</span>
          </button>
        </div>
        <div className="border-t border-border-subtle px-3 py-1.5 text-[11px] text-koala-muted">
          ↵ للفتح · Esc للإغلاق
        </div>
      </div>
    </div>
  );
}
