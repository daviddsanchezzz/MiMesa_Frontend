import { useData, queryClient } from '../../lib/query';
import { bookingsApi } from '../../services/bookingsApi';

// Cached reads of the bookings module (keys start with 'bookings', so any
// change to /api/bookings refreshes them; see lib/query).
const LONG = { staleTime: 5 * 60000 };
export const useResources = (includeInactive = false) => useData(['bookings', 'resources', includeInactive], () => bookingsApi.resources(includeInactive), LONG);
export const useServices = () => useData(['bookings', 'services'], () => bookingsApi.services(), LONG);
export const useSchedule = () => useData(['bookings', 'schedule', 'business'], () => bookingsApi.schedule(), LONG);
export const useBookings = (from, to, options = {}) => useData(['bookings', 'list', from, to], () => bookingsApi.list({ from, to }), { refetchInterval: 2 * 60000, ...options });
export const useAbsences = (from, to) => useData(['bookings', 'absences', from, to], () => bookingsApi.absences(from, to).catch(() => []));
export const useStats = () => useData(['bookings', 'stats'], () => bookingsApi.stats(), { refetchInterval: 3 * 60000 });

export const refreshBookings = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });
