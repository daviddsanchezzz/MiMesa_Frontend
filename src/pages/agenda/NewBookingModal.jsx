import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_TZ, staffColors, todayIn } from './utils';
import {
  AppointmentFooter, ClientStep, ScheduleStep, ServiceStep, WizardHeader,
} from './AppointmentWizardParts';

const NONE = [];
const NO_SUMMARIES = {};

// Professionals allowed to do a service ('staff' requirement; empty list = all).
export function staffForService(service, staff) {
  const req = (service?.requirements || []).find((requirement) => requirement.kind === 'staff');
  if (!req) return [];
  const allowed = (req.resourceIds || []).map(String);
  return allowed.length ? staff.filter((person) => allowed.includes(person._id)) : staff;
}

// A chosen professional has to be valid for every selected service that needs staff.
export function staffForServices(services, staff) {
  const requiringStaff = services.filter((service) => (service.requirements || []).some((requirement) => requirement.kind === 'staff'));
  if (!requiringStaff.length) return [];
  return staff.filter((person) => requiringStaff.every((service) => staffForService(service, staff).some((candidate) => candidate._id === person._id)));
}

function lastRepeatable(history, services, staff, tz) {
  const now = Date.now();
  const booking = history?.bookings?.find((item) => !['cancelled', 'no_show'].includes(item.status) && new Date(item.start).getTime() <= now);
  if (!booking) return null;
  const serviceIds = (booking.segments || []).map((segment) => String(segment.serviceId));
  const selected = serviceIds.map((id) => services.find((service) => service._id === id));
  if (!selected.length || selected.some((service) => !service)) return null;
  const eligible = staffForServices(selected, staff);
  const person = eligible.find((candidate) => booking.segments.every((segment) => (segment.resourceIds || []).map(String).includes(candidate._id))) || null;
  const when = new Date(booking.start).toLocaleDateString('es-ES', { timeZone: tz, day: 'numeric', month: 'short' });
  return {
    items: serviceIds.map((serviceId) => ({ serviceId })),
    resourceId: person?._id || '',
    services: selected.map((service) => service.name).join(' + '),
    meta: `${selected.reduce((sum, service) => sum + service.durationMin, 0)} min · ${when}${person ? ` · con ${person.name}` : ''}`,
  };
}

