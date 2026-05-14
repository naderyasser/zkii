'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useActiveAccount } from '@/hooks/useActiveAccount';

interface AccountDropdownProps {
  onClose: () => void;
  onAddAccount: () => void;
}

export function AccountDropdown({ onClose, onAddAccount }: AccountDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const accounts = useAuthStore((s) => s.accounts);
  const activeAccountId = useAuthStore((s) => s.activeAccountId);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const { initials } = useActiveAccount();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function getInitials(username: string): string {
    return username.slice(0, 2);
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full mt-1 end-0 z-50',
        'w-[200px] rounded-xl',
        'bg-surface border border-border-subtle',
        'py-1 animate-slide-up'
      )}
      role="menu"
    >
      {accounts.map((account) => {
        const isActive = account.id === activeAccountId;
        return (
          <button
            key={account.id}
            onClick={() => {
              switchAccount(account.id);
              onClose();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2',
              'text-[13px] transition-colors duration-150',
              isActive
                ? 'text-koala-bright bg-hover'
                : 'text-koala-primary hover:bg-hover'
            )}
            role="menuitem"
          >
            {/* 24px avatar */}
            <div
              className={cn(
                'size-6 rounded-full flex items-center justify-center shrink-0',
                'bg-koala-purple/20 text-koala-purple text-[11px] font-medium'
              )}
            >
              {getInitials(account.username)}
            </div>

            <span className="truncate flex-1 text-start">
              {account.username}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span className="size-[6px] rounded-full bg-koala-teal shrink-0" />
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div className="my-1 border-t border-border-subtle" />

      {/* Add account */}
      <button
        onClick={onAddAccount}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-[12px] text-koala-secondary',
          'transition-colors duration-150',
          'hover:bg-hover hover:text-koala-primary'
        )}
        role="menuitem"
      >
        <Plus className="size-3.5 scale-x-[-1]" />
        إضافة حساب جديد
      </button>
    </div>
  );
}
