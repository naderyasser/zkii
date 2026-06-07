import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// يحمي كل المسارات ما عدا /login و /api/auth/* والـ assets.
// بدون جلسة: /api/* → 401 JSON، غيرها → redirect /login.
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('callbackUrl', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // كل حاجة ما عدا: login، NextAuth routes، static assets
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)',
  ],
};
