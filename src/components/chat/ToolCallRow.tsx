'use client';

import { Mail, Calendar, Wrench } from 'lucide-react';
import type { ToolCallResult } from '@/types';

function toolLabel(tool: string) {
  if (tool.includes('gmail') || tool.includes('mail')) return 'Gmail';
  if (tool.includes('calendar') || tool.includes('event')) return 'Calendar';
  return tool;
}

function ToolIcon({ tool }: { tool: string }) {
  const isMail = tool.includes('gmail') || tool.includes('mail');
  const isCalendar = tool.includes('calendar') || tool.includes('event');

  if (isMail) return <Mail className="size-3 shrink-0 text-koala-secondary" />;
  if (isCalendar) return <Calendar className="size-3 shrink-0 text-koala-secondary" />;
  return <Wrench className="size-3 shrink-0 text-koala-secondary" />;
}

export default function ToolCallRow({ call }: { call: ToolCallResult }) {
  const ok = call.status === 'success';

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono">
      <ToolIcon tool={call.tool} />
      <span className="text-koala-secondary">{toolLabel(call.tool)}</span>
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
