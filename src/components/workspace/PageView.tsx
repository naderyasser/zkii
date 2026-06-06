'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Loader2 } from 'lucide-react';
import { usePage, useUpdatePage } from '@/hooks/usePages';
import type { PartialBlock } from '@blocknote/core';

// المحرّر يُحمّل ديناميكياً بدون SSR (BlockNote يحتاج DOM)
const PageEditor = dynamic(() => import('./PageEditor'), {
  ssr: false,
  loading: () => <div className="py-6 text-sm text-koala-secondary">…تحميل المحرّر</div>,
});

function parseContent(content: string | null): PartialBlock[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length ? (parsed as PartialBlock[]) : undefined;
  } catch {
    return undefined;
  }
}

const EMOJI_CHOICES = ['📄', '📝', '📋', '📁', '🎯', '🔁', '📊', '💡', '🚀', '🔥', '⭐', '✅', '📅', '🧠', '💬', '🗂️'];

export default function PageView({ pageId }: { pageId: string }) {
  const { data: page, isLoading } = usePage(pageId);
  const updatePage = useUpdatePage();

  const [title, setTitle] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // مزامنة العنوان المحلي عند تغيّر الصفحة (نمط render-time بدل useEffect)
  if (page && page.id !== syncedId) {
    setSyncedId(page.id);
    setTitle(page.title);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-koala-secondary">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-koala-secondary">
        <FileText size={28} />
        <p className="text-sm">الصفحة غير موجودة أو محذوفة.</p>
      </div>
    );
  }

  const saveTitle = () => {
    const t = title.trim() || 'بدون عنوان';
    if (t !== page.title) updatePage.mutate({ id: page.id, data: { title: t } });
  };

  const pickEmoji = (emoji: string) => {
    setShowEmoji(false);
    updatePage.mutate({ id: page.id, data: { icon: emoji } });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Icon + title */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-lg text-4xl hover:bg-hover"
          title="تغيير الأيقونة"
        >
          {page.icon || <FileText size={32} className="text-koala-secondary" />}
        </button>
        {showEmoji && (
          <div className="absolute z-20 grid grid-cols-8 gap-1 rounded-lg border border-border-default bg-surface p-2 shadow-xl">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} onClick={() => pickEmoji(e)} className="rounded p-1.5 text-xl hover:bg-hover">
                {e}
              </button>
            ))}
            <button onClick={() => pickEmoji('')} className="col-span-8 mt-1 rounded py-1 text-xs text-koala-secondary hover:bg-hover">
              إزالة الأيقونة
            </button>
          </div>
        )}

        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur(); }
          }}
          rows={1}
          placeholder="بدون عنوان"
          className="w-full resize-none overflow-hidden bg-transparent text-3xl font-bold text-koala-bright outline-none placeholder:text-koala-muted"
        />
      </div>

      {/* Content area — placeholder حتى المرحلة 4 (المحرر) / 5 (قاعدة البيانات) */}
      {page.database ? (
        <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-koala-secondary">
          قاعدة بيانات — العروض (جدول/كانبان/تقويم) جاية في المرحلة 5.
          <div className="mt-1 text-xs text-koala-muted">الخصائص: {page.database.properties.map((p) => p.name).join('، ')}</div>
        </div>
      ) : (
        <PageEditor
          key={page.id}
          initialContent={parseContent(page.content)}
          onSave={(json) => updatePage.mutate({ id: page.id, data: { content: json } })}
        />
      )}
    </div>
  );
}
