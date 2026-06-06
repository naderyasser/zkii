// ═══════════════════════════════════════════════════════════════════════════════
// WEB SEARCH PROVIDER — Tavily / Serper (OpenAI-بديل عن z-ai web_search)
// ═══════════════════════════════════════════════════════════════════════════════
// Nous Portal مزوّد LLM فقط — مبيوفّرش بحث ويب. فبنستخدم مزوّد خارجي خلف مفتاح.
//   SEARCH_API_KEY   → مفتاح المزوّد (لو فاضي → البحث غير مفعّل)
//   SEARCH_PROVIDER  → 'tavily' (افتراضي) أو 'serper'
// كل النتائج بترجع بنفس الشكل: { title, url, snippet, source, date }
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date: string;
}

// خطأ مخصص لما يكون البحث غير مفعّل (مفيش مفتاح) — عشان نديله رسالة نظيفة
export class SearchNotConfiguredError extends Error {
  constructor() {
    super('البحث غير مفعّل');
    this.name = 'SearchNotConfiguredError';
  }
}

const SEARCH_TIMEOUT_MS = 20_000;

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * webSearch — بحث ويب عبر Tavily أو Serper حسب SEARCH_PROVIDER.
 * بيرمي SearchNotConfiguredError لو المفتاح فاضي.
 * بيرمي Error عادي لو فشل الطلب.
 */
export async function webSearch(query: string, num = 5): Promise<WebSearchResult[]> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) {
    throw new SearchNotConfiguredError();
  }

  const provider = (process.env.SEARCH_PROVIDER || 'tavily').toLowerCase();
  const count = Math.min(Math.max(num, 1), 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    if (provider === 'serper') {
      // ─── Serper (Google) ───────────────────────────────────────────────
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: count }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
      const data = (await res.json()) as {
        organic?: Array<{ title: string; link: string; snippet?: string; date?: string }>;
      };
      return (data.organic || []).slice(0, count).map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet || '',
        source: hostFromUrl(r.link),
        date: r.date || '',
      }));
    }

    // ─── Tavily (افتراضي) ──────────────────────────────────────────────────
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: count,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const data = (await res.json()) as {
      results?: Array<{ title: string; url: string; content?: string; published_date?: string }>;
    };
    return (data.results || []).slice(0, count).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || '',
      source: hostFromUrl(r.url),
      date: r.published_date || '',
    }));
  } finally {
    clearTimeout(timer);
  }
}
