'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

// مزوّد الثيم (نهار/ليل) — الافتراضي «قاعة النهار» (light)، الاختيار محفوظ في localStorage
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
