import { NextRequest } from 'next/server';
import { chatCompletionStream } from '@/lib/ai';

// POST /api/ai/stream — رد متدفّق (نص خام، deltas) من الموديل المحلي.
// body: { prompt?, system?, messages?, max_tokens? }
// يُستخدم لأوامر «/زكي» في المحرر وللشات بسياق الصفحة.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { prompt, system, messages, max_tokens } = body as {
    prompt?: string;
    system?: string;
    messages?: { role: string; content: string }[];
    max_tokens?: number;
  };

  const msgs =
    messages && Array.isArray(messages)
      ? messages
      : [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt || '' },
        ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chatCompletionStream({ messages: msgs, max_tokens: max_tokens ?? 1024 }, request.signal)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error('[ai/stream] error', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
