'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelRightOpen } from 'lucide-react';
import { useCreatePage } from '@/hooks/usePages';
import Sidebar from './Sidebar';
import WorkspaceCommand from './WorkspaceCommand';

const SIDEBAR_W = 264;

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const createPage = useCreatePage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  const newPage = useCallback(async () => {
    const page = await createPage.mutateAsync({});
    router.push(`/p/${page.id}`);
  }, [createPage, router]);

  // اختصارات لوحة المفاتيح: Ctrl/Cmd+K بحث · Ctrl+N صفحة · Ctrl+\ إخفاء الشريط
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      } else if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newPage();
      } else if (meta && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newPage]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-koala-primary" dir="rtl">
      {/* Sidebar (RTL → على اليمين، أول عنصر في flex-row) */}
      {sidebarOpen && (
        <div className="h-full shrink-0" style={{ width: SIDEBAR_W }}>
          <Sidebar onOpenSearch={() => setCommandOpen(true)} onCollapse={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <main className="relative flex-1 overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="إظهار الشريط (Ctrl+\\)"
            className="absolute end-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-surface text-koala-secondary hover:text-koala-bright border border-border-subtle"
          >
            <PanelRightOpen size={15} />
          </button>
        )}
        {children}
      </main>

      {commandOpen && <WorkspaceCommand onClose={() => setCommandOpen(false)} />}
    </div>
  );
}
