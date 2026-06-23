import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout, signup as apiSignup, acceptInvite as apiAccept } from '@/lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = anon, object = signed in
  const [family, setFamily] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { user, family } = await fetchMe();
      setUser(user);
      setFamily(family);
    } catch {
      setUser(null);
      setFamily(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (data) => {
    const res = await apiLogin(data);
    await refresh();
    return res;
  };
  const signup = async (data) => {
    const res = await apiSignup(data);
    await refresh();
    return res;
  };
  const acceptInvite = async (data) => {
    const res = await apiAccept(data);
    await refresh();
    return res;
  };
  const logout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    setUser(null); setFamily(null);
  };

  return (
    <AuthCtx.Provider value={{ user, family, refresh, login, signup, acceptInvite, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
