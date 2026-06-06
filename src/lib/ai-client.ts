// ═══════════════════════════════════════════════════════════════════════════════
// AI CLIENT (browser) — استهلاك الرد المتدفّق من /api/ai/stream
// ═══════════════════════════════════════════════════════════════════════════════

export interface StreamBody {
  prompt?: string;
  system?: string;
  messages?: { role: string; content: string }[];
  max_tokens?: number;
}

// يستدعي الـ callback مع كل دفعة نصّية أثناء وصولها
export async function streamAI(
  body: StreamBody,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`AI stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

// ─── بناء prompt أوامر «زكي» في المحرر ─────────────────────────────────────────
export type ZakiCommand = 'complete' | 'summarize' | 'improve' | 'translate' | 'extractTasks' | 'explain';

const COMMAND_PROMPTS: Record<ZakiCommand, (text: string) => string> = {
  complete: (t) => `أكمل كتابة النص التالي بنفس الأسلوب واللغة، بفقرة أو فقرتين فقط، بدون مقدمات:\n\n${t}`,
  summarize: (t) => `لخّص النص التالي في نقاط قصيرة وواضحة بنفس لغته:\n\n${t}`,
  improve: (t) => `أعد صياغة النص التالي ليكون أوضح وأفصح مع الحفاظ على المعنى واللغة، وأعطني النسخة المحسّنة فقط:\n\n${t}`,
  translate: (t) => `ترجم النص التالي: لو عربي ترجمه للإنجليزية، ولو إنجليزي ترجمه للعربية. أعطني الترجمة فقط:\n\n${t}`,
  extractTasks: (t) => `استخرج المهام القابلة للتنفيذ من النص التالي. أعطني كل مهمة في سطر يبدأ بـ "- " بدون أي شرح إضافي:\n\n${t}`,
  explain: (t) => `اشرح النص التالي ببساطة وبلغة سهلة بنفس لغته:\n\n${t}`,
};

const SYSTEM = 'أنت زكي، مساعد كتابة ذكي. ردّ بنفس لغة النص. كن مباشراً وأعطِ المطلوب فقط بدون مقدمات أو تعليقات.';

export function buildZakiStream(command: ZakiCommand, text: string): StreamBody {
  return { system: SYSTEM, prompt: COMMAND_PROMPTS[command](text || ''), max_tokens: 1024 };
}
