import api from './api';
import publicApi from './publicApi';

// Thin wrappers over /api/bookings (generic agenda module).
const unwrap = (p) => p.then((r) => r.data);

export const bookingsApi = {
  // setup
  resources: (includeInactive = false) => unwrap(api.get('/bookings/resources', { params: { includeInactive } })),
  myResource: () => unwrap(api.get('/bookings/resources/me')),
  updateMyPhoto: (data) => unwrap(api.put('/bookings/resources/me/photo', data)),
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
  checkout: (id, data) => unwrap(api.post(`/bookings/${id}/checkout`, data)),
  undoCheckout: (id) => unwrap(api.delete(`/bookings/${id}/checkout`)),
  team: (from, to) => unwrap(api.get('/bookings/team', { params: { from, to } })),
  setTeamPay: (resourceId, data) => unwrap(api.put(`/bookings/team/${resourceId}/pay`, data)),
  addTeamPayment: (resourceId, data) => unwrap(api.post(`/bookings/team/${resourceId}/payments`, data)),
  cashDay: (date) => unwrap(api.get('/bookings/cash', { params: date ? { date } : {} })),
  closeCash: (data) => unwrap(api.post('/bookings/cash/close', data)),
  reopenCash: (date) => unwrap(api.delete('/bookings/cash/close', { params: { date } })),
  // loyalty: a reward every Nth paid visit
  loyalty: () => unwrap(api.get('/bookings/loyalty')),
  saveLoyalty: (data) => unwrap(api.put('/bookings/loyalty', data)),
  customerLoyalty: (customerId) => unwrap(api.get(`/bookings/customers/${customerId}/loyalty`)),
  // packs (bonos): catalogue, sold to a customer
  packs: (includeInactive = false) => unwrap(api.get('/bookings/packs', { params: { includeInactive } })),
  createPack: (data) => unwrap(api.post('/bookings/packs', data)),
  updatePack: (id, data) => unwrap(api.put(`/bookings/packs/${id}`, data)),
  deletePack: (id) => unwrap(api.delete(`/bookings/packs/${id}`)),
  customerPacks: (customerId) => unwrap(api.get(`/bookings/customers/${customerId}/packs`)),
  sellPack: (customerId, data) => unwrap(api.post(`/bookings/customers/${customerId}/packs`, data)),
  voidPackSale: (id) => unwrap(api.delete(`/bookings/customer-packs/${id}`)),
  // follow-up emails (te toca volver, pedir opinión)
  followUps: () => unwrap(api.get('/bookings/follow-ups')),
  saveFollowUps: (data) => unwrap(api.put('/bookings/follow-ups', data)),
  // absences and moving an appointment to someone else
  absences: (from, to) => unwrap(api.get('/bookings/absences', { params: { from, to } })),
  createAbsence: (data) => unwrap(api.post('/bookings/absences', data)),
  deleteAbsence: (id) => unwrap(api.delete(`/bookings/absences/${id}`)),
  reassignOptions: (id, from) => unwrap(api.get(`/bookings/${id}/reassign-options`, { params: { from } })),
  reassign: (id, from, to) => unwrap(api.patch(`/bookings/${id}/reassign`, { from, to })),
  // change day, time, services or professional of an appointment
  rescheduleSlots: (id, data) => unwrap(api.post(`/bookings/${id}/reschedule-slots`, data)),
  reschedule: (id, data) => unwrap(api.patch(`/bookings/${id}/reschedule`, data)),
  // what customers can do from their link
  policy: () => unwrap(api.get('/bookings/policy')),
  savePolicy: (data) => unwrap(api.put('/bookings/policy', data)),
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
  rescheduleSlots: (bookingId, token, from, to) => unwrap(publicApi.post('/bookings/public/reschedule/slots', { bookingId, token, from, to })),
  reschedule: (bookingId, token, date, time) => unwrap(publicApi.post('/bookings/public/reschedule', { bookingId, token, date, time })),
};
