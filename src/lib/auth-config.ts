// ═══════════════════════════════════════════════════════════════════════════════
// NEXTAUTH CONFIG — Google sign-in (JWT strategy، بدون adapter tables)
// منفصل تماماً عن /api/auth/google/* (تكامل Gmail/Calendar).
// ═══════════════════════════════════════════════════════════════════════════════
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { resolveUser } from './claim';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user }) {
      return !!user.email; // لازم إيميل
    },
    async jwt({ token }) {
      // أول مرة فقط: حُلّ userId من الإيميل وخزّنه في التوكن (مفيش DB hit بعد كده)
      if (!token.uid && token.email) {
        try {
          token.uid = await resolveUser(token.email, token.name);
        } catch (e) {
          console.error('[auth] resolveUser failed', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
};
