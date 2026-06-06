'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { filterSuggestionItems, type PartialBlock } from '@blocknote/core';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import {
  Sparkles, Check, Undo2, Loader2,
  PenLine, FileText, Wand2, Languages, ListChecks, Lightbulb, type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { streamAI, buildZakiStream, type ZakiCommand } from '@/lib/ai-client';
import * as api from '@/lib/api';

// تجاوز React 18/19 typing لـ useCallback (alias)
const useCb = useCallback;

interface ZakiItem {
  key: ZakiCommand;
  title: string;
  Icon: LucideIcon;
}
const ZAKI_ITEMS: ZakiItem[] = [
  { key: 'complete', title: 'كمّل الكتابة', Icon: PenLine },
  { key: 'summarize', title: 'لخّص', Icon: FileText },
  { key: 'improve', title: 'حسّن الصياغة', Icon: Wand2 },
  { key: 'translate', title: 'ترجم (عربي↔إنجليزي)', Icon: Languages },
  { key: 'extractTasks', title: 'استخرج مهام', Icon: ListChecks },
  { key: 'explain', title: 'اشرح ببساطة', Icon: Lightbulb },
];

interface Props {
  initialContent: PartialBlock[] | undefined;
  onSave: (json: string) => void;
}

export default function PageEditor({ initialContent, onSave }: Props) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({ initialContent: initialContent?.length ? initialContent : undefined });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);

  // حفظ تلقائي debounced 700ms
  const handleChange = useCb(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(JSON.stringify(editor.document));
    }, 700);
  }, [editor, onSave]);

  // تنفيذ أمر زكي مع streaming
  const runZaki = async (cmd: ZakiCommand) => {
    if (busy) return;
    setBusy(true);
    setPendingIds(null);
    try {
      const selected = editor.getSelectedText();
      const inputText = selected || (await editor.blocksToMarkdownLossy(editor.document));
      const ref = editor.getTextCursorPosition().block;
      const newId = `zaki-${Date.now()}`;
      editor.insertBlocks(
        [{ id: newId, type: 'paragraph', content: 'زكي بيكتب…' }],
        ref,
        'after'
      );
      let acc = '';
      await streamAI(buildZakiStream(cmd, inputText), (chunk) => {
        acc += chunk;
        editor.updateBlock(newId, { content: acc.trim() || 'زكي بيكتب…' });
      });
      const finalText = acc.trim();

      if (cmd === 'extractTasks' && finalText) {
        // حوّل الأسطر لمهام checklist + أنشئها فعلياً
        const lines = finalText
          .split('\n')
          .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
          .filter(Boolean);
        if (lines.length) {
          const blocks: PartialBlock[] = lines.map((l) => ({ type: 'checkListItem', content: l }));
          const inserted = editor.insertBlocks(blocks, newId, 'after');
          editor.removeBlocks([newId]);
          const ids = inserted.map((b) => b.id);
          setPendingIds(ids);
          // إنشاء المهام فعلياً (النظام الحالي — المرحلة 6 هتنقلها لقاعدة بيانات المهام)
          await Promise.allSettled(lines.map((title) => api.createTask({ title })));
        }
      } else {
        setPendingIds([newId]);
      }
    } catch (err) {
      console.error('[zaki] command failed', err);
    } finally {
      setBusy(false);
    }
  };

  const acceptAI = () => setPendingIds(null);
  const undoAI = () => {
    if (pendingIds) editor.removeBlocks(pendingIds);
    setPendingIds(null);
  };

  // عناصر القائمة المنسدلة (/) — الافتراضية + مجموعة زكي
  const getSlashItems = useMemo(
    () => async (query: string): Promise<DefaultReactSuggestionItem[]> => {
      const zaki: DefaultReactSuggestionItem[] = ZAKI_ITEMS.map((it) => ({
        title: `زكي: ${it.title}`,
        subtext: 'بالذكاء الاصطناعي المحلي',
        aliases: ['زكي', 'zaki', 'ai', it.key],
        group: 'زكي',
        icon: <it.Icon size={17} className="text-museum-gold-deep" />,
        onItemClick: () => runZaki(it.key),
      }));
      return filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...zaki], query);
    },
    [editor]
  );

  return (
    <div dir="rtl" className="zaki-editor relative">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        slashMenu={false}
        onChange={handleChange}
      >
        <SuggestionMenuController triggerCharacter="/" getItems={getSlashItems} />
      </BlockNoteView>

      {/* شريط حالة/قبول-تراجع لأوامر زكي */}
      {(busy || pendingIds) && (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md border border-museum-gold bg-surface px-3 py-1.5 text-xs shadow-[var(--shadow-museum)]">
          {busy ? (
            <span className="flex items-center gap-1.5 text-koala-secondary">
              <Loader2 size={13} className="animate-spin" /> زكي بيشتغل…
            </span>
          ) : (
            <>
              <Sparkles size={13} className="text-accent-blue" />
              <span className="text-koala-secondary">ناتج زكي</span>
              <button onClick={acceptAI} className="flex items-center gap-1 rounded-[var(--radius)] bg-elevated px-2 py-1 text-koala-green hover:bg-hover">
                <Check size={12} /> قبول
              </button>
              <button onClick={undoAI} className="flex items-center gap-1 rounded-[var(--radius)] bg-elevated px-2 py-1 text-coral hover:bg-hover">
                <Undo2 size={12} /> تراجع
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
