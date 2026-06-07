'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Landmark, LogIn, Loader2 } from 'lucide-react';

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';
  const [busy, setBusy] = useState(false);

  const go = () => {
    setBusy(true);
    signIn('google', { callbackUrl });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6" dir="rtl">
      {/* برواز المتحف */}
      <div className="w-full max-w-sm rounded-[2px] border border-museum-gold p-1">
        <div className="rounded-[1px] border border-museum-line bg-surface px-8 py-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-2 text-koala-bright">
            <Landmark size={20} className="text-museum-gold" />
            <span className="font-amiri text-2xl font-bold">زكي</span>
          </div>
          <h1 className="font-amiri mb-1 text-xl text-koala-bright">أهلاً بعودتك</h1>
          <p className="mb-8 text-sm text-koala-secondary">سجّل الدخول للوصول إلى مساحتك.</p>

          <button
            onClick={go}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-museum-line bg-base px-4 py-2.5 text-sm text-koala-primary hover:border-museum-gold hover:text-koala-bright disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            الدخول عبر Google
          </button>

          <p className="mt-6 text-[11px] text-koala-muted">بياناتك خاصة بك — مساحة معزولة لكل مستخدم.</p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
