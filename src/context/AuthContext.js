import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setSessionExpiredHandler, tokens } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    tokens.load().then((has) => (has ? refreshUser() : null)).finally(() => setReady(true));
  }, [refreshUser]);

  const handle = async (res) => {
    await tokens.set(res.data);
    setUser(res.data.user);
    return res;
  };

  const login = async (login, password) => handle(await api.post('/auth/login', { login, password }));
  const register = async (form) => handle(await api.post('/auth/register', form));
  const logout = async () => {
    try { await api.post('/auth/logout', { refresh_token: tokens.refresh }); } catch { /* hors ligne */ }
    await tokens.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, register, logout, refreshUser, isSeller: user?.shop?.status === 'approved' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
