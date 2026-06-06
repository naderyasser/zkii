// ═══════════════════════════════════════════════════════════════════════════════
// AI PROVIDER CLIENT — Local Ollama (qwen3) أولاً + Fallback خارجي | OpenAI-compatible
// ═══════════════════════════════════════════════════════════════════════════════
// عميل موحّد للتعامل مع مزوّد ذكاء اصطناعي متوافق مع OpenAI عبر REST.
// كل الإعدادات تيجي من متغيرات البيئة — ممنوع أي secret داخل الكود.
//
//   ── المزوّد الأساسي (محلي عبر Ollama) ──
//   AI_BASE_URL  → http://127.0.0.1:11434/v1
//   AI_API_KEY   → ollama   (أي قيمة — Ollama مبيتحققش)
//   AI_MODEL     → qwen3:4b-instruct
//
//   ── مزوّد احتياطي (يُستخدم تلقائياً لو المحلي فشل/timeout) ──
//   AI_FALLBACK_BASE_URL / AI_FALLBACK_API_KEY / AI_FALLBACK_MODEL
//
// المبدأ: الاستدعاء مبيرميش استثناء أبداً — بيرجّع رسالة fallback عربية عند أي خطأ.
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
  max_tokens?: number;
  temperature?: number;
}

// مهلة الطلب — الموديل المحلي على CPU أبطأ، فبنوسّع المهلة لـ 180 ثانية
const AI_TIMEOUT_MS = 180_000;
// حد أقصى افتراضي للناتج — للسرعة على الموديل المحلي
const DEFAULT_MAX_TOKENS = 1024;

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  label: string;
}

// إعدادات المزوّد الأساسي (المحلي) — null لو ناقص
function primaryConfig(): ProviderConfig | null {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model, label: 'primary' };
}

// إعدادات المزوّد الاحتياطي (الخارجي) — null لو غير مهيّأ
function fallbackConfig(): ProviderConfig | null {
  const baseUrl = process.env.AI_FALLBACK_BASE_URL;
  const apiKey = process.env.AI_FALLBACK_API_KEY;
  const model = process.env.AI_FALLBACK_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model, label: 'fallback' };
}

// رسالة fallback عربية موحّدة على شكل رد OpenAI سليم
function fallbackMessage(message: string): ChatCompletionResult {
  return { choices: [{ message: { content: message } }] };
}

// ─── إزالة تفكير الموديل <think>...</think> قبل العرض ──────────────────────────
// بعض موديلات qwen3 (الـ hybrid) بتطلع تفكير داخل وسوم <think>. بنشيلها.
export function stripThink(text: string | null | undefined): string {
  if (!text) return '';
  // أزل الكتل المغلقة <think>…</think>
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // أزل أي <think> مفتوح بدون إغلاق (قُص لحد آخر </think> أو شيل البادئة)
  out = out.replace(/<think>[\s\S]*$/i, '');
  out = out.replace(/^[\s\S]*?<\/think>/i, '');
  return out.trim();
}

// مُرشِّح حالة (stateful) لإزالة <think> أثناء الـ streaming عبر chunks متتالية
function createThinkStripper() {
  let insideThink = false;
  let carry = ''; // نخزّن آخر أحرف ممكن تكون بداية وسم مقطوع
  return function filter(chunk: string): string {
    let buf = carry + chunk;
    carry = '';
    let result = '';
    while (buf.length > 0) {
      if (!insideThink) {
        const open = buf.indexOf('<think>');
        if (open === -1) {
          // ممكن يكون آخر الـ buffer بداية وسم مقطوع — احتفظ بآخر 7 أحرف
          const keep = Math.min(7, buf.length);
          result += buf.slice(0, buf.length - keep);
          carry = buf.slice(buf.length - keep);
          // لو الـ carry مش بادئة محتملة لـ <think> سيبه يخرج المرة الجاية
          if (!'<think>'.startsWith(carry)) {
            result += carry;
            carry = '';
          }
          break;
        }
        result += buf.slice(0, open);
        buf = buf.slice(open + 7);
        insideThink = true;
      } else {
        const close = buf.indexOf('</think>');
        if (close === -1) {
          // كله جوّه think — احتفظ بذيل محتمل لوسم الإغلاق
          const keep = Math.min(8, buf.length);
          carry = buf.slice(buf.length - keep);
          if (!'</think>'.startsWith(carry)) carry = '';
          break;
        }
        buf = buf.slice(close + 8);
        insideThink = false;
      }
    }
    return result;
  };
}

