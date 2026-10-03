import { QueryClient, keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * Data cache for the app (TanStack Query). Coming back to a screen paints what
 * we had at once; if it is older than 30 s it refreshes in the background.
 *
 * Query keys start with the first segment of the API path ('reservations',
 * 'bookings', 'customers'…). Whenever something is saved (any POST, PUT, PATCH
 * or DELETE through the api client) the related roots are marked stale — see
 * RELATED — so every screen that shows them reloads. Switching business or
 * logging out clears everything.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// What a change under /api/<root> can affect.
const RELATED = {
  reservations: ['reservations', 'customers', 'shifts'],
  shifts: ['shifts', 'reservations'],
  vacations: ['vacations', 'shifts'],
  exceptions: ['exceptions', 'shifts'],
  tables: ['tables', 'rooms', 'reservations'],
  rooms: ['rooms', 'tables', 'reservations'],
  bookings: ['bookings', 'customers'],
  customers: ['customers', 'bookings', 'reservations'],
  invoices: ['invoices', 'suppliers'],
  suppliers: ['suppliers', 'invoices', 'purchases'],
  purchases: ['purchases', 'suppliers'],
  promos: ['promos'],
  marketing: ['marketing'],
};
// Nothing to refresh after these (sessions, push subscriptions, uploads of files…).
const IGNORE = new Set(['push', 'contact']);

export const rootOf = (url = '') => String(url).replace(/^https?:\/\/[^/]+/, '').replace(/^\/?(api\/)?/, '').split(/[/?]/)[0];

/** Called by the api client after every successful write. */
export function invalidateAfterWrite(url) {
  const root = rootOf(url);
  if (IGNORE.has(root)) return;
  const roots = RELATED[root];
  // Unknown area (settings, team, billing…): everything may depend on it.
  if (!roots) { queryClient.invalidateQueries(); return; }
  roots.forEach((r) => queryClient.invalidateQueries({ queryKey: [r] }));
}

export function clearCache() {
  queryClient.cancelQueries();
  queryClient.clear();
}

/**
 * useQuery with the app's conventions: key = [root, ...parts]; while the key
 * changes (another day, another filter) the previous data stays on screen.
 */
export function useData(key, fn, options = {}) {
  return useQuery({ queryKey: key, queryFn: fn, placeholderData: keepPreviousData, ...options });
}
