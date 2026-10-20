import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import i18n from '../i18n';
import type { Locale, User } from '../types';
import * as authService from '../services/authService';
import { TOKEN_KEY } from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => void;
  setToken: (token: string) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) { setUser(null); return; }
    try {
      const u = await authService.me();
      setUser(u);
      if (u.preferred_locale && u.preferred_locale !== i18n.language && !localStorage.getItem('origen_locale')) {
        i18n.changeLanguage(u.preferred_locale);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const onExpired = () => setUser(null);
    window.addEventListener('origen:session-expired', onExpired);
    return () => window.removeEventListener('origen:session-expired', onExpired);
  }, [refresh]);

  async function login(email: string, password: string) {
    const { user: u, token } = await authService.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }

  async function register(payload: { name: string; email: string; password: string; phone?: string }) {
    const { user: u, token } = await authService.register({ ...payload, preferred_locale: i18n.language as Locale });
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  const isStaff = !!user && (user.role === 'manager' || user.role === 'admin');
  return (
    <AuthContext.Provider value={{ user, loading, isStaff, isAdmin: user?.role === 'admin', login, register, logout, setToken, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
