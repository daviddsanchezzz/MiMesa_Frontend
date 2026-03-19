import { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../lib/authClient';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Better Auth session (user identity + session metadata)
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Business data (restaurant settings linked to the logged-in user)
  const [business, setBusiness]         = useState(null);
  const [businessLoading, setBusinessLoading] = useState(false);

  const userId = session?.user?.id;

  // Whenever the Better Auth session changes, (re)load the Business
  useEffect(() => {
    if (!userId) {
      setBusiness(null);
      return;
    }
    setBusinessLoading(true);
    api.get('/auth/me')
      .then(({ data }) => setBusiness(data))
      .catch(() => setBusiness(null))
      .finally(() => setBusinessLoading(false));
  }, [userId]);

  // Force-logout event dispatched by the axios interceptor on unrecoverable 401
  useEffect(() => {
    const handle = () => setBusiness(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  const loading = sessionLoading || businessLoading;

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Credenciales incorrectas');
    // session state updates automatically via useSession()
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (name, email, password, phone = '') => {
    const { error } = await authClient.signUp.email({ name, email, password, phone });
    if (error) throw new Error(error.message || 'Error al crear la cuenta');
    // Business is auto-created on the backend via databaseHook
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await authClient.signOut();
    setBusiness(null);
  };

  // ── Refresh business data (used after settings updates) ───────────────────
  const refreshBusiness = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setBusiness(data);
    } catch {
      // silently ignore
    }
  };

  // Convenience helpers derived from business data
  const role               = business?.role ?? null;
  const plan               = business?.plan ?? 'free';
  const subscriptionStatus = business?.subscriptionStatus ?? null;

  /** Returns true if the current user has at least the given role level */
  const HIERARCHY = { owner: 3, manager: 2, staff: 1 };
  const hasRole = (minRole) => (HIERARCHY[role] ?? 0) >= (HIERARCHY[minRole] ?? 0);

  /** Returns true if the subscription is currently active */
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return (
    <AuthContext.Provider value={{
      business, loading,
      login, register, logout, refreshBusiness,
      // Role / plan helpers
      role, plan, subscriptionStatus,
      hasRole, isSubscribed,
      // Raw Better Auth session (for Profile / 2FA pages)
      session: session ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
