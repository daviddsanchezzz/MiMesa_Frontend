import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, adminClient, bearerClient } from 'better-auth/client/plugins';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://mimesa-backend.onrender.com';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  basePath: '/api/betterauth',
  plugins: [
    twoFactorClient(),
    adminClient(),
    bearerClient(), // stores session token in localStorage for cross-origin setups
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
