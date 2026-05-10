import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/authClient';
import {
  setStoredToken,
  getStoredToken,
  getImpersonationMeta,
  setImpersonationMeta,
  getImpersonationOriginalToken,
  setImpersonationOriginalToken,
  clearImpersonationState,
} from '../lib/authClient';
import api, { setActiveBusinessId } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [business, setBusiness]   = useState(null);
  const [loading, setLoading]     = useState(true);   // starts true until first load
  const [memberships, setMemberships] = useState([]);
  const [impersonation, setImpersonation] = useState(() => getImpersonationMeta());

  const applyMeResponse = useCallback((data) => {
    setBusiness(data);
    setMemberships(data.memberships ?? []);
    if (data.id) setActiveBusinessId(data.id);
    else setActiveBusinessId(null);
  }, []);

  // Initial load: restore session from stored token
  // This is the primary session source for cross-origin setups (Netlify/Vercel -> Render).
  // useSession() from Better Auth relies on cookies which don't work cross-origin.
  useEffect(() => {

    api.get('/auth/me')
      .then(({ data }) => applyMeResponse(data))
      .catch(() => {
        // Token invalid or expired - clear it
        setStoredToken(null);
        setActiveBusinessId(null);
        clearImpersonationState();
        setImpersonation(null);
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
      clearImpersonationState();
      setImpersonation(null);
    };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  // Login
  const login = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    let result;
    try {
      result = await authClient.signIn.email({ email: normalizedEmail, password });
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (
        msg.includes('load failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror')
      ) {
        throw new Error('Error de conexion con el servidor. Revisa la red y la configuracion del dominio.');
      }
      throw new Error(err?.message || 'Error al iniciar sesion');
    }
    const { data, error } = result;
    if (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
      }
      if (String(error.code || '').includes('TWO_FACTOR')) {
        throw new Error('Esta cuenta requiere verificacion en dos pasos y esta pantalla aun no la gestiona.');
      }
      throw new Error(error.message || 'Credenciales incorrectas');
    }
    if (data?.token) setStoredToken(data.token);
    await refreshBusiness();
  };

  // Register
  const register = async (name, email, password, phone = '') => {
    const { data, error } = await authClient.signUp.email({ name, email, password, phone });
    if (error) throw new Error(error.message || 'Error al crear la cuenta');
    // Registration now requires email verification before accessing the app.
    // Keep user logged out until the verification link is used.
    if (data?.token) setStoredToken(null);
    setBusiness(null);
    setMemberships([]);
    setActiveBusinessId(null);
  };

  // Logout
  const logout = async () => {
    await authClient.signOut().catch(() => {});
    setStoredToken(null);
    setBusiness(null);
    setMemberships([]);
    setActiveBusinessId(null);
    clearImpersonationState();
    setImpersonation(null);
  };

  const startImpersonation = async ({ token, user }) => {
    const currentToken = getStoredToken();
    if (!currentToken) throw new Error('No hay sesion activa para iniciar impersonacion');
    if (!token) throw new Error('Token de impersonacion no valido');

    if (!getImpersonationOriginalToken()) {
      setImpersonationOriginalToken(currentToken);
    }

    const meta = {
      userId: user?.id || '',
      userName: user?.name || user?.email || 'Usuario',
      userEmail: user?.email || '',
      startedAt: new Date().toISOString(),
    };

    setStoredToken(token);
    setImpersonationMeta(meta);
    setImpersonation(meta);
    setActiveBusinessId(null);
    await refreshBusiness();
  };

  const stopImpersonation = async () => {
    const impersonatedToken = getStoredToken();
    const originalToken = getImpersonationOriginalToken();
    let restoredToken = originalToken || null;

    try {
      // Preferred exit path: tell Better Auth to close impersonation and restore admin session.
      // This is required when impersonation cookies are present.
      const { headers } = await api.post(
        '/betterauth/admin/stop-impersonating',
        {},
        impersonatedToken
          ? { headers: { Authorization: `Bearer ${impersonatedToken}` } }
          : undefined,
      );
      const tokenFromHeader = headers?.['set-auth-token'];
      if (tokenFromHeader) restoredToken = tokenFromHeader;
    } catch {
      // If server-side stop is unavailable, fallback to local token restore.
    }

    if (restoredToken) setStoredToken(restoredToken);
    else setStoredToken(null);

    clearImpersonationState();
    setImpersonation(null);
    setActiveBusinessId(null);
    await refreshBusiness();
  };

  // Refresh current business data
  const refreshBusiness = async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyMeResponse(data);
    } catch { /* silently ignore */ }
  };

  // Switch active business
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
  const FREE_CAPS  = {
    maxReservationsPerMonth: 30,
    maxMembers:              1,
    maxTables:               15,
    maxShifts:               2,
    maxVacations:            1,
    autoEmails:              false,
    staffNotifications:      false,
    marketing:               false,
    promoCodes:              false,
    iframeEmbed:             false,
    removeTableoBranding:    false,
    pendingApprovalControl:  false,
    advancedAnalytics:       false,
    autoReminders:           false,
    advancedReminders:       false,
    noShowTracking:          false,
    dataExport:              false,
    reservationPayments:     false,
  };
  const BASIC_CAPS = {
    maxReservationsPerMonth: Infinity,
    maxMembers:              1,
    maxTables:               Infinity,
    maxShifts:               Infinity,
    maxVacations:            Infinity,
    autoEmails:              true,
    staffNotifications:      true,
    marketing:               false,
    promoCodes:              false,
    iframeEmbed:             true,
    removeTableoBranding:    false,
    pendingApprovalControl:  true,
    advancedAnalytics:       false,
    autoReminders:           false,
    advancedReminders:       false,
    noShowTracking:          true,
    dataExport:              true,
    reservationPayments:     false,
  };
  const PRO_CAPS = {
    ...BASIC_CAPS,
    maxMembers:           Infinity,
    marketing:            true,
    promoCodes:           true,
    advancedAnalytics:    true,
    autoReminders:        true,
    advancedReminders:    true,
    reservationPayments:  true,
  };
  const planCaps = !isSubscribed ? FREE_CAPS : plan === 'pro' ? PRO_CAPS : BASIC_CAPS;
  const canUse    = (feature) => !!planCaps[feature];
  const planLimit = (key) => planCaps[key] ?? Infinity;
  const moduleAccess = business?.modules ?? {};
  const isModuleEnabled = (moduleKey) => !!moduleAccess?.[moduleKey]?.enabled;

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
      impersonation, startImpersonation, stopImpersonation,
      isDev, role, plan, subscriptionStatus,
      trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd,
      hasRole, isSubscribed, canUse, planLimit,
      moduleAccess, isModuleEnabled,
      session,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);





