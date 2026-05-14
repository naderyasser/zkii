'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const SUGGESTIONS = [
  'إيه اللي عندي النهارده؟',
  'أهم مهامي',
  'فكّر معايا',
];

export default function ChatPanel() {
  const { messages, sendMessage, isPending } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  return (
    <div className="flex flex-col h-full w-[240px] border-e border-border-subtle bg-base">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-koala-bright font-semibold"
            style={{ fontSize: '15px' }}
          >
            زكي
          </span>
          <span className="size-2 rounded-full bg-koala-purple" />
        </div>
        <p
          className="text-koala-secondary mt-0.5"
          style={{ fontSize: '11px' }}
        >
          مساعدك الذكي
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-3 py-4">
              <p
                className="text-koala-secondary text-center"
                style={{ fontSize: '12px' }}
              >
                أهلاً! اختار سؤال أو اكتب رسالة
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={isPending}
                    className="text-koala-secondary hover:text-accent-blue hover:bg-hover rounded-md border border-border-subtle ps-3 pe-2 py-1.5 text-start transition-colors duration-150"
                    style={{ fontSize: '12px' }}
                    dir="rtl"
                  >
                    {s}
                  </button>
                ))}
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
