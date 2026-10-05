import { useEffect, useMemo, useState } from 'react';
import DayChips from '../../ui/DayChips';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { dayLabel } from '../../lib/dates';
import StaffAvatar from './StaffAvatar';
import { DEFAULT_TZ, euros, initials, staffColors, todayIn, toMinutes } from './utils';

const NONE = [];
const NO_SUMMARIES = {};
const fieldCls = 'w-full h-12 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

// Professionals allowed to do a service ('staff' requirement; empty list = all).
export function staffForService(service, staff) {
  const requirement = (service?.requirements || []).find((item) => item.kind === 'staff');
  if (!requirement) return [];
  const allowed = (requirement.resourceIds || []).map(String);
  return allowed.length ? staff.filter((person) => allowed.includes(person._id)) : staff;
}

export function staffForServices(services, staff) {
  const requiringStaff = services.filter((service) => (service.requirements || []).some((item) => item.kind === 'staff'));
  if (!requiringStaff.length) return [];
  return staff.filter((person) => requiringStaff.every((service) => staffForService(service, staff).some((candidate) => candidate._id === person._id)));
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" strokeLinecap="round" /></svg>;
}

function CustomerAvatar({ name }) {
  return <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-bold shrink-0">{initials(name)}</span>;
}

function SectionLabel({ children, action }) {
  return <div className="flex items-center justify-between gap-3 mb-2"><h4 className="text-sm font-semibold text-gray-900">{children}</h4>{action}</div>;
}

function customerRepeat(history, services, staff, tz) {
  const now = Date.now();
  const booking = history?.bookings?.find((item) => !['cancelled', 'no_show'].includes(item.status) && new Date(item.start).getTime() <= now);
  if (!booking) return null;
  const selected = (booking.segments || []).map((segment) => services.find((service) => service._id === String(segment.serviceId)));
  if (!selected.length || selected.some((service) => !service)) return null;
  const eligible = staffForServices(selected, staff);
  const person = eligible.find((candidate) => booking.segments.every((segment) => (segment.resourceIds || []).map(String).includes(candidate._id))) || null;
  const when = new Date(booking.start).toLocaleDateString('es-ES', { timeZone: tz, day: 'numeric', month: 'short' });
  return {
    items: selected.map((service) => ({ serviceId: service._id })),
    resourceId: person?._id || '',
    title: selected.map((service) => service.name).join(' + '),
    meta: `${selected.reduce((sum, service) => sum + service.durationMin, 0)} min · ${when}${person ? ` · ${person.name}` : ''}`,
  };
}

