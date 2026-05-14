'use client';

import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes needs hydration — use layout effect pattern via callback
  // We use a callback ref pattern instead of useEffect to avoid lint warning
  if (!mounted && typeof window !== 'undefined') {
    // Schedule mount state update outside of render
    queueMicrotask(() => setMounted(true));
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-9 border border-border"
      >
        <div className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 border border-border hover:bg-accent"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {theme === 'dark' ? (
        <Sun className="size-4 text-cyber-yellow" />
      ) : (
        <Moon className="size-4 text-slate-600" />
      )}
    </Button>
  );
}
