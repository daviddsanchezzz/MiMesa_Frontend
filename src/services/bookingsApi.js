import api from './api';
import publicApi from './publicApi';

// Thin wrappers over /api/bookings (generic agenda module).
const unwrap = (p) => p.then((r) => r.data);

export const bookingsApi = {
  // setup
  resources: (includeInactive = false) => unwrap(api.get('/bookings/resources', { params: { includeInactive } })),
  createResource: (data) => unwrap(api.post('/bookings/resources', data)),
  updateResource: (id, data) => unwrap(api.put(`/bookings/resources/${id}`, data)),
  deleteResource: (id) => unwrap(api.delete(`/bookings/resources/${id}`)),
  setResourceServices: (id, serviceIds) => unwrap(api.put(`/bookings/resources/${id}/services`, { serviceIds })),

  services: (includeInactive = false) => unwrap(api.get('/bookings/services', { params: { includeInactive } })),
  createService: (data) => unwrap(api.post('/bookings/services', data)),
  updateService: (id, data) => unwrap(api.put(`/bookings/services/${id}`, data)),
  deleteService: (id) => unwrap(api.delete(`/bookings/services/${id}`)),

  schedule: (owner = {}) => unwrap(api.get('/bookings/schedule', { params: owner })),
  saveSchedule: (data) => unwrap(api.put('/bookings/schedule', data)),
  clearResourceSchedule: (ownerId) => unwrap(api.delete('/bookings/schedule', { params: { ownerType: 'resource', ownerId } })),

  // day to day
  stats: () => unwrap(api.get('/bookings/stats')),
  customersSummary: () => unwrap(api.get('/bookings/customers/summary')),
  customerHistory: (customerId) => unwrap(api.get(`/bookings/customers/${customerId}`)),
  availability: (params) => unwrap(api.get('/bookings/availability', { params })),
  list: (params) => unwrap(api.get('/bookings', { params })),
  create: (data) => unwrap(api.post('/bookings', data)),
  setStatus: (id, status) => unwrap(api.patch(`/bookings/${id}/status`, { status })),
  setNotes: (id, data) => unwrap(api.patch(`/bookings/${id}/notes`, data)),
};

export function apiError(err, fallback = 'Algo ha fallado. Inténtalo de nuevo.') {
  return err?.response?.data?.message || fallback;
}

// Public (guest) side: no session, CORS-open endpoints.

export const publicBookingsApi = {
  catalog: (businessId) => unwrap(publicApi.get(`/bookings/public/${businessId}/catalog`)),
  availability: (businessId, params) => unwrap(publicApi.get(`/bookings/public/${businessId}/availability`, { params })),
  create: (businessId, data) => unwrap(publicApi.post(`/bookings/public/${businessId}/bookings`, data)),
  details: (bookingId, token) => unwrap(publicApi.get('/bookings/public/cancel', { params: { bookingId, token } })),
  cancel: (bookingId, token) => unwrap(publicApi.post('/bookings/public/cancel', { bookingId, token })),
};
