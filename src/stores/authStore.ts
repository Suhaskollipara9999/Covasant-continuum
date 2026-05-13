/**
 * Covasant Continuum — Auth Context
 * Manages authentication state, JWT tokens, and protected routing.
 */

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'internal' | 'customer' | 'admin' | 'superadmin';
  tenant_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const API_BASE = '/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('c_user') || 'null'),
  accessToken: localStorage.getItem('c_at'),
  refreshToken: localStorage.getItem('c_rt'),
  isAuthenticated: !!localStorage.getItem('c_at'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Login failed' }));
        set({ isLoading: false, error: data.detail || 'Invalid credentials' });
        return false;
      }

      const data = await res.json();
      localStorage.setItem('c_at', data.access_token);
      localStorage.setItem('c_rt', data.refresh_token);
      localStorage.setItem('c_user', JSON.stringify(data.user));

      set({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      set({ isLoading: false, error: 'Network error. Please try again.' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('c_at');
    localStorage.removeItem('c_rt');
    localStorage.removeItem('c_user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refreshSession: async () => {
    const rt = get().refreshToken;
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        get().logout();
        return false;
      }
      const data = await res.json();
      localStorage.setItem('c_at', data.access_token);
      localStorage.setItem('c_rt', data.refresh_token);
      localStorage.setItem('c_user', JSON.stringify(data.user));
      set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

/** Authenticated fetch wrapper — auto-injects JWT and handles 401 refresh. */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers = { ...options.headers, Authorization: `Bearer ${token}` };
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${newToken}` } });
    }
  }
  return res;
}
