// ═══════════════════════════════════════════════════════════════════════════════
// AI PROVIDER CLIENT — Nous Portal (Hermes) | OpenAI-compatible
// ═══════════════════════════════════════════════════════════════════════════════
// عميل موحّد للتعامل مع مزوّد ذكاء اصطناعي متوافق مع OpenAI عبر REST.
// كل الإعدادات تيجي من متغيرات البيئة — ممنوع أي secret داخل الكود.
//   AI_BASE_URL  → مثال: https://inference-api.nousresearch.com/v1
//   AI_API_KEY   → مفتاح المصادقة (Bearer)
//   AI_MODEL     → مثال: Hermes-4-405B
// ═══════════════════════════════════════════════════════════════════════════════

// ─── أنواع متوافقة مع شكل OpenAI ──────────────────────────────────────────────
export interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

export interface ChatCompletionMessage {
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface ChatCompletionResult {
  choices: Array<{ message: ChatCompletionMessage }>;
}

export interface ChatCompletionParams {
  // نمرّر الرسائل بنفس صيغة OpenAI (system/user/assistant/tool)
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
}

// مهلة الطلب — نوقف الاتصال بعد ~60 ثانية
const AI_TIMEOUT_MS = 60_000;

// رسالة fallback عربية موحّدة على شكل رد OpenAI سليم
function fallback(message: string): ChatCompletionResult {
  return { choices: [{ message: { content: message } }] };
}

/**
 * chatCompletion — استدعاء endpoint الـ /chat/completions الخاص بالمزوّد.
 * بيرجّع نفس شكل OpenAI: choices[0].message: { content, tool_calls }.
 * مبيرميش استثناء أبداً — بيرجّع رسالة fallback عربية عند أي خطأ أو غياب إعدادات.
 */
export async function chatCompletion({
  messages,
  tools,
  tool_choice,
}: ChatCompletionParams): Promise<ChatCompletionResult> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    console.error('[AI] Missing AI_BASE_URL / AI_API_KEY / AI_MODEL');
    return fallback(
      '[ERR] مزوّد الذكاء الاصطناعي غير مهيّأ — تأكد من ضبط AI_BASE_URL و AI_API_KEY و AI_MODEL في ملف .env'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools ? { tools } : {}),
        ...(tool_choice !== undefined ? { tool_choice } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[AI] HTTP error', res.status, errText.slice(0, 500));
      return fallback('[ERR] فشل الاتصال بمزوّد الذكاء الاصطناعي — حاول تاني بعد شوية.');
    }

    const data = (await res.json()) as ChatCompletionResult;
    if (!data?.choices?.length) {
      console.error('[AI] Empty choices in response');
      return fallback('[ERR] مفيش رد من مزوّد الذكاء — حاول تاني.');
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[AI] Request timed out after', AI_TIMEOUT_MS, 'ms');
      return fallback('[ERR] انتهت مهلة الاتصال بمزوّد الذكاء — حاول تاني.');
    }
    console.error('[AI] Request failed:', err);
    return fallback('[ERR] حصل خطأ في الاتصال بمزوّد الذكاء — حاول تاني.');
  } finally {
    clearTimeout(timer);
  }
}
