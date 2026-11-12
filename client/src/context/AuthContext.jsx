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

  // Staff log in with the manager panel; drivers pass ['driver'] from the driver login page
  const login = useCallback(async (email, password, allowedRoles = ['admin', 'manager']) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!allowedRoles.includes(data.user.role)) {
      throw new Error(
        allowedRoles.includes('driver')
          ? 'This login is for drivers only. Staff should use the manager login.'
          : 'This panel is for admins and managers only.'
      );
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Used after driver sign-up, which already returns a token
  const startSession = useCallback((token, sessionUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    closeSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, startSession, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}
