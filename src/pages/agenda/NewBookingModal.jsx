import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, btnSecondary, euros, inputCls, labelCls, longDate } from './utils';

// Professionals allowed to do a service ('staff' requirement; empty list = all).
export function staffForService(service, staff) {
  const req = (service?.requirements || []).find((r) => r.kind === 'staff');
  if (!req) return [];
  const allowed = (req.resourceIds || []).map(String);
  return allowed.length ? staff.filter((s) => allowed.includes(s._id)) : staff;
}

export default function NewBookingModal({ date: initialDate, time: initialTime, resourceId: initialResource, services, staff, onClose, onCreated }) {
  const bookable = services.filter((s) => s.bookingMode !== 'quote');
  const [date, setDate] = useState(initialDate);
  // Opened from a professional's empty slot: start with a service they do.
  const [items, setItems] = useState(() => {
    const first = (initialResource && bookable.find((s) => staffForService(s, staff).some((x) => x._id === initialResource))) || bookable[0];
    return [{ serviceId: first?._id || '' }];
  });
  const [resourceId, setResourceId] = useState(initialResource || '');
  const [time, setTime] = useState(initialTime || '');
  const [slots, setSlots] = useState(null);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', guestEmail: '', notes: '', internalNotes: '' });
  const [partySize, setPartySize] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const first = bookable.find((s) => s._id === items[0]?.serviceId);
  const eligible = useMemo(() => staffForService(first, staff), [first, staff]);
  const maxParty = first?.partySize?.max || 1;
  const total = items.reduce((sum, it) => {
    const s = bookable.find((x) => x._id === it.serviceId);
    return sum + (s?.price?.amount || 0) * (s?.price?.perPerson ? partySize : 1);
  }, 0);

  // Chosen professional no longer does the selected service → back to "any".
  useEffect(() => {
    if (resourceId && !eligible.some((s) => s._id === resourceId)) setResourceId('');
  }, [eligible, resourceId]);

  useEffect(() => {
    if (!first) return;
    let cancelled = false;
    setSlots(null);
    bookingsApi.availability({ serviceId: first._id, from: date, partySize, ...(resourceId ? { resourceId } : {}) })
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [first, date, resourceId, partySize]);

  const setItem = (i, serviceId) => setItems((prev) => prev.map((it, idx) => (idx === i ? { serviceId } : it)));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!time) return setError('Elige una hora');
    setSaving(true);
    try {
      const booking = await bookingsApi.create({
        date, time, partySize,
        items: items.filter((it) => it.serviceId).map((it, i) => ({
          serviceId: it.serviceId,
          ...(i === 0 && resourceId ? { resourceId } : {}),
        })),
        ...guest,
        source: 'phone',
      });
      onCreated?.(booking);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!bookable.length) {
    return (
      <Modal title="Nueva cita" onClose={onClose}>
        <p className="text-sm text-gray-600">Primero crea al menos un servicio en la pestaña Configuración.</p>
      </Modal>
    );
  }

  return (
    <Modal title="Nueva cita" subtitle={longDate(date)} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className={labelCls}>Servicios</label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <select className={inputCls} value={it.serviceId} onChange={(e) => setItem(i, e.target.value)}>
                {bookable.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} · {s.durationMin} min · {euros(s.price?.amount)}</option>
                ))}
              </select>
              {i > 0 && (
                <button type="button" className={btnSecondary} onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} aria-label="Quitar servicio">✕</button>
              )}
            </div>
          ))}
          {items.length < 3 && (
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
              <select className={inputCls} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                <option value="">Cualquiera disponible</option>
                {eligible.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => { setDate(e.target.value); setTime(''); }} required />
          </div>
          {maxParty > 1 && (
            <div>
              <label className={labelCls}>Personas</label>
              <input type="number" min={first?.partySize?.min || 1} max={maxParty} className={inputCls}
                value={partySize} onChange={(e) => setPartySize(Number(e.target.value) || 1)} />
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Hora {items.length > 1 && <span className="font-normal text-gray-400">(huecos del primer servicio)</span>}</label>
          {slots === null ? (
            <p className="text-xs text-gray-400">Buscando huecos…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-gray-500">No hay huecos libres este día{resourceId ? ' con este profesional' : ''}.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {slots.map((s) => (
                <button key={s.time} type="button" onClick={() => setTime(s.time)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border tabular-nums transition-colors ${
                    time === s.time ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-violet-400'}`}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
          {time && slots && !slots.some((s) => s.time === time) && (
            <p className="text-xs text-amber-700 mt-2">{time} no aparece como libre; se comprobará al guardar.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre del cliente</label>
            <input className={inputCls} value={guest.guestName} onChange={(e) => setGuest({ ...guest, guestName: e.target.value })} required maxLength={100} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={inputCls} type="tel" value={guest.guestPhone} onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })} maxLength={30} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={guest.guestEmail} onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notas del cliente</label>
            <textarea className={inputCls} rows={2} value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })} maxLength={1000} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notas internas <span className="font-normal text-gray-400">(no las ve el cliente)</span></label>
            <textarea className={inputCls} rows={2} value={guest.internalNotes} onChange={(e) => setGuest({ ...guest, internalNotes: e.target.value })} maxLength={2000} />
          </div>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-sm text-gray-500">Total: <span className="font-semibold text-gray-900">{euros(total)}</span></span>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cita'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