/** One-screen quick capture: context from the agenda stays selected and only exceptions expand. */
export default function NewBookingModal({ date: initialDate, time: initialTime, resourceId: initialResource, guest: initialGuest, services, staff, onClose, onCreated }) {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const manager = hasRole('manager');
  const bookable = useMemo(() => services.filter((service) => service.bookingMode !== 'quote'), [services]);
  const colors = useMemo(() => staffColors(staff), [staff]);
  const initialService = (initialResource && bookable.find((service) => staffForService(service, staff).some((person) => person._id === initialResource))) || bookable[0];

  const [date, setDate] = useState(initialDate || today);
  const [time, setTime] = useState(initialTime || '');
  const [items, setItems] = useState(() => initialService ? [{ serviceId: initialService._id }] : []);
  const [resourceId, setResourceId] = useState(initialResource || '');
  const [partySize, setPartySize] = useState(1);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', guestEmail: '', notes: '', internalNotes: '', marketingConsent: false, ...(initialGuest || {}) });
  const [picked, setPicked] = useState(() => (initialGuest?.guestName ? { name: initialGuest.guestName } : null));
  const [customerOpen, setCustomerOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showServices, setShowServices] = useState(!initialService);
  const [serviceMode, setServiceMode] = useState('replace');
  const [serviceSearch, setServiceSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showSchedule, setShowSchedule] = useState(!initialTime);
  const [showNotes, setShowNotes] = useState(false);
  const [slots, setSlots] = useState(null);
  const [slotsKey, setSlotsKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customersQ = useData(['customers', 'list'], () => api.get('/customers').then((response) => response.data || []), { retry: false });
  const summariesQ = useData(['bookings', 'customersSummary'], () => bookingsApi.customersSummary(), { enabled: manager, retry: false });
  const historyQ = useData(['bookings', 'customerHistory', picked?._id], () => bookingsApi.customerHistory(picked._id), { enabled: manager && !!picked?._id, retry: false });
  const customers = customersQ.data || NONE;
  const summaries = summariesQ.data || NO_SUMMARIES;

  const selectedServices = useMemo(() => items.map((item) => bookable.find((service) => service._id === item.serviceId)).filter(Boolean), [items, bookable]);
  const eligible = useMemo(() => staffForServices(selectedServices, staff), [selectedServices, staff]);
  const duration = selectedServices.reduce((sum, service) => sum + service.durationMin, 0);
  const minParty = selectedServices[0]?.partySize?.min || 1;
  const maxParty = selectedServices[0]?.partySize?.max || 1;
  const total = selectedServices.reduce((sum, service) => sum + (service.price?.amount || 0) * (service.price?.perPerson ? partySize : 1), 0);
  const categories = useMemo(() => ['Todos', ...new Set(bookable.map((service) => (service.category || '').trim()).filter(Boolean))], [bookable]);
  const visibleServices = useMemo(() => {
    const needle = serviceSearch.trim().toLocaleLowerCase('es');
    return bookable.filter((service) => (category === 'Todos' || (service.category || '').trim() === category)
      && (!needle || service.name.toLocaleLowerCase('es').includes(needle)));
  }, [bookable, category, serviceSearch]);

  const query = guest.guestName.trim().toLocaleLowerCase('es');
  const digits = query.replace(/\D/g, '');
  const matches = query.length >= 2 ? customers.filter((customer) => customer.name?.toLocaleLowerCase('es').includes(query)
    || (digits.length >= 3 && (customer.phone || '').replace(/\D/g, '').includes(digits))).slice(0, 6) : NONE;
  const recent = useMemo(() => [...customers].sort((a, b) => String(summaries[b._id]?.lastVisit || b.createdAt || '').localeCompare(String(summaries[a._id]?.lastVisit || a.createdAt || ''))).slice(0, 5), [customers, summaries]);
  const suggestions = query ? matches : recent;
  const repeat = useMemo(() => customerRepeat(historyQ.data, bookable, staff, tz), [historyQ.data, bookable, staff, tz]);
  const availabilityKey = `${selectedServices.map((service) => service._id).join(',')}|${date}|${resourceId}|${partySize}`;

  useEffect(() => {
    if (resourceId && !eligible.some((person) => person._id === resourceId)) setResourceId('');
  }, [eligible, resourceId]);

  useEffect(() => {
    if (partySize < minParty || partySize > maxParty) setPartySize(Math.min(maxParty, Math.max(minParty, partySize)));
  }, [minParty, maxParty, partySize]);

  useEffect(() => {
    if (!selectedServices.length) { setSlots([]); return undefined; }
    let cancelled = false;
    setSlots(null);
    setSlotsKey('');
    bookingsApi.availability({
      serviceId: selectedServices[0]._id,
      serviceIds: selectedServices.map((service) => service._id).join(','),
      from: date,
      partySize,
      ...(resourceId ? { resourceId } : {}),
    }).then((data) => { if (!cancelled) { setSlots(data); setSlotsKey(availabilityKey); } })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsKey(availabilityKey); } });
    return () => { cancelled = true; };
  }, [selectedServices, date, resourceId, partySize, availabilityKey]);

  useEffect(() => {
    if (time && slots && !slots.some((slot) => slot.time === time)) {
      setTime('');
      setShowSchedule(true);
    }
  }, [slots, time]);

  const pickCustomer = (customer) => {
    setPicked(customer);
    setGuest((current) => ({ ...current, guestName: customer.name, guestPhone: customer.phone || '', guestEmail: customer.email || '' }));
    setCustomerOpen(false);
    setShowContact(false);
  };
  const editCustomerName = (value) => {
    setPicked(null);
    setGuest((current) => ({ ...current, guestName: value, guestPhone: '', guestEmail: '' }));
    setCustomerOpen(true);
  };
  const openServicePicker = (mode) => {
    setServiceMode(mode);
    setServiceSearch('');
    setCategory('Todos');
    setShowServices(true);
  };
  const chooseService = (serviceId) => {
    setItems((current) => serviceMode === 'add'
      ? (current.length < 5 && !current.some((item) => item.serviceId === serviceId) ? [...current, { serviceId }] : current)
      : [{ serviceId }]);
    setShowServices(false);
    setError('');
  };
  const repeatLast = () => {
    if (!repeat) return;
    setItems(repeat.items);
    setResourceId(repeat.resourceId);
    setShowServices(false);
  };
  const selectSlot = (value) => {
    setTime(value);
    setShowSchedule(false);
    setError('');
  };
  const endTime = time ? (() => { const value = toMinutes(time) + duration; return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; })() : '';
  const timeIsValid = !!time && slotsKey === availabilityKey && !!slots?.some((slot) => slot.time === time);

  async function submit() {
    setError('');
    if (!guest.guestName.trim()) return setError('Escribe el nombre del cliente');
    if (!selectedServices.length) return setError('Elige al menos un servicio');
    if (!timeIsValid) { setShowSchedule(true); return setError('Elige una hora libre'); }
    setSaving(true);
    try {
      const booking = await bookingsApi.create({
        date, time, partySize,
        items: selectedServices.map((service) => ({
          serviceId: service._id,
          ...(resourceId && (service.requirements || []).some((requirement) => requirement.kind === 'staff') ? { resourceId } : {}),
        })),
        ...guest,
        source: 'phone',
      });
      onCreated?.(booking);
    } catch (submitError) {
      setError(apiError(submitError));
    } finally {
      setSaving(false);
    }
  }

  if (!bookable.length) return <Modal title="Nueva cita" onClose={onClose}><p className="text-sm text-gray-600">Primero crea al menos un servicio en Configuración.</p></Modal>;

  const morning = (slots || []).filter((slot) => toMinutes(slot.time) < 14 * 60 + 30);
  const afternoon = (slots || []).filter((slot) => toMinutes(slot.time) >= 14 * 60 + 30);
  const selectedNames = selectedServices.map((service) => service.name).join(' + ');
  const footer = (
    <div>
      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{time ? `${dayLabel(date, today)} · ${time}–${endTime}` : 'Falta elegir la hora'}</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{selectedNames || 'Falta el servicio'}{selectedServices.length ? ` · ${euros(total)}` : ''}</p>
        </div>
        <button type="button" onClick={submit} disabled={saving || !guest.guestName.trim() || !selectedServices.length || !timeIsValid}
          className="h-12 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40">
          {saving ? 'Guardando…' : 'Crear cita'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal title="Nueva cita" onClose={onClose} size="lg" footer={footer} bodyClassName="py-4">
      <div className="space-y-5">
        <section>
          <SectionLabel>Cliente</SectionLabel>
          <div className="relative">
            <span className="absolute left-3.5 top-4 text-gray-400"><SearchIcon /></span>
            <input className={`${fieldCls} pl-10`} value={guest.guestName} placeholder="Nombre o teléfono" autoComplete="off" autoFocus
              onFocus={() => setCustomerOpen(true)} onBlur={() => setCustomerOpen(false)} onChange={(event) => editCustomerName(event.target.value)} maxLength={100} />
            {customerOpen && suggestions.length > 0 && !picked && (
              <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100">
                {suggestions.map((customer) => (
                  <button key={customer._id} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => pickCustomer(customer)}
                    className="w-full min-h-14 px-3 py-2 flex items-center gap-2.5 text-left hover:bg-gray-50">
                    <CustomerAvatar name={customer.name} />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-900 truncate">{customer.name}</span><span className="block text-xs text-gray-500 truncate">{customer.phone || customer.email || 'Sin contacto'}{(summaries[customer._id]?.visits || 0) >= 3 ? ' · Habitual' : ''}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button type="button" onClick={() => setShowContact((value) => !value)} className="min-h-10 text-xs font-semibold text-violet-700">{showContact ? 'Ocultar contacto' : '+ Teléfono o email'}</button>
            {picked && repeat && <button type="button" onClick={repeatLast} className="min-h-10 min-w-0 text-xs font-semibold text-violet-700 truncate">⚡ Repetir: {repeat.title}</button>}
          </div>
          {showContact && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <input className={fieldCls} type="tel" placeholder="Teléfono" value={guest.guestPhone} onChange={(event) => setGuest((current) => ({ ...current, guestPhone: event.target.value }))} maxLength={30} />
              <input className={fieldCls} type="email" placeholder="Email (opcional)" value={guest.guestEmail} onChange={(event) => setGuest((current) => ({ ...current, guestEmail: event.target.value }))} maxLength={200} />
              {guest.guestEmail.trim() && (
                <label className="sm:col-span-2 flex items-start gap-2 text-xs text-gray-600">
                  <input type="checkbox" className="mt-0.5" checked={guest.marketingConsent} onChange={(event) => setGuest((current) => ({ ...current, marketingConsent: event.target.checked }))} />
                  <span>El cliente acepta recibir ofertas y novedades por email</span>
                </label>
              )}
            </div>
          )}
        </section>

        <section>
          <SectionLabel action={!showServices && <div className="flex items-center gap-3"><button type="button" onClick={() => openServicePicker('replace')} className="min-h-10 text-xs font-semibold text-violet-700">Cambiar</button>{items.length < 5 && <button type="button" onClick={() => openServicePicker('add')} className="min-h-10 text-xs font-semibold text-violet-700">+ Añadir</button>}</div>}>Servicio</SectionLabel>
          {!showServices ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-900">{selectedNames}</p>
              <p className="text-xs text-gray-500 mt-0.5">{duration} min · {euros(total)}</p>
              {selectedServices.length > 1 && <div className="flex flex-wrap gap-1 mt-2">{selectedServices.map((service, index) => <button key={`${service._id}-${index}`} type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-8 px-2 rounded-lg bg-white border border-gray-200 text-[11px] text-gray-600">{service.name} ×</button>)}</div>}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input className="w-full h-10 rounded-lg bg-gray-50 px-3 text-sm outline-none" value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Buscar servicio…" />
                {categories.length > 1 && <div className="flex gap-1 overflow-x-auto mt-2">{categories.map((name) => <button key={name} type="button" onClick={() => setCategory(name)} className={`shrink-0 h-8 px-2.5 rounded-full text-[11px] font-semibold ${category === name ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{name}</button>)}</div>}
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                {visibleServices.filter((service) => serviceMode === 'replace' || !items.some((item) => item.serviceId === service._id)).map((service) => (
                  <button key={service._id} type="button" onClick={() => chooseService(service._id)} className="w-full min-h-12 px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50">
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-900">{service.name}</span><span className="block text-xs text-gray-500">{service.durationMin} min · {euros(service.price?.amount)}</span></span><span className="text-violet-600 text-lg">{serviceMode === 'add' ? '+' : '›'}</span>
                  </button>
                ))}
              </div>
              {selectedServices.length > 0 && <button type="button" onClick={() => setShowServices(false)} className="w-full h-10 border-t border-gray-100 text-xs font-semibold text-gray-500">Cerrar</button>}
            </div>
          )}
          {maxParty > 1 && <label className="mt-2 flex items-center justify-between text-xs font-medium text-gray-600">Personas<input type="number" min={minParty} max={maxParty} value={partySize} onChange={(event) => setPartySize(Number(event.target.value) || minParty)} className="w-20 h-10 rounded-xl border border-gray-200 px-2 text-right" /></label>}
        </section>

        {eligible.length > 0 && (
          <section>
            <SectionLabel>Profesional</SectionLabel>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              <button type="button" onClick={() => setResourceId('')} className={`shrink-0 h-11 px-3 rounded-xl border text-sm font-semibold ${!resourceId ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-700'}`}>Cualquiera</button>
              {eligible.map((person) => <button key={person._id} type="button" onClick={() => setResourceId(person._id)} className={`shrink-0 h-11 pl-1.5 pr-3 rounded-xl border inline-flex items-center gap-2 text-sm font-semibold ${resourceId === person._id ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-700'}`}><StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={28} />{person.name}</button>)}
            </div>
          </section>
        )}

        <section>
          <SectionLabel action={time && !showSchedule && <button type="button" onClick={() => setShowSchedule(true)} className="min-h-10 text-xs font-semibold text-violet-700">Cambiar</button>}>Día y hora</SectionLabel>
          {time && !showSchedule ? (
            <button type="button" onClick={() => setShowSchedule(true)} className="w-full rounded-xl bg-gray-900 px-3 py-3 flex items-center justify-between gap-3 text-left text-white">
              <span><span className="block text-sm font-semibold">{dayLabel(date, today)} · {time}–{endTime}</span><span className="block text-xs text-gray-300 mt-0.5">{resourceId ? eligible.find((person) => person._id === resourceId)?.name : 'Cualquier profesional disponible'}</span></span><span aria-hidden="true">›</span>
            </button>
          ) : (
            <>
              <DayChips date={date} today={today} onChange={(next) => { setDate(next); setTime(''); }} />
              <div className="mt-3" aria-live="polite">
                {slots === null ? <p className="py-2 text-sm text-gray-400">Buscando huecos…</p>
                  : slots.length === 0 ? <p className="py-2 text-sm text-gray-500">No hay huecos libres. Prueba otro día o profesional.</p>
                    : [['Mañana', morning], ['Tarde', afternoon]].filter(([, list]) => list.length).map(([label, list]) => <div key={label} className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p><div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">{list.map((slot) => <button key={slot.time} type="button" onClick={() => selectSlot(slot.time)} className={`h-10 rounded-xl border text-sm font-semibold tabular-nums ${time === slot.time ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-gray-700'}`}>{slot.time}</button>)}</div></div>)}
              </div>
            </>
          )}
        </section>

        {showNotes ? <div className="space-y-2"><textarea className={`${fieldCls} h-20 py-2`} placeholder="Nota del cliente" value={guest.notes} onChange={(event) => setGuest((current) => ({ ...current, notes: event.target.value }))} maxLength={1000} /><textarea className={`${fieldCls} h-20 py-2`} placeholder="Nota interna" value={guest.internalNotes} onChange={(event) => setGuest((current) => ({ ...current, internalNotes: event.target.value }))} maxLength={2000} /></div>
          : <button type="button" onClick={() => setShowNotes(true)} className="min-h-10 text-sm font-semibold text-violet-700">+ Añadir una nota</button>}
      </div>
    </Modal>
  );
}
