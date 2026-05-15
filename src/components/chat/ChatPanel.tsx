'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { Sparkles, Globe } from 'lucide-react';

const SUGGESTIONS = [
  { text: 'إيه اللي عندي النهارده؟', icon: Sparkles },
  { text: 'أهم مهامي', icon: Sparkles },
  { text: 'ملخص اليوم', icon: Sparkles },
  { text: 'فكّر معايا', icon: Sparkles },
  { text: 'ابحث عن أحدث أخبار التقنية', icon: Globe },
  { text: 'إيه الأخبار؟', icon: Globe },
];

export default function ChatPanel() {
  const { messages, sendMessage, isPending } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-koala-purple/15 flex items-center justify-center">
            <Sparkles className="size-3.5 text-koala-purple" />
          </div>
          <div>
            <span className="text-koala-bright font-semibold text-[14px] block">
              زكي
            </span>
            <span className="text-koala-secondary text-[10px]">
              مساعدك الذكي · إدارة المهام + بحث الإنترنت + Google
            </span>
          </div>
          <span className="size-2 rounded-full bg-koala-green ms-auto shrink-0" />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-3 py-6">
              <p className="text-koala-secondary text-center text-[12px]">
                أهلاً! اختار سؤال أو اكتب رسالة
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => {
                  const IconComp = s.icon;
                  const isSearch = s.icon === Globe;
                  return (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => sendMessage(s.text)}
                      disabled={isPending}
                      className={`
                        flex items-center gap-2 text-koala-secondary hover:text-accent-blue hover:bg-hover
                        rounded-md border border-border-subtle ps-3 pe-2 py-2
                        text-start transition-colors duration-150 text-[12px]
                        ${isSearch ? 'border-koala-teal/20 hover:border-koala-teal/40 hover:text-koala-teal' : ''}
                      `}
                      dir="rtl"
                    >
                      <IconComp className={`size-3 shrink-0 ${isSearch ? 'text-koala-teal' : ''}`} />
                      {s.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isPending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={sendMessage} isPending={isPending} />
    </div>
  );
}
