import { NextRequest, NextResponse } from 'next/server';
import { webSearch, SearchNotConfiguredError } from '@/lib/web-search';

export async function POST(req: NextRequest) {
  try {
    const { query, num = 5 } = await req.json();
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

    // البحث عبر مزوّد خارجي (Tavily/Serper) خلف SEARCH_API_KEY
    const results = await webSearch(query, Math.min(num, 10));

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof SearchNotConfiguredError) {
      // المفتاح فاضي → نرجّع حالة خطأ نظيفة بدون كسر التطبيق
      return NextResponse.json(
        { status: 'error', error: 'البحث غير مفعّل', results: [] },
        { status: 200 }
      );
    }
    console.error('[Web Search] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
