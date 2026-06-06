'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileText, Database as DbIcon, Sparkles, Clock } from 'lucide-react';
import * as api from '@/lib/api';
import { useCreatePage } from '@/hooks/usePages';
import type { WorkspacePage } from '@/types';

export default function WorkspaceHome() {
  const router = useRouter();
  const createPage = useCreatePage();
  const { data: pages } = useQuery<WorkspacePage[]>({
    queryKey: ['pages', 'flat'],
    queryFn: () => api.getPagesFlat(),
    staleTime: 15_000,
  });

  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const recent = useMemo(() => {
    if (!pages) return [];
    return [...pages]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 9);
  }, [pages]);

  const newPage = async () => {
    const p = await createPage.mutateAsync({});
    router.push(`/p/${p.id}`);
  };

  const genBrief = async () => {
    setBriefLoading(true);
    setBrief(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.generateDaySummary(today);
      setBrief(res.summary || 'لا يوجد ملخص.');
    } catch {
      setBrief('تعذّر توليد الملخص حالياً.');
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-koala-bright">أهلاً في مساحتك 👋</h1>
        <p className="mt-1 text-sm text-koala-secondary">
          نظّم أفكارك ومهامك في صفحات وقواعد بيانات — مع زكي في كل مكان.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={newPage}
          className="flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-sm text-koala-bright hover:bg-hover border border-border-subtle"
        >
          <Plus size={15} /> صفحة جديدة
        </button>
        <button
          onClick={genBrief}
          disabled={briefLoading}
          className="flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-sm text-accent-blue hover:bg-hover border border-border-subtle disabled:opacity-60"
        >
          <Sparkles size={15} /> {briefLoading ? '…زكي بيلخّص يومك' : 'ملخص اليوم بزكي'}
        </button>
      </div>

      {brief && (
        <div className="mb-8 whitespace-pre-wrap rounded-xl border border-border-subtle bg-surface p-4 text-sm leading-relaxed text-koala-primary">
          {brief}
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-koala-muted">
          <Clock size={12} /> آخر الصفحات
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-default p-8 text-center">
            <p className="text-sm text-koala-secondary">مفيش صفحات لسه.</p>
            <button onClick={newPage} className="mt-3 text-sm text-accent-blue hover:underline">
              ابدأ بإنشاء أول صفحة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/p/${p.id}`)}
                className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface px-3 py-3 text-start hover:border-border-default hover:bg-elevated"
              >
                <span className="text-lg leading-none">
                  {p.icon || (p.type === 'database' ? <DbIcon size={18} className="text-koala-secondary" /> : <FileText size={18} className="text-koala-secondary" />)}
                </span>
                <span className="flex-1 truncate text-sm text-koala-primary">{p.title || 'بدون عنوان'}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
