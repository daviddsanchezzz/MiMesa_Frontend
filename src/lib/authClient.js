import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { adminClient }     from 'better-auth/client/plugins';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://mimesa-backend.onrender.com';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  basePath: '/api/betterauth',
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
