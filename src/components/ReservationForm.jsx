import { useEffect, useMemo, useRef, useState } from 'react';
import DayChips from '../ui/DayChips';
import api from '../services/api';
import { useData } from '../lib/query';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TZ, addDays, todayIn } from '../pages/agenda/utils';
import { dayLabel, shortDay } from '../lib/dates';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';
const chip = (on) => `shrink-0 rounded-xl border transition-colors ${on ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'}`;

function normalizePhone(raw) {
  return raw ? String(raw).replace(/\D/g, '') : '';
}

function Step({ n, title, aside, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{n && <span className="text-gray-400 tabular-nums mr-1.5">{n}</span>}{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * New or edited reservation, the same sheet as a new appointment: who, how
 * many, which day and time, and the optional rest (room, notes).
 */
export default function ReservationForm({ reservation, onSave, onCancel, initialContext = null }) {
  const { business, isModuleEnabled } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const todayStr = todayIn(tz);
  const isEdit = Boolean(reservation?._id);
  const theForkModuleEnabled = isModuleEnabled('thefork');
  const initialDate = reservation?.date || initialContext?.date || todayStr;
  const roomsQ = useData(['rooms'], () => api.get('/rooms').then((r) => r.data || []), { enabled: !initialContext?.rooms?.length, staleTime: 5 * 60000 });
  const rooms = initialContext?.rooms?.length ? initialContext.rooms : (roomsQ.data || []);
  const [form, setForm] = useState({
    guestName: reservation?.guestName || '',
    guestPhone: reservation?.guestPhone || '',
    guestEmail: reservation?.guestEmail || '',
    roomId: reservation?.roomId?._id || reservation?.roomId || '',
    date: initialDate,
    time: reservation?.time || initialContext?.slots?.[0]?.time || '',
    people: reservation?.people || 2,
    status: reservation?.status || 'pending',
    thefork: Boolean(reservation?.thefork),
    notes: reservation?.notes || '',
  });
  const [error, setError] = useState('');
  const [slots, setSlots] = useState(initialContext?.slots ?? null);
  const [vacation, setVacation] = useState(initialContext?.vacation ?? null);
  const skipInitialFetchRef = useRef(Boolean(initialContext && !isEdit && initialContext?.date === initialDate));
  const [showNotes, setShowNotes] = useState(Boolean(reservation?.notes));


  useEffect(() => {
    if (!form.date) return;
    if (skipInitialFetchRef.current && form.date === initialDate) {
      skipInitialFetchRef.current = false;
      return;
    }
    setSlots(null);
    setVacation(null);
    Promise.all([
      api.get(`/shifts/slots?date=${form.date}`),
      api.get(`/vacations/check?date=${form.date}`),
    ])
      .then(([slotsRes, vacRes]) => {
        setVacation(vacRes.data.closed ? vacRes.data : false);
        if (vacRes.data.closed) { setSlots([]); return; }
        setSlots(slotsRes.data);
        // Keep the chosen time if the new day has it; otherwise choose again.
        setForm((f) => (slotsRes.data.find((s) => s.time === f.time) || isEdit ? f : { ...f, time: '' }));
      })
      .catch(() => { setSlots([]); setVacation(false); });
  }, [form.date, initialDate, isEdit]);

  const slotsByShift = useMemo(() => (slots || []).reduce((acc, s) => {
    (acc[s.shiftName] = acc[s.shiftName] || []).push(s);
    return acc;
  }, {}), [slots]);
  const quickPeopleMax = Math.min(10, Math.max(1, Number(business?.maxReservationPeople) || 10));
  const peopleOptions = Array.from({ length: quickPeopleMax }, (_, i) => i + 1);
  const [customPeopleOpen, setCustomPeopleOpen] = useState(form.people > quickPeopleMax);
  const [customerQuery, setCustomerQuery] = useState(reservation?.guestName || '');
  const [selectedCustomer, setSelectedCustomer] = useState(() => (!isEdit && reservation?.guestName
    ? { name: reservation.guestName, phone: reservation.guestPhone, email: reservation.guestEmail } : null));
  const [saving, setSaving] = useState(false);

  // Same cache as Clientes.
  const customers = useData(['customers', 'list'], () => api.get('/customers').then((r) => r.data), { enabled: !isEdit, retry: false }).data || [];

  const customerMatches = useMemo(() => {
    if (isEdit || selectedCustomer) return [];
    const query = customerQuery.trim().toLowerCase();
    const queryPhone = normalizePhone(customerQuery);
    if (query.length < 2 && queryPhone.length < 3) return [];
    return customers.filter((c) => {
      const name = String(c?.name || '').toLowerCase();
      const normalized = normalizePhone(c?.normalizedPhone || c?.phone || '');
      return (query && name.includes(query)) || (queryPhone.length >= 3 && normalized.includes(queryPhone));
    }).slice(0, 6);
  }, [customers, customerQuery, isEdit, selectedCustomer]);

  const handleCustomerQueryChange = (value) => {
    setCustomerQuery(value);
    setForm((f) => ({ ...f, guestName: value }));
  };
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer?.name || '');
    setForm((f) => ({ ...f, guestName: customer?.name || '', guestPhone: customer?.phone || '', guestEmail: customer?.email || '' }));
  };
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery('');
    setForm((f) => ({ ...f, guestName: '', guestPhone: '', guestEmail: '' }));
  };


  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setError('');
    const guestName = (isEdit ? form.guestName : (selectedCustomer?.name || customerQuery)).trim();
    const guestPhone = String(form.guestPhone || '').trim();
    const guestEmail = String(form.guestEmail || '').trim();
    if (!guestName) return setError('Escribe el nombre del cliente');
    if (!isEdit && !guestPhone) return setError('El teléfono es obligatorio');
    if (!form.time) return setError('Elige una hora');
    setSaving(true);
    try {
      const payload = { ...form, guestName, guestPhone, guestEmail, roomId: form.roomId || null };
      if (isEdit) await api.put(`/reservations/${reservation._id}`, payload);
      else await api.post('/reservations', payload);
      onSave({ mode: isEdit ? 'edit' : 'create' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Step n="1" title="Cliente" aside={selectedCustomer && !isEdit && (
        <button type="button" onClick={clearCustomer} className="text-xs font-semibold text-gray-500 hover:text-gray-900">Cambiar</button>
      )}>
        {selectedCustomer && !isEdit ? (
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-[15px] font-medium text-gray-900">{form.guestName}</p>
            <p className="text-[13px] text-gray-500">{[form.guestPhone, form.guestEmail].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
            {!form.guestPhone && (
              <input className={`${inputCls} mt-2`} type="tel" placeholder="Teléfono *" value={form.guestPhone}
                onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input
                value={isEdit ? form.guestName : customerQuery}
                onChange={(e) => (isEdit ? setForm((f) => ({ ...f, guestName: e.target.value })) : handleCustomerQueryChange(e.target.value))}
                placeholder={isEdit ? 'Nombre' : 'Nombre o teléfono'}
                autoComplete="off"
                className={inputCls}
              />
              {customerMatches.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-100">
                  {customerMatches.map((c) => (
                    <li key={c._id}>
                      <button type="button" onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50">
                        <span className="block text-sm font-medium text-gray-900">{c.name}</span>
                        <span className="block text-xs text-gray-500">{c.phone || c.email || 'Sin contacto'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {(isEdit || customerQuery.trim().length >= 2) && (
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} type="tel" placeholder={isEdit ? 'Teléfono' : 'Teléfono *'} value={form.guestPhone}
                  onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} />
                <input className={inputCls} type="email" placeholder="Email (opcional)" value={form.guestEmail}
                  onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} />
              </div>
            )}
          </div>
        )}
      </Step>

      <Step n="2" title="Personas">
        <div className="flex flex-wrap gap-1.5">
          {peopleOptions.map((n) => (
            <button key={n} type="button" onClick={() => { setCustomPeopleOpen(false); setForm((f) => ({ ...f, people: n })); }}
              className={`${chip(!customPeopleOpen && form.people === n)} w-11 h-11 text-[15px] font-semibold tabular-nums`}>{n}</button>
          ))}
          <button type="button" onClick={() => setCustomPeopleOpen(true)} className={`${chip(customPeopleOpen)} px-3.5 h-11 text-sm font-semibold`}>Más</button>
        </div>
        {customPeopleOpen && (
          <input type="number" min={1} inputMode="numeric" value={form.people} autoFocus
            onChange={(e) => setForm((f) => ({ ...f, people: Math.max(1, Number(e.target.value) || 1) }))}
            className={`${inputCls} mt-2 w-32`} />
        )}
      </Step>

      <Step n="3" title="Día y hora" aside={(
        <label className="relative text-xs font-semibold text-violet-700 cursor-pointer">
          Otro día
          <input type="date" value={form.date} onChange={(e) => e.target.value && setForm((f) => ({ ...f, date: e.target.value }))}
            onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* ignore */ } }}
            className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      )}>
        <DayChips date={form.date} today={todayStr} onChange={(d) => setForm((f) => ({ ...f, date: d }))} />
        <div className="mt-3">
          {slots === null ? <p className="text-xs text-gray-400">Buscando horas…</p>
            : vacation?.closed ? <p className="text-sm text-rose-700">El restaurante está cerrado este día.</p>
              : slots.length === 0 ? <p className="text-sm text-gray-500">No hay turnos este día.</p>
                : Object.entries(slotsByShift).map(([shiftName, list]) => (
                  <div key={shiftName} className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{shiftName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((s) => (
                        <button key={s.time} type="button" onClick={() => setForm((f) => ({ ...f, time: s.time }))}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border tabular-nums transition-colors ${form.time === s.time ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                          {s.label || s.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
          {isEdit && form.time && slots && !slots.some((s) => s.time === form.time) && (
            <p className="text-xs text-gray-500 mt-1">Hora actual: {form.time}</p>
          )}
        </div>
      </Step>

      {rooms.length > 0 && (
        <Step title="Sala (opcional)">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setForm((f) => ({ ...f, roomId: '' }))} className={`${chip(form.roomId === '')} px-3.5 py-2 text-sm font-semibold`}>Sin preferencia</button>
            {rooms.map((r) => (
              <button key={r._id} type="button" onClick={() => setForm((f) => ({ ...f, roomId: r._id }))} className={`${chip(form.roomId === r._id)} px-3.5 py-2 text-sm font-semibold`}>{r.name}</button>
            ))}
          </div>
        </Step>
      )}

      {isEdit && (
        <div>
          <label className={labelCls}>Estado</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
            <option value="pending">Por confirmar</option>
            <option value="confirmed">Confirmada</option>
            <option value="seated">Sentada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      )}

      {showNotes ? (
        <div>
          <label className={labelCls}>Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`}
            placeholder="Alergias, trona, celebración…" />
        </div>
      ) : (
        <button type="button" onClick={() => setShowNotes(true)} className="text-sm font-medium text-violet-700">+ Añadir una nota</button>
      )}

      {theForkModuleEnabled && (
        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={Boolean(form.thefork)} onChange={(e) => setForm((f) => ({ ...f, thefork: e.target.checked }))} className="w-4 h-4 rounded accent-violet-600" />
          Viene de TheFork
        </label>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 space-y-2">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 truncate">{dayLabel(form.date, todayStr)}{form.time ? `, ${form.time}` : ''}</p>
            <p className="text-base font-semibold text-gray-900">{form.people} {form.people === 1 ? 'persona' : 'personas'}</p>
          </div>
          {onCancel && <button type="button" onClick={onCancel} className="hidden sm:inline-flex items-center h-12 px-4 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100">Cancelar</button>}
          <button type="submit" disabled={saving} className="h-12 px-6 rounded-xl bg-violet-600 text-white text-[15px] font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear reserva'}
          </button>
        </div>
      </div>
    </form>
  );
}
