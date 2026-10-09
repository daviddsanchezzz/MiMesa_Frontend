import { useCallback, useMemo } from 'react';
import { queryClient, useData } from '../../lib/query';
import { notify } from '../../lib/notify';
import { confirmDialog } from '../../ui/confirm';

const EMPTY = [];
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toMinutes } from '../agenda/utils';

const errText = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * One day of a restaurant: its reservations, the shifts (from the slots), the
 * tables and the requests waiting for approval — plus every action on a
 * reservation, so Hoy and Reservas behave exactly the same.
 */
export default function useRestaurantDay(date) {
  const { hasRole } = useAuth();
  const isManager = hasRole('manager');
  const list = (x) => (Array.isArray(x.data) ? x.data : []);
  const day = useData(['reservations', 'day', date], () => api.get('/reservations', { params: { date } }).then(list), { refetchInterval: 2 * 60000 });
  const slotsQ = useData(['shifts', 'slots', date], () => api.get('/shifts/slots', { params: { date } }).then(list));
  const pendingQ = useData(['reservations', 'pending'], () => api.get('/reservations/pending').then(list), { enabled: isManager, refetchInterval: 2 * 60000 });
  const tablesQ = useData(['tables'], () => api.get('/tables').then(list), { staleTime: 5 * 60000 });
  const reservations = day.data || EMPTY;
  const slots = slotsQ.data || EMPTY;
  const tables = tablesQ.data || EMPTY;
  const pending = (isManager && pendingQ.data) || EMPTY;
  const loading = day.isPending;

  const reload = useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['reservations'] }),
    queryClient.invalidateQueries({ queryKey: ['shifts', 'slots', date] }),
  ]), [date]);

  // Shifts in order, with the span of their slots: [{ name, start, end }]
  const shifts = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const m = toMinutes(s.time);
      const cur = map.get(s.shiftName);
      if (!cur) map.set(s.shiftName, { name: s.shiftName, start: m, end: m, times: [s.time] });
      else { cur.start = Math.min(cur.start, m); cur.end = Math.max(cur.end, m); cur.times.push(s.time); }
    }
    return [...map.values()].sort((a, b) => a.start - b.start);
  }, [slots]);

  const shiftOf = useCallback((time) => {
    const m = toMinutes(time);
    const exact = slots.find((s) => s.time === time);
    if (exact) return exact.shiftName;
    // A time outside the slots goes with the closest shift (within an hour).
    let best = null; let dist = Infinity;
    for (const sh of shifts) {
      const d = m < sh.start ? sh.start - m : m > sh.end ? m - sh.end : 0;
      if (d < dist) { dist = d; best = sh.name; }
    }
    return dist <= 60 ? best : null;
  }, [slots, shifts]);

  const seats = useMemo(() => tables.reduce((s, t) => s + (Number(t.capacity) || 0), 0), [tables]);

  const run = useCallback(async (fn, ok, fail) => {
    try {
      await fn();
      if (ok) notify(ok);
      await reload();
      return true;
    } catch (err) {
      notify(errText(err, fail || 'No se ha podido guardar'), 'error');
      return false;
    }
  }, [reload]);

  const actions = useMemo(() => ({
    reload,
    setStatus: (r, status, ok) => run(() => api.put(`/reservations/${r._id}`, { status }), ok),
    seat: (r) => run(() => api.put(`/reservations/${r._id}`, { status: 'seated' }), `${r.guestName}: sentada`),
    accept: (r) => run(() => api.put(`/reservations/${r._id}/accept`), 'Reserva aceptada; le avisamos por email'),
    reject: async (r) => {
      if (!await confirmDialog(`¿Rechazar la reserva de ${r.guestName}? Pasará a cancelada.`)) return Promise.resolve(false);
      return run(() => api.put(`/reservations/${r._id}/reject`), 'Reserva rechazada');
    },
    propose: (r, payload) => run(() => api.put(`/reservations/${r._id}/propose-alternative`, payload), 'Propuesta enviada al cliente'),
    noShow: (r) => run(() => api.put(`/reservations/${r._id}/no-show`), 'Marcada como no vino'),
    cancel: async (r) => {
      if (!await confirmDialog(`¿Cancelar la reserva de ${r.guestName}?`)) return Promise.resolve(false);
      return run(() => api.put(`/reservations/${r._id}`, { status: 'cancelled' }), 'Reserva cancelada');
    },
    remove: async (r) => {
      if (!await confirmDialog(`¿Eliminar la reserva de ${r.guestName}? No se puede deshacer.`)) return Promise.resolve(false);
      return run(() => api.delete(`/reservations/${r._id}`), 'Reserva eliminada');
    },
    assign: (r, tableIds) => run(() => api.put(`/reservations/${r._id}`, { tableIds: tableIds || [] }), 'Mesa asignada'),
    refund: async (r) => {
      if (!await confirmDialog('¿Devolver la señal al cliente?')) return Promise.resolve(false);
      return run(() => api.post(`/reservations/${r._id}/refund`), 'Señal devuelta');
    },
  }), [run, reload]);

  return { reservations, slots, shifts, shiftOf, tables, seats, pending, loading, reload, actions, isManager };
}

/** Tables of a reservation (several when joined), with their room. */
export function tablesOf(r) {
  const list = Array.isArray(r.tableIds) && r.tableIds.length ? r.tableIds : r.tableId ? [r.tableId] : [];
  return list.filter((t) => t && typeof t === 'object');
}

/** «Mesa 4 · Terraza», «Mesas 2 y 3 · Sala», «Sin mesa». */
export function placeText(r) {
  const ts = tablesOf(r);
  const room = r.roomId?.name || ts[0]?.roomId?.name || '';
  if (!ts.length) return room ? `${room} · sin mesa` : 'Sin mesa';
  const names = ts.map((t) => t.name);
  const tables = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return room ? `${tables} · ${room}` : tables;
}
