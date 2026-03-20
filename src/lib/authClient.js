import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { adminClient }     from 'better-auth/client/plugins';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://mimesa-backend.onrender.com';
const TOKEN_KEY = 'ba_session_token';

// Cross-origin token helpers (for Netlify frontend → Render backend)
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  basePath: '/api/betterauth',

  // When the server (bearer plugin) sends set-auth-token, persist it.
  // On every request, attach it as Authorization: Bearer so Better Auth
  // can validate the session without relying on cross-origin cookies.
  fetchOptions: {
    // After sign-in / sign-up: capture the session token from the response body
    // so we can use it as Bearer for cross-origin requests (cookies don't work cross-origin).
    onSuccess: (ctx) => {
      try {
        const token = ctx.data?.token
          ?? ctx.response?.headers?.get?.('set-auth-token');
        if (token) setStoredToken(token);
      } catch { /* ignore */ }
    },
    onRequest: (ctx) => {
      try {
        const token = getStoredToken();
        if (token && ctx.options) {
          ctx.options.headers = { ...ctx.options.headers, Authorization: `Bearer ${token}` };
        }
      } catch { /* ignore */ }
    },
  },

  plugins: [
    twoFactorClient(),
    adminClient(),
  ],
});

// Named exports for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
