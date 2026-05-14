import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { query, num = 5 } = await req.json();
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', {
      query,
      num: Math.min(num, 10),
    });

    // Format results for the AI agent
    const formatted = (results as Array<{
      name: string;
      url: string;
      snippet: string;
      host_name: string;
      date: string;
    }>).map((r) => ({
      title: r.name,
      url: r.url,
      snippet: r.snippet,
      source: r.host_name,
      date: r.date,
    }));

    return NextResponse.json({ results: formatted });
  } catch (error) {
    console.error('[Web Search] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
