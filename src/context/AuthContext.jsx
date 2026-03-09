import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setBusiness(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setBusiness(data.business);
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    localStorage.setItem('token', data.token);
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

  const logout = () => {
    localStorage.removeItem('token');
    setBusiness(null);
  };

  return (
    <AuthContext.Provider value={{ business, loading, login, register, logout, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
