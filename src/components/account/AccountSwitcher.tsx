'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useActiveAccount } from '@/hooks/useActiveAccount';
import { AccountDropdown } from '@/components/account/AccountDropdown';

interface AccountSwitcherProps {
  onAddAccount?: () => void;
}

export function AccountSwitcher({ onAddAccount }: AccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { initials } = useActiveAccount();

  const handleClose = useCallback(() => setOpen(false), []);

  const handleAddAccount = useCallback(() => {
    setOpen(false);
    onAddAccount?.();
  }, [onAddAccount]);

  return (
    <div className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative size-7 rounded-full flex items-center justify-center',
          'bg-koala-purple/20 text-koala-purple',
          'text-[11px] font-medium',
          'transition-colors duration-150',
          'hover:bg-koala-purple/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong'
        )}
        aria-label="تبديل الحساب"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="select-none">{initials}</span>

        {/* Active dot — positioned bottom-end in RTL */}
        <span
          className={cn(
            'absolute bottom-0 end-0',
            'size-[6px] rounded-full bg-koala-teal',
            'border border-surface'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <AccountDropdown
          onClose={handleClose}
          onAddAccount={handleAddAccount}
        />
      )}
    </div>
  );
}
