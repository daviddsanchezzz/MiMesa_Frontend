import { useEffect, useState } from 'react';

// 'invite' (only invited people can join) or 'open'. Cached for the session.
let cached = null;

export function useSignupMode() {
  const [mode, setMode] = useState(cached || 'loading');
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    const BASE = (import.meta.env.VITE_API_URL || 'https://api.vetrareserve.com').replace(/\/api\/?$/, '');
    fetch(`${BASE}/api/auth/public/signup`)
      .then((r) => (r.ok ? r.json() : { mode: 'invite' }))
      .catch(() => ({ mode: 'invite' }))
      .then((d) => { cached = d.mode === 'open' ? 'open' : 'invite'; if (alive) setMode(cached); });
    return () => { alive = false; };
  }, []);
  return mode;
}
