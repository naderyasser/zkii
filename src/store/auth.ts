import { create } from 'zustand';

interface Account {
  id: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  avatar?: string;
}

interface AuthStore {
  accounts: Account[];
  activeAccountId: string | null;

  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  switchAccount: (id: string) => void;
  updateToken: (id: string, accessToken: string) => void;
  logout: (id?: string) => void;
  getActiveAccount: () => Account | undefined;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accounts: [
    {
      id: 'default-user',
      username: 'زكي',
      email: 'zaki@local',
      accessToken: '',
      refreshToken: '',
    },
  ],
  activeAccountId: 'default-user',

  addAccount: (account) =>
    set((s) => ({ accounts: [...s.accounts, account] })),

  removeAccount: (id) =>
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      activeAccountId: s.activeAccountId === id
        ? s.accounts[0]?.id ?? null
        : s.activeAccountId,
    })),

  switchAccount: (id) =>
    set({ activeAccountId: id }),

  updateToken: (id, accessToken) =>
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, accessToken } : a
      ),
    })),

  logout: (id) => {
    if (!id) {
      set({ accounts: [], activeAccountId: null });
    } else {
      get().removeAccount(id);
    }
  },

  getActiveAccount: () => {
    const { accounts, activeAccountId } = get();
    return accounts.find((a) => a.id === activeAccountId);
  },
}));
