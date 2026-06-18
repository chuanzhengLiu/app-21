import { create } from 'zustand';
import type { User, EmailLoginCredentials, PhoneLoginCredentials, RegisterCredentials } from '@/types';
import { authApi } from '@/utils/api';

const TOKEN_KEY = 'accessToken';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  loginWithEmail: (credentials: EmailLoginCredentials) => Promise<void>;
  loginWithPhone: (credentials: PhoneLoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

const initialToken = getStoredToken();

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: initialToken,
  isAuthenticated: !!initialToken,
  loading: false,
  error: null,

  loginWithEmail: async (credentials: EmailLoginCredentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.loginWithEmail(credentials);
      const { user, accessToken } = response;
      setStoredToken(accessToken);
      set({ user, accessToken, isAuthenticated: true, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  loginWithPhone: async (credentials: PhoneLoginCredentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.loginWithPhone(credentials);
      const { user, accessToken } = response;
      setStoredToken(accessToken);
      set({ user, accessToken, isAuthenticated: true, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.register(credentials);
      const { user, accessToken } = response;
      setStoredToken(accessToken);
      set({ user, accessToken, isAuthenticated: true, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    removeStoredToken();
    set({ user: null, accessToken: null, isAuthenticated: false, loading: false, error: null });
  },

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.getProfile();
      set({ user, loading: false });
    } catch (error) {
      set({ error: null });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout();
  });
}

export default useAuthStore;
