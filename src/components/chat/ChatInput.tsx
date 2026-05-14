'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
}

export default function ChatInput({ onSend, isPending }: ChatInputProps) {
  const [value, setValue] = useState('');
  const hasText = value.trim().length > 0;

  const handleSend = useCallback(() => {
    if (!hasText || isPending) return;
    onSend(value.trim());
    setValue('');
  }, [hasText, isPending, onSend, value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="shrink-0 border-t border-border-subtle p-3">
      <div className="flex items-center gap-2 bg-base rounded-lg border border-border-subtle px-3 py-2 focus-within:border-accent-blue/50 transition-colors duration-150">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب أمر هنا..."
          disabled={isPending}
          className="flex-1 bg-transparent text-koala-primary placeholder:text-koala-muted focus:outline-none focus:ring-0 text-[13px]"
          dir="rtl"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || isPending}
          className={`flex items-center justify-center size-7 rounded-md transition-all duration-150 shrink-0 ${
            hasText && !isPending
              ? 'bg-koala-purple text-base hover:bg-koala-purple/80'
              : 'bg-hover text-koala-muted cursor-default'
          }`}
          aria-label="إرسال"
        >
          <Send className="size-3.5 scale-x-[-1]" />
        </button>
      </div>
    </div>
  );
}
