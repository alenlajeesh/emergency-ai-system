import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, clearStoredSession, getStoredSession, storeSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);
  const [loading, setLoading] = useState(Boolean(getStoredSession()));

  useEffect(() => {
    if (!session?.token) { setLoading(false); return undefined; }
    let live = true;
    apiClient.me().then((result) => {
      if (!live) return;
      const next = { ...session, user: result.user };
      storeSession(next); setSession(next);
    }).catch(() => {
      if (live) { clearStoredSession(); setSession(null); }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const value = useMemo(() => ({
    session, user: session?.user || null, loading,
    async login(payload) { const result = await apiClient.login(payload); storeSession(result); setSession(result); return result; },
    async signup(payload) { const result = await apiClient.signup(payload); storeSession(result); setSession(result); return result; },
    logout() { clearStoredSession(); setSession(null); },
  }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
