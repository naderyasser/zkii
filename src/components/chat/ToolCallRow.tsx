'use client';

import { Mail, Calendar, Search, Wrench } from 'lucide-react';
import type { ToolCallResult } from '@/types';

function toolLabel(tool: string) {
  if (tool.includes('gmail') || tool.includes('mail')) return 'Gmail';
  if (tool.includes('calendar') || tool.includes('event')) return 'Calendar';
  if (tool === 'web_search') return 'Web Search';
  return tool;
}

function ToolIcon({ tool }: { tool: string }) {
  const isMail = tool.includes('gmail') || tool.includes('mail');
  const isCalendar = tool.includes('calendar') || tool.includes('event');
  const isSearch = tool === 'web_search';

  if (isMail) return <Mail className="size-3 shrink-0 text-koala-secondary" />;
  if (isCalendar) return <Calendar className="size-3 shrink-0 text-koala-secondary" />;
  if (isSearch) return <Search className="size-3 shrink-0 text-koala-teal" />;
  return <Wrench className="size-3 shrink-0 text-koala-secondary" />;
}

export default function ToolCallRow({ call }: { call: ToolCallResult }) {
  const ok = call.status === 'success';
  const isSearch = call.tool === 'web_search';

  // Extract result count for web_search
  const resultCount = isSearch && ok && call.data?.count
    ? (call.data.count as number)
    : null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono">
      <ToolIcon tool={call.tool} />
      <span className={isSearch ? 'text-koala-teal' : 'text-koala-secondary'}>
        {toolLabel(call.tool)}
      </span>
      {resultCount !== null && (
        <span className="rounded bg-koala-teal/15 px-1 text-koala-teal" style={{ fontSize: 10 }}>
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}
      <span
        className={`rounded px-1 ${
          ok
            ? 'bg-koala-teal/15 text-koala-teal'
            : 'bg-coral/15 text-coral'
        }`}
        style={{ fontSize: 10 }}
      >
        {ok ? 'OK' : 'ERR'}
      </span>
    </div>
  );
}
