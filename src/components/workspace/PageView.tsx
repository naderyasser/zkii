'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Sparkles } from 'lucide-react';
import { usePage, useUpdatePage } from '@/hooks/usePages';
import DatabaseView from './database/DatabaseView';
import PageChat from './PageChat';
import PageIcon from './PageIcon';
import { Skeleton } from '@/components/ui-koala/Skeleton';
import type { PartialBlock } from '@blocknote/core';

// استخراج نص مقروء من محتوى BlockNote (للشات بسياق الصفحة)
function extractText(content: string | null): string {
  if (!content) return '';
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { return ''; }
  const parts: string[] = [];
  const walk = (n: unknown) => {
    if (!n) return;
    if (typeof n === 'string') { parts.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (typeof o.text === 'string') parts.push(o.text);
      if (o.content) walk(o.content);
      if (o.children) walk(o.children);
    }
  };
  walk(parsed);
  return parts.join(' ');
}

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
  const [chatOpen, setChatOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // مزامنة العنوان المحلي عند تغيّر الصفحة (نمط render-time بدل useEffect)
  if (page && page.id !== syncedId) {
    setSyncedId(page.id);
    setTitle(page.title);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Skeleton width="56px" height="56px" className="mb-4 rounded-lg" />
        <Skeleton width="60%" height="36px" className="mb-8" />
        <div className="space-y-3">
          <Skeleton width="100%" height="14px" />
          <Skeleton width="90%" height="14px" />
          <Skeleton width="75%" height="14px" />
          <Skeleton width="85%" height="14px" />
        </div>
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
      {/* اسأل زكي عن الصفحة */}
      <div className="mb-2 flex justify-start">
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs text-koala-secondary hover:border-border-default hover:text-accent-blue"
        >
          <Sparkles size={13} /> اسأل زكي عن الصفحة
        </button>
      </div>

      {/* Icon + title */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-[var(--radius)] hover:bg-hover"
          title="تغيير الأيقونة"
        >
          <PageIcon icon={page.icon} size={36} className="text-koala-primary" />
        </button>
        {showEmoji && (
          <div className="absolute z-20 grid grid-cols-8 gap-1 rounded-lg border border-border-default bg-surface p-2 shadow-[var(--shadow-museum)]">
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
          className="font-amiri w-full resize-none overflow-hidden bg-transparent text-[36px] font-bold leading-tight text-koala-bright outline-none placeholder:text-koala-muted"
        />
      </div>

      {/* Content area: قاعدة بيانات أو محرّر blocks */}
      {page.database ? (
        <DatabaseView databaseId={page.database.id} />
      ) : (
        <PageEditor
          key={page.id}
          initialContent={parseContent(page.content)}
          onSave={(json) => updatePage.mutate({ id: page.id, data: { content: json } })}
        />
      )}

      {chatOpen && (
        <PageChat
          pageTitle={page.title}
          pageText={page.database ? `قاعدة بيانات بخصائص: ${page.database.properties.map((p) => p.name).join('، ')}` : extractText(page.content)}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
