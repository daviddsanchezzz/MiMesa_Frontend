import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session using the refresh token cookie
    api.post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return api.get('/auth/me');
      })
      .then(({ data }) => setBusiness(data))
      .catch(() => {}) // No session, user needs to log in
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      setAccessToken(null);
      setBusiness(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setBusiness(data.business);
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    setAccessToken(data.accessToken);
    setBusiness(data.business);
  };

  const refreshBusiness = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setBusiness(data);
    } catch (err) {
      console.error('Error refreshing business data:', err);
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setAccessToken(null);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider value={{ business, loading, login, register, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
