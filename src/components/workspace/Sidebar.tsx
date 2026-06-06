'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Plus, Star, Trash2, PanelRightClose, Terminal,
  LayoutGrid, Home as HomeIcon, Wrench,
} from 'lucide-react';
import { usePagesTree, useCreatePage } from '@/hooks/usePages';
import type { WorkspacePageNode } from '@/types';
import SidebarTree from './SidebarTree';

function flattenFavorites(nodes: WorkspacePageNode[], acc: WorkspacePageNode[] = []): WorkspacePageNode[] {
  for (const n of nodes) {
    if (n.isFavorite) acc.push(n);
    if (n.children.length) flattenFavorites(n.children, acc);
  }
  return acc;
}

interface SidebarProps {
  onOpenSearch: () => void;
  onCollapse: () => void;
}

export default function Sidebar({ onOpenSearch, onCollapse }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: tree, isLoading } = usePagesTree();
  const createPage = useCreatePage();

  const favorites = useMemo(() => (tree ? flattenFavorites(tree) : []), [tree]);

  const newPage = async () => {
    const page = await createPage.mutateAsync({});
    router.push(`/p/${page.id}`);
  };

  return (
    <aside className="flex h-full w-full flex-col bg-surface border-s border-border-subtle text-koala-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link href="/" className="flex items-center gap-2 text-koala-bright">
          <Terminal size={16} className="text-accent-blue" />
          <span className="text-sm font-semibold">زكي</span>
        </Link>
        <button
          onClick={onCollapse}
          title="إخفاء الشريط (Ctrl+\\)"
          className="flex h-6 w-6 items-center justify-center rounded text-koala-secondary hover:bg-hover hover:text-koala-bright"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-2 space-y-0.5">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-koala-secondary hover:bg-hover hover:text-koala-bright"
        >
          <Search size={14} /> <span>بحث</span>
          <kbd className="ms-auto rounded bg-elevated px-1.5 py-0.5 text-[10px] text-koala-muted">Ctrl K</kbd>
        </button>
        <Link
          href="/"
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-hover hover:text-koala-bright ${pathname === '/' ? 'text-koala-bright bg-elevated' : 'text-koala-secondary'}`}
        >
          <HomeIcon size={14} /> <span>الرئيسية</span>
        </Link>
        <button
          onClick={newPage}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-koala-secondary hover:bg-hover hover:text-koala-bright"
        >
          <Plus size={14} /> <span>صفحة جديدة</span>
          <kbd className="ms-auto rounded bg-elevated px-1.5 py-0.5 text-[10px] text-koala-muted">Ctrl N</kbd>
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="mt-2 flex-1 overflow-y-auto kanban-scroll px-2 pb-2">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-koala-muted">
              <Star size={11} /> المفضلة
            </div>
            <div className="flex flex-col">
              {favorites.map((f) => (
                <button
                  key={f.id}
                  onClick={() => router.push(`/p/${f.id}`)}
                  className={`flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] text-start hover:bg-hover ${pathname === `/p/${f.id}` ? 'bg-elevated text-koala-bright' : 'text-koala-primary'}`}
                >
                  <span className="w-[18px] text-center text-[14px] leading-none">{f.icon || '⭐'}</span>
                  <span className="flex-1 truncate">{f.title || 'بدون عنوان'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pages tree */}
        <div className="px-2 py-1 text-[11px] font-medium text-koala-muted">الصفحات</div>
        {isLoading ? (
          <p className="px-2 py-2 text-xs text-koala-secondary">…تحميل</p>
        ) : (
          <SidebarTree tree={tree ?? []} />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-2 py-2 space-y-0.5">
        <Link
          href="/trash"
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-hover hover:text-koala-bright ${pathname === '/trash' ? 'text-koala-bright bg-elevated' : 'text-koala-secondary'}`}
        >
          <Trash2 size={14} /> <span>سلة المهملات</span>
        </Link>
        <Link
          href="/legacy"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-koala-secondary hover:bg-hover hover:text-koala-bright"
        >
          <Wrench size={14} /> <span>الأدوات القديمة</span>
          <LayoutGrid size={12} className="ms-auto text-koala-muted" />
        </Link>
      </div>
    </aside>
  );
}
