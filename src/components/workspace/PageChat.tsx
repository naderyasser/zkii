'use client';

import { useRef, useState } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { streamAI } from '@/lib/ai-client';

interface Msg { role: 'user' | 'assistant'; content: string }

interface Props {
  pageTitle: string;
  pageText: string; // نص الصفحة المستخرَج
  onClose: () => void;
}

const SUGGESTIONS = ['لخّص الصفحة دي', 'إيه أهم النقاط؟', 'اقترح خطوات تالية', 'استخرج المهام'];

export default function PageChat({ pageTitle, pageText, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput('');
    const history = [...messages, { role: 'user' as const, content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setBusy(true);

    const system = `أنت زكي، مساعد ذكي. جاوب باختصار وبنفس لغة المستخدم بالاعتماد على محتوى الصفحة الحالية.
عنوان الصفحة: «${pageTitle}»
محتوى الصفحة:
"""
${pageText.slice(0, 4000) || '(الصفحة فاضية)'}
"""`;

    try {
      await streamAI(
        { messages: [{ role: 'system', content: system }, ...history], max_tokens: 800 },
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + chunk };
            return next;
          });
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }
      );
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'تعذّر الاتصال بزكي. حاول تاني.' };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1" />
      <aside
        dir="rtl"
        className="flex h-full w-full max-w-sm flex-col border-s border-border-default bg-surface shadow-[var(--shadow-museum)] animate-in slide-in-from-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-koala-bright">
            <Sparkles size={15} className="text-accent-blue" /> اسأل زكي عن الصفحة
          </div>
          <button onClick={onClose} className="rounded p-1 text-koala-secondary hover:bg-hover"><X size={16} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto kanban-scroll p-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-koala-muted">اسأل زكي أي حاجة عن «{pageTitle}»:</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border border-border-subtle bg-base px-3 py-2 text-start text-xs text-koala-primary hover:bg-elevated">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-start' : ''}>
              <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-elevated text-koala-bright' : 'bg-base text-koala-primary'}`}>
                {m.content || (busy && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin" /> : '')}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border-subtle p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="اكتب سؤالك…"
              className="flex-1 resize-none rounded-lg border border-border-subtle bg-base px-3 py-2 text-sm text-koala-primary outline-none placeholder:text-koala-muted focus:border-border-default"
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue text-white disabled:opacity-40">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