/** A fast, state-preserving wizard for creating one or more consecutive appointments. */
export default function NewBookingModal({ date: initialDate, time: initialTime, resourceId: initialResource, guest: initialGuest, services, staff, onClose, onCreated }) {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const manager = hasRole('manager');
  const bookable = useMemo(() => services.filter((service) => service.bookingMode !== 'quote'), [services]);
  const colors = useMemo(() => staffColors(staff), [staff]);
  const initialService = (initialResource && bookable.find((service) => staffForService(service, staff).some((person) => person._id === initialResource))) || bookable[0];

  const [page, setPage] = useState(0);
  const [date, setDate] = useState(initialDate || today);
  const [items, setItems] = useState(() => initialService ? [{ serviceId: initialService._id }] : []);
  const [resourceId, setResourceId] = useState(initialResource || '');
  const [time, setTime] = useState(initialTime || '');
  const [slots, setSlots] = useState(null);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', guestEmail: '', ...(initialGuest || {}), notes: '', internalNotes: '' });
  const [picked, setPicked] = useState(() => (initialGuest?.guestName ? { name: initialGuest.guestName } : null));
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [category, setCategory] = useState('Todos');
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
  const matches = !picked && query.length >= 2
    ? customers.filter((customer) => customer.name?.toLocaleLowerCase('es').includes(query)
      || (digits.length >= 3 && (customer.phone || '').replace(/\D/g, '').includes(digits))).slice(0, 8)
    : NONE;
  const recent = useMemo(() => [...customers].sort((a, b) => {
    const aDate = summaries[a._id]?.lastVisit || a.createdAt || '';
    const bDate = summaries[b._id]?.lastVisit || b.createdAt || '';
    return String(bDate).localeCompare(String(aDate));
  }).slice(0, 6), [customers, summaries]);
  const repeat = useMemo(() => lastRepeatable(historyQ.data, bookable, staff, tz), [historyQ.data, bookable, staff, tz]);

  useEffect(() => {
    if (resourceId && !eligible.some((person) => person._id === resourceId)) {
      setResourceId('');
      setTime('');
    }
  }, [eligible, resourceId]);

  useEffect(() => {
    if (partySize < minParty || partySize > maxParty) {
      setPartySize(Math.min(maxParty, Math.max(minParty, partySize)));
      setTime('');
    }
  }, [minParty, maxParty, partySize]);

  useEffect(() => {
    if (!selectedServices.length) { setSlots([]); return undefined; }
    let cancelled = false;
    setSlots(null);
    bookingsApi.availability({
      serviceId: selectedServices[0]._id,
      serviceIds: selectedServices.map((service) => service._id).join(','),
      from: date,
      partySize,
      ...(resourceId ? { resourceId } : {}),
    }).then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [selectedServices, date, resourceId, partySize]);

  useEffect(() => {
    if (time && slots && !slots.some((slot) => slot.time === time)) setTime('');
  }, [slots, time]);

  const pickCustomer = (customer) => {
    setPicked(customer);
    setCreatingCustomer(false);
    setGuest((current) => ({ ...current, guestName: customer.name, guestPhone: customer.phone || '', guestEmail: customer.email || '' }));
    setError('');
  };
  const changeCustomer = () => {
    setPage(0);
    setPicked(null);
    setCreatingCustomer(false);
    setGuest((current) => ({ ...current, guestName: '', guestPhone: '', guestEmail: '' }));
    setError('');
  };
  const toggleService = (serviceId) => {
    setItems((current) => current.some((item) => item.serviceId === serviceId)
      ? current.filter((item) => item.serviceId !== serviceId)
      : current.length < 5 ? [...current, { serviceId }] : current);
    setTime('');
    setError('');
  };
  const setNote = (key, value) => setGuest((current) => ({ ...current, [key]: value }));
  const repeatLast = () => {
    if (!repeat) return;
    setItems(repeat.items);
    setResourceId(repeat.resourceId);
    setTime('');
    setPage(2);
  };

  const continueFlow = () => {
    setError('');
    if (page === 0) {
      if (!guest.guestName.trim()) { setError('Elige un cliente o escribe su nombre'); return; }
      setPage(1);
    } else if (page === 1) {
      if (!selectedServices.length) { setError('Elige al menos un servicio'); return; }
      setPage(2);
    }
  };

  async function submit() {
    setError('');
    if (!guest.guestName.trim()) { setPage(0); setError('Escribe el nombre del cliente'); return; }
    if (!selectedServices.length) { setPage(1); setError('Elige al menos un servicio'); return; }
    if (!time) { setError('Elige una hora'); return; }
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

  if (!bookable.length) {
    return <Modal title="Nueva cita" onClose={onClose}><p className="text-sm text-gray-600">Primero crea al menos un servicio en Configuración.</p></Modal>;
  }

  const canContinue = page === 0 ? !!guest.guestName.trim() : page === 1 ? selectedServices.length > 0 : !!time;
  return (
    <Modal title="Nueva cita" onClose={onClose} size="lg" fullHeight
      header={<WizardHeader page={page} onStep={(next) => { setPage(next); setError(''); }} />}
      bodyClassName="py-4 sm:py-5"
      footer={<AppointmentFooter page={page} date={date} today={today} time={time} duration={duration} services={selectedServices}
        total={total} canContinue={canContinue} saving={saving} error={error} onContinue={continueFlow} onSubmit={submit} />}>
      <div key={page} className="motion-safe:animate-[wizard-in_.18s_ease-out]">
        {page === 0 && <ClientStep guest={guest} setGuest={setGuest} picked={picked} onPick={pickCustomer} onChange={changeCustomer}
          matches={matches} recent={recent} summaries={summaries} creating={creatingCustomer} setCreating={setCreatingCustomer}
          repeat={repeat} onRepeat={repeatLast} />}
        {page === 1 && <ServiceStep guest={guest} onChangeClient={changeCustomer} services={bookable} visibleServices={visibleServices} items={items}
          onToggle={toggleService} onRemove={(index) => { setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); setTime(''); }}
          onClear={() => { setItems([]); setTime(''); }} search={serviceSearch} setSearch={setServiceSearch}
          category={category} setCategory={setCategory} categories={categories} partySize={partySize} setPartySize={(value) => { setPartySize(value); setTime(''); }} minParty={minParty} maxParty={maxParty} />}
        {page === 2 && <ScheduleStep guest={guest} selectedServices={selectedServices} onChangeClient={changeCustomer} onChangeServices={() => { setPage(1); setError(''); }}
          eligible={eligible} resourceId={resourceId} setResourceId={setResourceId} colors={colors} date={date} today={today} setDate={setDate}
          slots={slots} time={time} setTime={setTime} showNotes={showNotes} setShowNotes={setShowNotes}
          notes={{ notes: guest.notes, internalNotes: guest.internalNotes }} setNotes={setNote} />}
      </div>
    </Modal>
  );
}
