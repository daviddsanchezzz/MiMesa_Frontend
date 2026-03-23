import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/authClient';
import { setStoredToken, getStoredToken } from '../lib/authClient';
import api, { setActiveBusinessId } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [business, setBusiness]   = useState(null);
  const [loading, setLoading]     = useState(true);   // starts true until first load
  const [memberships, setMemberships] = useState([]);

  const applyMeResponse = useCallback((data) => {
    setBusiness(data);
    setMemberships(data.memberships ?? []);
    if (data.id) setActiveBusinessId(data.id);
    else setActiveBusinessId(null);
  }, []);

  // ── Initial load: restore session from stored token ────────────────────────
  // This is the primary session source for cross-origin setups (Netlify/Vercel → Render).
  // useSession() from Better Auth relies on cookies which don't work cross-origin.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => applyMeResponse(data))
      .catch(() => {
        // Token invalid or expired — clear it
        setStoredToken(null);
        setActiveBusinessId(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Force-logout event dispatched by the axios interceptor on unrecoverable 401
  useEffect(() => {
    const handle = () => {
      setStoredToken(null);
      setBusiness(null);
      setMemberships([]);
      setActiveBusinessId(null);
    };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Credenciales incorrectas');
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
    await authClient.signOut().catch(() => {});
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
  const switchBusiness = async (businessId) => {
    setActiveBusinessId(businessId);
    try {
      const { data } = await api.get('/auth/me');
      applyMeResponse(data);
    } catch { /* silently ignore */ }
  };

  // Convenience helpers
  const isDev              = business?.isDev ?? false;
  const role               = business?.role ?? null;
  const plan               = business?.plan ?? 'free';
  const subscriptionStatus = business?.subscriptionStatus ?? null;
  const trialEndsAt        = business?.trialEndsAt  ?? null;
  const currentPeriodEnd   = business?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd  = business?.cancelAtPeriodEnd ?? false;

  const HIERARCHY = { owner: 3, manager: 2, staff: 1 };
  const hasRole   = (minRole) => (HIERARCHY[role] ?? 0) >= (HIERARCHY[minRole] ?? 0);
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  /**
   * Returns true if the business currently has access to a feature.
   * Mirrors the backend planCapabilities logic so the UI can gate without
   * an extra API call on every render.
   */
  const FREE_CAPS = { autoEmails: false, staffNotifications: false, marketing: false, promoCodes: false };
  const BASIC_CAPS = { autoEmails: true, staffNotifications: true, marketing: true, promoCodes: true };
  const planCaps = isSubscribed ? BASIC_CAPS : FREE_CAPS;
  const canUse = (feature) => !!planCaps[feature];

  // Minimal session object for pages that need the logged-in user's identity
  const session = business
    ? {
        user: {
          id: business.userId ?? '',
          email: business.userEmail ?? business.email ?? '',
          name: business.userName ?? '',
        },
      }
    : null;

  return (
    <AuthContext.Provider value={{
      business, loading, memberships,
      login, register, logout, refreshBusiness, switchBusiness,
      isDev, role, plan, subscriptionStatus,
      trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd,
      hasRole, isSubscribed, canUse,
      session,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
