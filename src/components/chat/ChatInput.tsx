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
    <div className="flex items-center gap-2 border-t border-border-subtle p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="اكتب أمر هنا..."
        disabled={isPending}
        className="flex-1 bg-transparent text-koala-primary placeholder:text-koala-muted focus:outline-none focus:ring-0"
        style={{ fontSize: '13px' }}
        dir="rtl"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!hasText || isPending}
        className="flex items-center justify-center size-7 rounded-md bg-koala-purple text-base transition-opacity duration-150 hover:bg-koala-purple/80 disabled:opacity-0"
        aria-label="إرسال"
      >
        <Send className="size-3.5 scale-x-[-1]" />
      </button>
    </div>
  );
}