// ─── استدعاء مزوّد واحد (بيرمي استثناء عند الفشل عشان منطق الـ fallback) ────────
async function callProvider(
  cfg: ProviderConfig,
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: params.messages,
        max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS,
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(params.tools ? { tools: params.tools } : {}),
        ...(params.tool_choice !== undefined ? { tool_choice: params.tool_choice } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[${cfg.label}] HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatCompletionResult;
    if (!data?.choices?.length) throw new Error(`[${cfg.label}] empty choices`);
    // نظّف تفكير الموديل من المحتوى النصّي قبل الإرجاع
    const msg = data.choices[0].message;
    if (msg && typeof msg.content === 'string') {
      msg.content = stripThink(msg.content);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * chatCompletion — استدعاء /chat/completions مع fallback تلقائي.
 * بيجرّب المزوّد المحلي الأول، ولو فشل/timeout بيرجع للمزوّد الخارجي (لو مهيّأ).
 * مبيرميش استثناء أبداً — بيرجّع رسالة fallback عربية عند فشل الكل.
 */
export async function chatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  const primary = primaryConfig();
  const fb = fallbackConfig();

  if (!primary && !fb) {
    console.error('[AI] No provider configured (AI_BASE_URL/AI_API_KEY/AI_MODEL)');
    return fallbackMessage(
      '[ERR] مزوّد الذكاء الاصطناعي غير مهيّأ — تأكد من ضبط AI_BASE_URL و AI_API_KEY و AI_MODEL في ملف .env'
    );
  }

  // جرّب المزوّد الأساسي
  if (primary) {
    try {
      return await callProvider(primary, params);
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      console.error(`[AI] primary failed${aborted ? ' (timeout)' : ''}:`, err);
      // هنكمّل للـ fallback تحت
    }
  }

  // جرّب المزوّد الاحتياطي
  if (fb) {
    try {
      console.warn('[AI] falling back to external provider');
      return await callProvider(fb, params);
    } catch (err) {
      console.error('[AI] fallback failed:', err);
    }
  }

  return fallbackMessage('[ERR] تعذّر الاتصال بالموديل المحلي والاحتياطي — حاول تاني بعد شوية.');
}

// ─── Streaming ────────────────────────────────────────────────────────────────
// بيرجّع async generator بيطلّع دفعات نصّية (deltas) منظّفة من <think>.
// مهم جداً مع الموديل المحلي البطيء عشان الإحساس بالاستجابة الفورية.

async function* streamProvider(
  cfg: ProviderConfig,
  params: ChatCompletionParams,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: params.messages,
        max_tokens: params.max_tokens ?? DEFAULT_MAX_TOKENS,
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`[${cfg.label}] stream HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const strip = createThinkStripper();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE: أسطر "data: {...}" مفصولة بسطر فاضي
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length) {
            const cleaned = strip(delta);
            if (cleaned) yield cleaned;
          }
        } catch {
          // سطر غير مكتمل — تجاهله
        }
      }
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * chatCompletionStream — نسخة متدفّقة بـ fallback عند فشل فتح الاتصال.
 * بيرجّع async generator. لو المزوّد الأساسي فشل قبل أول دفعة، بيتحوّل للاحتياطي.
 * (لا يمكن التحوّل بعد بدء التدفّق.)
 */
export async function* chatCompletionStream(
  params: ChatCompletionParams,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const primary = primaryConfig();
  const fb = fallbackConfig();

  if (!primary && !fb) {
    yield '[ERR] مزوّد الذكاء الاصطناعي غير مهيّأ.';
    return;
  }

  if (primary) {
    try {
      let started = false;
      for await (const chunk of streamProvider(primary, params, signal)) {
        started = true;
        yield chunk;
      }
      if (started) return; // اكتمل التدفّق الأساسي بنجاح
      // لو خلص بدون أي محتوى، جرّب الاحتياطي تحت
    } catch (err) {
      console.error('[AI] primary stream failed:', err);
      // هنجرّب الاحتياطي تحت
    }
  }

  if (fb) {
    try {
      console.warn('[AI] streaming fallback to external provider');
      for await (const chunk of streamProvider(fb, params, signal)) {
        yield chunk;
      }
      return;
    } catch (err) {
      console.error('[AI] fallback stream failed:', err);
    }
  }

  yield '[ERR] تعذّر الاتصال بالموديل — حاول تاني.';
}
