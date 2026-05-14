const DEFAULT_USER_ID = 'default-user';

export function getActiveToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('zaki-auth');
  if (!raw) return null;
  try {
    const store = JSON.parse(raw);
    return store?.state?.activeAccountId
      ? store.state.accounts?.find((a: { id: string }) => a.id === store.state.activeAccountId)?.accessToken ?? null
      : null;
  } catch {
    return null;
  }
}

export function getDefaultUserId(): string {
  return DEFAULT_USER_ID;
}

export function isAuthenticated(): boolean {
  return !!getActiveToken();
}
