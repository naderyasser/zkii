import { useAuthStore } from '@/store/auth';

export function useActiveAccount() {
  const accounts = useAuthStore((s) => s.accounts);
  const activeAccountId = useAuthStore((s) => s.activeAccountId);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const addAccount = useAuthStore((s) => s.addAccount);
  const removeAccount = useAuthStore((s) => s.removeAccount);
  const logout = useAuthStore((s) => s.logout);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const initials = activeAccount
    ? activeAccount.username.slice(0, 2)
    : 'زك';

  return {
    account: activeAccount ?? null,
    initials,
    switchAccount,
    addAccount,
    removeAccount,
    logout,
  };
}
