import { useEffect, useMemo, useState } from 'react';
import DayChips from '../../ui/DayChips';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { DEFAULT_TZ, addDays, euros, inputCls, labelCls, todayIn, toMinutes } from './utils';
import { useAuth } from '../../context/AuthContext';
import { dayLabel, shortDay } from '../../lib/dates';
import StaffAvatar from './StaffAvatar';
import { staffColors } from './utils';

// Professionals allowed to do a service ('staff' requirement; empty list = all).
export function staffForService(service, staff) {
  const req = (service?.requirements || []).find((r) => r.kind === 'staff');
  if (!req) return [];
  const allowed = (req.resourceIds || []).map(String);
  return allowed.length ? staff.filter((s) => allowed.includes(s._id)) : staff;
}

const chip = (on) => `shrink-0 rounded-xl border text-left transition-colors ${on ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'}`;

function Step({ n, title, aside, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-gray-900"><span className="text-gray-400 tabular-nums mr-1.5">{n}</span>{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * New appointment, in the order you ask on the phone: who, what, with whom,
 * which day, what time. Customers already in Vetra fill themselves in.
 */
export default function NewBookingModal({ date: initialDate, time: initialTime, resourceId: initialResource, guest: initialGuest, services, staff, onClose, onCreated }) {
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const bookable = services.filter((s) => s.bookingMode !== 'quote');
  const colors = useMemo(() => staffColors(staff), [staff]);
  const [date, setDate] = useState(initialDate || today);
  const [items, setItems] = useState(() => {
    const first = (initialResource && bookable.find((s) => staffForService(s, staff).some((x) => x._id === initialResource))) || bookable[0];
    return [{ serviceId: first?._id || '' }];
  });
  const [resourceId, setResourceId] = useState(initialResource || '');
  const [time, setTime] = useState(initialTime || '');
  const [slots, setSlots] = useState(null);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', guestEmail: '', ...(initialGuest || {}), notes: '', internalNotes: '' });
  const [partySize, setPartySize] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const [picked, setPicked] = useState(() => (initialGuest?.guestName ? { name: initialGuest.guestName } : null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Same cache as Clientes: the search works from the first letter.
  const customers = useData(['customers', 'list'], () => api.get('/customers').then((r) => r.data || []), { retry: false }).data || [];

  const first = bookable.find((s) => s._id === items[0]?.serviceId);
  const eligible = useMemo(() => staffForService(first, staff), [first, staff]);
  const maxParty = first?.partySize?.max || 1;
  const total = items.reduce((sum, it) => {
    const s = bookable.find((x) => x._id === it.serviceId);
    return sum + (s?.price?.amount || 0) * (s?.price?.perPerson ? partySize : 1);
  }, 0);

  useEffect(() => {
    if (resourceId && !eligible.some((s) => s._id === resourceId)) setResourceId('');
  }, [eligible, resourceId]);

  useEffect(() => {
    if (!first) return undefined;
    let cancelled = false;
    setSlots(null);
    bookingsApi.availability({ serviceId: first._id, from: date, partySize, ...(resourceId ? { resourceId } : {}) })
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [first, date, resourceId, partySize]);

  // Customer search: name or phone, from the customers already in Vetra.
  const query = guest.guestName.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  const matches = !picked && query.length >= 2
    ? customers.filter((c) => c.name?.toLowerCase().includes(query) || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits))).slice(0, 5)
    : [];
  const pick = (c) => {
    setPicked(c);
    setGuest((g) => ({ ...g, guestName: c.name, guestPhone: c.phone || '', guestEmail: c.email || '' }));
  };

  const setItem = (i, serviceId) => setItems((prev) => prev.map((it, idx) => (idx === i ? { serviceId } : it)));
  const morning = (slots || []).filter((s) => toMinutes(s.time) < 14 * 60 + 30);
  const afternoon = (slots || []).filter((s) => toMinutes(s.time) >= 14 * 60 + 30);

  async function submit(e) {
    e?.preventDefault();
    setError('');
    if (!guest.guestName.trim()) return setError('Escribe el nombre del cliente');
    if (!time) return setError('Elige una hora');
    setSaving(true);
    try {
      const booking = await bookingsApi.create({
        date, time, partySize,
        items: items.filter((it) => it.serviceId).map((it, i) => ({ serviceId: it.serviceId, ...(i === 0 && resourceId ? { resourceId } : {}) })),
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
        <p className="text-sm text-gray-600">Primero crea al menos un servicio en Configuración.</p>
      </Modal>
    );
  }

  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{dayLabel(date, today)}{time ? `, ${time}` : ''}{first ? ` · ${first.name}` : ''}</p>
          <p className="text-lg font-semibold tabular-nums text-gray-900 leading-tight">{euros(total)}</p>
        </div>
        <button type="button" onClick={submit} disabled={saving}
          className="h-12 px-6 rounded-xl bg-violet-600 text-white text-[15px] font-semibold hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar cita'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal title="Nueva cita" onClose={onClose} size="lg" footer={footer}>
      <form onSubmit={submit} className="space-y-7">
        <Step n="1" title="Cliente" aside={picked && (
          <button type="button" className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            onClick={() => { setPicked(null); setGuest((g) => ({ ...g, guestName: '', guestPhone: '', guestEmail: '' })); }}>Cambiar</button>
        )}>
          {picked ? (
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[15px] font-medium text-gray-900">{guest.guestName}</p>
              <p className="text-[13px] text-gray-500">{[guest.guestPhone, guest.guestEmail].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input className={inputCls} value={guest.guestName} placeholder="Nombre o teléfono" autoComplete="off"
                  onChange={(e) => setGuest({ ...guest, guestName: e.target.value })} maxLength={100} />
                {matches.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-100">
                    {matches.map((c) => (
                      <li key={c._id}>
                        <button type="button" onClick={() => pick(c)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50">
                          <span className="block text-sm font-medium text-gray-900">{c.name}</span>
                          <span className="block text-xs text-gray-500">{c.phone || c.email || 'Sin contacto'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {guest.guestName.trim().length >= 2 && (
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} type="tel" placeholder="Teléfono" value={guest.guestPhone} onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })} maxLength={30} />
                  <input className={inputCls} type="email" placeholder="Email (opcional)" value={guest.guestEmail} onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })} maxLength={200} />
                </div>
              )}
            </div>
          )}
        </Step>

        <Step n="2" title="Servicio">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bookable.map((s) => {
              const on = items[0]?.serviceId === s._id;
              return (
                <button key={s._id} type="button" onClick={() => { setItem(0, s._id); setTime(''); }} className={`${chip(on)} px-3 py-2.5`}>
                  <span className="block text-sm font-semibold truncate">{s.name}</span>
                  <span className={`block text-xs ${on ? 'text-gray-300' : 'text-gray-500'}`}>{s.durationMin} min · {euros(s.price?.amount)}</span>
                </button>
              );
            })}
          </div>
          {items.slice(1).map((it, idx) => (
            <div key={idx + 1} className="flex gap-2 mt-2">
              <select className={inputCls} value={it.serviceId} onChange={(e) => setItem(idx + 1, e.target.value)}>
                {bookable.map((s) => <option key={s._id} value={s._id}>Después: {s.name} · {s.durationMin} min · {euros(s.price?.amount)}</option>)}
              </select>
              <button type="button" className="px-3 rounded-xl border border-gray-200 text-gray-500" onClick={() => setItems((p) => p.filter((_, i) => i !== idx + 1))} aria-label="Quitar servicio">✕</button>
            </div>
          ))}
          {items.length < 3 && (
            <button type="button" className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-900"
              onClick={() => setItems((p) => [...p, { serviceId: bookable[0]._id }])}>+ Otro servicio a continuación</button>
          )}
          {maxParty > 1 && (
            <div className="mt-3 flex items-center gap-3">
              <label className={`${labelCls} mb-0`}>Personas</label>
              <input type="number" min={first?.partySize?.min || 1} max={maxParty} className={`${inputCls} w-24`}
                value={partySize} onChange={(e) => setPartySize(Number(e.target.value) || 1)} />
            </div>
          )}
        </Step>

        {eligible.length > 0 && (
          <Step n="3" title="Con quién">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button type="button" onClick={() => { setResourceId(''); setTime(''); }} className={`${chip(!resourceId)} px-3.5 py-2 text-sm font-semibold`}>Cualquiera</button>
              {eligible.map((p) => (
                <button key={p._id} type="button" onClick={() => { setResourceId(p._id); setTime(''); }}
                  className={`${chip(resourceId === p._id)} pl-1.5 pr-3.5 py-1.5 text-sm font-semibold inline-flex items-center gap-2`}>
                  <StaffAvatar name={p.name} photo={p.photo} color={colors[p._id]} size={26} />{p.name}
                </button>
              ))}
            </div>
          </Step>
        )}

        <Step n={eligible.length > 0 ? '4' : '3'} title="Día y hora">
          <DayChips date={date} today={today} onChange={(d) => { setDate(d); setTime(''); }} />
          <div className="mt-3">
            {slots === null ? <p className="text-xs text-gray-400">Buscando huecos…</p>
              : slots.length === 0 ? <p className="text-sm text-gray-500">No hay huecos libres este día{resourceId ? ' con esta persona' : ''}. Prueba otro día.</p>
                : [['Mañana', morning], ['Tarde', afternoon]].filter(([, l]) => l.length).map(([label, list]) => (
                  <div key={label} className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {list.map((s) => (
                        <button key={s.time} type="button" onClick={() => setTime(s.time)}
                          className={`py-2 rounded-xl text-sm font-semibold border tabular-nums text-center transition-colors ${time === s.time ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            {time && slots && !slots.some((s) => s.time === time) && (
              <p className="text-xs text-amber-700 mt-1">{time} no aparece como libre; se comprobará al guardar.</p>
            )}
          </div>
        </Step>

        {showNotes ? (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>Nota del cliente</label>
              <textarea className={inputCls} rows={2} value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })} maxLength={1000} />
            </div>
            <div>
              <label className={labelCls}>Nota interna <span className="font-normal text-gray-400">(no la ve el cliente)</span></label>
              <textarea className={inputCls} rows={2} value={guest.internalNotes} onChange={(e) => setGuest({ ...guest, internalNotes: e.target.value })} maxLength={2000} />
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowNotes(true)} className="text-sm font-medium text-violet-700">+ Añadir una nota</button>
        )}
      </form>
    </Modal>
  );
}
