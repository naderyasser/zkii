'use client';

import { Trash2, RotateCcw, X, FileText } from 'lucide-react';
import { useTrashPages, useRestorePage, useHardDeletePage } from '@/hooks/usePages';

export default function TrashPage() {
  const { data: pages, isLoading } = useTrashPages();
  const restore = useRestorePage();
  const hardDelete = useHardDeletePage();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-center gap-2">
        <Trash2 size={20} className="text-coral" />
        <h1 className="text-xl font-bold text-koala-bright">سلة المهملات</h1>
      </header>

      {isLoading ? (
        <p className="text-sm text-koala-secondary">…تحميل</p>
      ) : !pages || pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default p-10 text-center text-sm text-koala-secondary">
          السلة فاضية ✨
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pages.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface px-3 py-2.5"
            >
              <span className="text-lg leading-none">
                {p.icon || <FileText size={16} className="text-koala-secondary" />}
              </span>
              <span className="flex-1 truncate text-sm text-koala-primary">{p.title || 'بدون عنوان'}</span>
              <button
                onClick={() => restore.mutate(p.id)}
                title="استعادة"
                className="flex h-7 items-center gap-1 rounded px-2 text-xs text-koala-secondary hover:bg-hover hover:text-koala-green"
              >
                <RotateCcw size={13} /> استعادة
              </button>
              <button
                onClick={() => {
                  if (confirm(`حذف «${p.title || 'بدون عنوان'}» نهائياً؟ لا يمكن التراجع.`)) hardDelete.mutate(p.id);
                }}
                title="حذف نهائي"
                className="flex h-7 items-center gap-1 rounded px-2 text-xs text-koala-secondary hover:bg-hover hover:text-coral"
              >
                <X size={13} /> نهائي
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
