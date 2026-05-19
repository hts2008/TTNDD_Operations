import { create } from 'zustand';
import { ApiError, api } from './api';

interface User {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  firebaseUid?: string;
  memberId?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  authStatus: 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error';
  setAuth: (user: User, token: string) => void;
  hydrate: () => Promise<User | null>;
  logout: () => void;
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function getInitialToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: getInitialToken(),
  hydrated: false,
  authStatus: getInitialToken() ? 'idle' : 'anonymous',
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    setCookie('token', token);
    set({ user, token, hydrated: true, authStatus: 'authenticated' });
  },
  hydrate: async () => {
    const token = getInitialToken();
    if (!token) {
      set({ user: null, token: null, hydrated: true, authStatus: 'anonymous' });
      return null;
    }

    set({ token, authStatus: 'loading' });
    try {
      const res = await api.get<{ user: User }>('/auth/me', undefined, { token });
      set({ user: res.user, token, hydrated: true, authStatus: 'authenticated' });
      return res.user;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        localStorage.removeItem('token');
        removeCookie('token');
        set({ user: null, token: null, hydrated: true, authStatus: 'anonymous' });
        return null;
      }
      set({ hydrated: true, authStatus: 'error' });
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    removeCookie('token');
    set({ user: null, token: null, hydrated: true, authStatus: 'anonymous' });
  },
}));
