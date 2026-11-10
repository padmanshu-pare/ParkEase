import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { TOKEN_KEY } from '../services/api';
import { closeSocket } from '../services/socket';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!['admin', 'manager'].includes(data.user.role)) throw new Error('This panel is for admins and managers only.');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    closeSocket();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>{children}</AuthContext.Provider>;
}
