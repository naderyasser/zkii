'use client';

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '@/types';
import ToolCallRow from './ToolCallRow';

function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => (
          <strong className="text-koala-bright font-semibold">{children}</strong>
        ),
        ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
          <ul className="ps-4 list-disc" dir="rtl" {...props}>{children}</ul>
        ),
        ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
          <ol className="ps-4 list-decimal" dir="rtl" {...props}>{children}</ol>
        ),
        code: ({ children, ...props }: ComponentPropsWithoutRef<'code'>) => (
          <code className="font-mono bg-base px-1 rounded" style={{ fontSize: '12px' }} {...props}>
            {children}
          </code>
        ),
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-[10px] px-3 py-2 ${
          isUser
            ? 'bg-koala-teal/10 text-koala-bright'
            : 'bg-surface text-koala-primary'
        }`}
        style={{ fontSize: '13px', lineHeight: 1.6 }}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <MarkdownBody content={message.content} />
        )}
      </div>

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {message.toolCalls.map((tc) => (
            <ToolCallRow key={`${tc.tool}-${tc.status}`} call={tc} />
          ))}
        </div>
      )}

      <span
        className="mt-1 text-koala-muted"
        style={{ fontSize: '9px' }}
      >
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
