import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/session';

// استخراج نص مقروء من محتوى BlockNote (JSON) للبحث وعمل snippet
function extractText(contentJson: string | null): string {
  if (!contentJson) return '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return '';
  }
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === 'string') { parts.push(node); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === 'string') parts.push(obj.text);
      if (obj.content) walk(obj.content);
      if (obj.children) walk(obj.children);
    }
  };
  walk(parsed);
  return parts.join(' ');
}

function snippet(text: string, term: string): string {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 30);
  return (start > 0 ? '…' : '') + text.slice(start, idx + term.length + 50).trim() + '…';
}

// GET /api/search?q=...  — بحث في عناوين الصفحات ومحتوى الـ blocks
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json([]);

    const pages = await db.page.findMany({
      where: {
        userId,
        archivedAt: null,
        OR: [{ title: { contains: q } }, { content: { contains: q } }],
      },
      select: { id: true, title: true, icon: true, type: true, content: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const results = pages.map((p) => {
      const titleMatch = p.title.toLowerCase().includes(q.toLowerCase());
      let snip = '';
      if (!titleMatch) {
        const text = extractText(p.content);
        if (text.toLowerCase().includes(q.toLowerCase())) snip = snippet(text, q);
      }
      return { id: p.id, title: p.title, icon: p.icon, type: p.type, snippet: snip };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[search] error', error);
    return NextResponse.json({ error: 'search failed' }, { status: 500 });
  }
}
