import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { staffForService } from './NewBookingModal';
import { btnPrimary, btnSecondary, dateInTz, euros, inputCls, labelCls, longDate, timeInTz, DEFAULT_TZ } from './utils';

/**
 * Move an appointment: another day or time and, if needed, other services or
 * another professional. The free times already take the whole appointment
 * into account (every service in a row) and ignore the appointment itself.
 */
export default function RescheduleModal({ booking, services, staff, tz = DEFAULT_TZ, onClose, onMoved }) {
  const bookable = services.filter((s) => s.bookingMode !== 'quote');
  const staffIds = new Set(staff.map((s) => s._id));
  const originalDate = dateInTz(booking.start, tz);
  const originalTime = timeInTz(booking.start, tz);

  const [date, setDate] = useState(originalDate);
  const [items, setItems] = useState(() => booking.segments.map((seg) => ({ serviceId: String(seg.serviceId) })));
  const [resourceId, setResourceId] = useState(() => {
    const seg = booking.segments[0];
    if (seg.anyStaff) return '';
    return (seg.resourceIds || []).map(String).find((id) => staffIds.has(id)) || '';
  });
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState(null);
  const [notify, setNotify] = useState(Boolean(booking.guestEmail));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const first = bookable.find((s) => s._id === items[0]?.serviceId);
  const eligible = useMemo(() => staffForService(first, staff), [first, staff]);
  const payload = useMemo(() => items.filter((it) => it.serviceId).map((it, i) => ({
    serviceId: it.serviceId, ...(i === 0 && resourceId ? { resourceId } : {}),
  })), [items, resourceId]);
  const payloadKey = JSON.stringify(payload);
  const total = items.reduce((sum, it) => sum + (bookable.find((x) => x._id === it.serviceId)?.price?.amount || 0), 0);
  const servicesChanged = items.map((i) => i.serviceId).join() !== booking.segments.map((s) => String(s.serviceId)).join();

  useEffect(() => {
    if (resourceId && eligible.length && !eligible.some((s) => s._id === resourceId)) setResourceId('');
  }, [eligible, resourceId]);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    bookingsApi.rescheduleSlots(booking._id, { from: date, items: JSON.parse(payloadKey) })
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch((err) => { if (!cancelled) { setSlots([]); setError(apiError(err)); } });
    return () => { cancelled = true; };
  }, [booking._id, date, payloadKey]);

  const setItem = (i, serviceId) => setItems((prev) => prev.map((it, idx) => (idx === i ? { serviceId } : it)));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!time) return setError('Elige la nueva hora');
    setSaving(true);
    try {
      const updated = await bookingsApi.reschedule(booking._id, { date, time, items: payload, notify });
      onMoved?.(updated);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Cambiar la cita" subtitle={`Ahora: ${longDate(originalDate)} a las ${originalTime}`} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className={labelCls}>Servicios</label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <select className={inputCls} value={it.serviceId} onChange={(e) => setItem(i, e.target.value)}>
                {!bookable.some((s) => s._id === it.serviceId) && (
                  <option value={it.serviceId}>{booking.segments[i]?.serviceName || 'Servicio'}</option>
                )}
                {bookable.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} · {s.durationMin} min · {euros(s.price?.amount)}</option>
                ))}
              </select>
              {items.length > 1 && (
                <button type="button" className={btnSecondary} onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} aria-label="Quitar servicio">✕</button>
              )}
            </div>
          ))}
          {items.length < 3 && bookable.length > 0 && (
            <button type="button" className="text-xs font-semibold text-violet-600 hover:text-violet-800"
              onClick={() => setItems((p) => [...p, { serviceId: bookable[0]._id }])}>
              + Añadir otro servicio a continuación
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {eligible.length > 0 && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Profesional</label>
              <select className={inputCls} value={resourceId} onChange={(e) => { setResourceId(e.target.value); setTime(''); }}>
                <option value="">Cualquiera disponible</option>
                {eligible.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => { setDate(e.target.value); setTime(''); }} required />
          </div>
        </div>

        <div>
          <label className={labelCls}>Nueva hora</label>
          {slots === null ? (
            <p className="text-xs text-gray-400">Buscando huecos…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-gray-500">No hay huecos libres este día{resourceId ? ' con este profesional' : ''}. Prueba otro día.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {slots.map((s) => {
                const current = date === originalDate && s.time === originalTime;
                return (
                  <button key={s.time} type="button" onClick={() => setTime(s.time)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border tabular-nums transition-colors ${
                      time === s.time ? 'bg-violet-600 border-violet-600 text-white'
                        : current ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-white border-gray-200 text-gray-700 hover:border-violet-400'}`}
                    title={current ? 'Hora actual' : undefined}>
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {servicesChanged && (
          <p className="text-xs text-gray-500">El precio pasará a {euros(total)} (antes {euros(booking.totalPrice)}).</p>
        )}

        {booking.guestEmail && (
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>Avisar al cliente por email del cambio <span className="text-gray-400">({booking.guestEmail})</span></span>
          </label>
        )}

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnSecondary} onClick={onClose}>Volver</button>
          <button type="submit" className={btnPrimary} disabled={saving || !time}>{saving ? 'Guardando…' : 'Guardar cambio'}</button>
        </div>
      </form>
    </Modal>
  );
}
