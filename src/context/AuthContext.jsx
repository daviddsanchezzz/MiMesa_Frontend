import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/authClient';
import api, { setActiveBusinessId } from '../services/api';
import { setStoredToken } from '../lib/authClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Better Auth session (user identity)
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Business data for the currently active context
  const [business, setBusiness]               = useState(null);
  const [businessLoading, setBusinessLoading] = useState(false);

  // All businesses this user belongs to (for multi-business switching)
  const [memberships, setMemberships] = useState([]);

  const userId = session?.user?.id;

  const applyMeResponse = useCallback((data) => {
    setBusiness(data);
    setMemberships(data.memberships ?? []);
    // Keep the header in sync with the active business
    if (data.id) setActiveBusinessId(data.id);
  }, []);

  // Reload business context whenever the session changes
  useEffect(() => {
    if (!userId) {
      setBusiness(null);
      setMemberships([]);
      setActiveBusinessId(null);
      return;
    }
    setBusinessLoading(true);
    api.get('/auth/me')
      .then(({ data }) => applyMeResponse(data))
      .catch(() => setBusiness(null))
      .finally(() => setBusinessLoading(false));
  }, [userId, applyMeResponse]);

  // Force-logout event dispatched by the axios interceptor on unrecoverable 401
  useEffect(() => {
    const handle = () => { setBusiness(null); setMemberships([]); setActiveBusinessId(null); };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  const loading = sessionLoading || businessLoading;

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Credenciales incorrectas');
    // onSuccess in authClient stores the token; also trigger business fetch directly
    // so we don't depend on useSession() re-syncing (cross-origin cookies are unreliable)
    if (data?.token) setStoredToken(data.token);
    await refreshBusiness();
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (name, email, password, phone = '') => {
    const { data, error } = await authClient.signUp.email({ name, email, password, phone });
    if (error) throw new Error(error.message || 'Error al crear la cuenta');
    if (data?.token) setStoredToken(data.token);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await authClient.signOut();
    setStoredToken(null);
    setBusiness(null);
    setMemberships([]);
    setActiveBusinessId(null);
  };

  // ── Refresh current business data ─────────────────────────────────────────
  const refreshBusiness = async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyMeResponse(data);
    } catch { /* silently ignore */ }
  };

  // ── Switch active business ─────────────────────────────────────────────────
  // Sets the X-Business-Id header and reloads context from the server.
  const switchBusiness = async (businessId) => {
    setActiveBusinessId(businessId);
    setBusinessLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      applyMeResponse(data);
    } catch { /* silently ignore */ } finally {
      setBusinessLoading(false);
    }
  };

  // Convenience helpers derived from active business
  const isDev              = business?.isDev ?? false;
  const role               = business?.role ?? null;
  const plan               = business?.plan ?? 'free';
  const subscriptionStatus = business?.subscriptionStatus ?? null;

  const HIERARCHY = { owner: 3, manager: 2, staff: 1 };
  const hasRole   = (minRole) => (HIERARCHY[role] ?? 0) >= (HIERARCHY[minRole] ?? 0);
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return (
    <AuthContext.Provider value={{
      business, loading, memberships,
      login, register, logout, refreshBusiness, switchBusiness,
      isDev, role, plan, subscriptionStatus,
      hasRole, isSubscribed,
      session: session ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
