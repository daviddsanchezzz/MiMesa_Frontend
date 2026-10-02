import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { queryClient, useData } from '../../lib/query';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import { publicBookingUrl } from '../../lib/publicUrl';
import { bookingTone, reservationTone } from '../../lib/status';
import { dayLabel } from '../../lib/dates';
import CustomerForm from '../../components/CustomerForm';
import ReservationForm from '../../components/ReservationForm';
import Modal from '../../components/Modal';
import { Section, FigureLine, StatusText, TimeRow, Empty } from '../../ui/kit';
import Icon from '../../ui/Icon';
import StaffAvatar from '../agenda/StaffAvatar';
import { DEFAULT_TZ, dateInTz, euros, initials, pluralize, staffColors, timeInTz, todayIn, waLink } from '../agenda/utils';
import { placeText } from '../reservas/useRestaurantDay';
import { avatarColor, everyText, phoneText, relDays, shortDateTime } from './format';

const btn = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold transition-colors';

/** What each sector knows about one customer, in one shape for the file. */
async function loadAppointments(id, tz, today) {
  const [c, h, r] = await Promise.all([api.get(`/customers/${id}`).then((x) => x.data.customer), bookingsApi.customerHistory(id), bookingsApi.resources(true)]);
  const s = h.summary;
  const staffById = Object.fromEntries(r.map((x) => [x._id, x]));
  const colors = staffColors(r.filter((x) => x.active !== false));
  const fav = s.favouriteStaffId && staffById[s.favouriteStaffId];
  return {
    customer: c,
    figures: [
      { label: s.visits === 1 ? 'visita' : 'visitas', value: s.visits },
      { label: 'gastado', value: euros(s.spent) },
      s.avgDays && { label: 'suele venir', value: everyText(s.avgDays) },
      (s.noShows > 0) && { label: 'no vino', value: s.noShows, tone: 'warn' },
    ],
    due: s.dueBack ? `Vino por última vez ${relDays(s.lastVisit)}${s.avgDays ? ` y suele venir ${everyText(s.avgDays)}` : ''}.` : null,
    next: s.nextVisit ? { text: shortDateTime(s.nextVisit, tz), sub: relDays(s.nextVisit), to: `/agenda?date=${dateInTz(s.nextVisit, tz)}` } : null,
    habits: [
      s.favouriteService && <>Servicio habitual: <b className="text-gray-900">{s.favouriteService}</b></>,
      fav && <span className="inline-flex items-center gap-1.5">Suele ir con <StaffAvatar name={fav.name} photo={fav.photo} color={colors[fav._id] || '#9ca3af'} size={20} /><b className="text-gray-900">{fav.name}</b></span>,
    ].filter(Boolean),
    bookLabel: 'Dar cita',
    bookUrl: `/agenda?new=1&name=${encodeURIComponent(c.name)}&phone=${encodeURIComponent(c.phone || '')}&email=${encodeURIComponent(c.email || '')}${s.favouriteStaffId ? `&staff=${s.favouriteStaffId}` : ''}`,
    historyCount: pluralize(h.bookings.length, 'cita', 'citas'),
    history: h.bookings.map((b) => {
      const ids = [...new Set(b.segments.flatMap((seg) => seg.resourceIds || []))].filter((sid) => staffById[sid]?.kind === 'staff');
      const person = staffById[ids[0]];
      return {
        key: b._id,
        when: dayLabel(dateInTz(b.start, tz), today),
        time: timeInTz(b.start, tz),
        tone: bookingTone(b),
        title: b.segments.map((seg) => seg.serviceName).join(' + '),
        sub: [person?.name, b.source === 'online' && 'reservó online', b.internalNotes].filter(Boolean).join(' · '),
        right: <span className="text-sm font-semibold tabular-nums text-gray-900">{euros(b.totalPrice)}</span>,
      };
    }),
    notesPlaceholder: 'Fórmula de color, alergias, cómo le gusta el corte, cumpleaños…',
  };
}

async function loadRestaurant(id, tz, today) {
  const { data } = await api.get(`/customers/${id}`);
  const c = data.customer;
  const list = data.reservations || [];
  const attended = list.filter((r) => (r.status === 'seated' && r.date <= today) || (r.status === 'confirmed' && r.date < today));
  const upcoming = list.filter((r) => ['pending', 'confirmed', 'seated'].includes(r.status) && r.date > today || (['pending', 'confirmed'].includes(r.status) && r.date === today)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const noShows = list.filter((r) => r.status === 'no_show').length;
  const avgPeople = attended.length ? Math.round(attended.reduce((s, r) => s + (r.people || 0), 0) / attended.length) : null;
  const lastVisit = attended.map((r) => r.date).sort().pop();
  const next = upcoming[0];
  return {
    customer: c,
    figures: [
      { label: attended.length === 1 ? 'visita' : 'visitas', value: attended.length },
      avgPeople && { label: 'personas de media', value: avgPeople },
      lastVisit && { label: 'última visita', value: relDays(lastVisit) },
      noShows > 0 && { label: 'no vino', value: noShows, tone: 'warn' },
    ],
    due: null,
    next: next ? { text: `${dayLabel(next.date, today)}, ${next.time}`, sub: `${next.people} personas · ${placeText(next)}`, to: `/reservations?date=${next.date}` } : null,
    habits: [],
    bookLabel: 'Reservar',
    historyCount: pluralize(list.length, 'reserva', 'reservas'),
    history: list.map((r) => ({
      key: r._id,
      when: dayLabel(r.date, today),
      time: r.time,
      tone: reservationTone(r),
      title: `${r.people} ${r.people === 1 ? 'persona' : 'personas'}`,
      sub: [placeText(r), r.notes].filter(Boolean).join(' · '),
      right: <StatusText tone={reservationTone(r)} sector="restaurant" />,
    })),
    notesPlaceholder: 'Alergias, mesa preferida, celebraciones, cómo le gusta que le atiendan…',
  };
}

/**
 * A customer's file, the same for citas and restaurante: who they are and how
 * to reach them, a line of figures, the next visit, notes and the history.
 */
export default function CustomerFile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business, isAppointments } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const [actionError, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);

  // Cached per customer (lib/query); never shows another customer's file while loading.
  const fileKey = ['customers', 'file', id, isAppointments ? 'appointments' : 'restaurant'];
  const fileQ = useData(fileKey, () => (isAppointments ? loadAppointments : loadRestaurant)(id, tz, today), { placeholderData: undefined });
  const file = fileQ.data || null;
  const setFile = (fn) => queryClient.setQueryData(fileKey, (f) => (f ? fn(f) : f));
  const load = () => queryClient.invalidateQueries({ queryKey: fileKey });
  const error = actionError || (fileQ.error ? apiError(fileQ.error, 'No se encontró el cliente') : '');
  // Notes follow the saved ones unless you are typing.
  const savedNotes = file?.customer?.notes || '';
  const [notesBase, setNotesBase] = useState(null);
  useEffect(() => {
    if (file && (notesBase === null || notes === notesBase)) { setNotes(savedNotes); setNotesBase(savedNotes); }
  }, [savedNotes, file]); // eslint-disable-line react-hooks/exhaustive-deps

  const customer = file?.customer;
  const book = () => (file?.bookUrl ? navigate(file.bookUrl) : setBooking(true));
  useSetMobileHeader({ title: 'Cliente', action: customer ? { label: isAppointments ? 'Cita' : 'Reserva', onClick: book } : undefined });

  const dirty = !!customer && notes !== (customer.notes || '');
  useUnsavedChanges('customer-notes', dirty);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await api.put(`/customers/${id}`, { notes });
      setFile((f) => ({ ...f, customer: { ...f.customer, notes } }));
      setNotesBase(notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) { setError(apiError(err)); } finally { setSavingNotes(false); }
  }

  async function toggleVip() {
    const vip = !customer.vip;
    setFile((f) => ({ ...f, customer: { ...f.customer, vip } }));
    try { await api.put(`/customers/${id}`, { vip }); } catch { setFile((f) => ({ ...f, customer: { ...f.customer, vip: !vip } })); }
  }

  const wa = useMemo(() => {
    if (!customer) return null;
    const first = customer.name.split(' ')[0];
    return waLink(customer.phone, file?.due
      ? `¡Hola ${first}! Hace tiempo que no te vemos por ${business?.name}. ¿Te reservo cita? Puedes elegir hora aquí: ${publicBookingUrl(business)}`
      : `¡Hola ${first}! `);
  }, [customer, file, business]);

  if (error && !file) {
    return (
      <div className="w-full space-y-3">
        <Link to="/customers" className="text-sm text-violet-700 font-semibold">‹ Clientes</Link>
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      </div>
    );
  }
  if (!file) return <p className="text-sm text-gray-400">Cargando…</p>;

  return (
    <div className="w-full">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 font-medium hover:text-gray-900">
        <Icon name="left" className="w-4 h-4" strokeWidth={2} />Clientes
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-center gap-4">
        <span className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold shrink-0" style={{ backgroundColor: avatarColor(customer.name) }}>
          {initials(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 truncate">{customer.name}</h1>
            <button type="button" onClick={toggleVip} title={customer.vip ? 'Quitar VIP' : 'Marcar como VIP'} aria-label="VIP"
              className={`text-xl leading-none ${customer.vip ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}>★</button>
          </div>
          <p className="text-sm text-gray-500 truncate">{[customer.phone && phoneText(customer.phone), customer.email].filter(Boolean).join(' · ') || 'Sin teléfono ni email'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cliente desde {new Date(customer.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button type="button" onClick={book} className={`${btn} bg-violet-600 text-white hover:bg-violet-700 hidden lg:inline-flex`}>{file.bookLabel}</button>
          {customer.phone && <a href={`tel:${customer.phone.replace(/\s/g, '')}`} className={`${btn} border border-gray-200 text-gray-800 hover:bg-gray-50 flex-1 sm:flex-none`}><Icon name="phone" className="w-4 h-4" />Llamar</a>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={`${btn} bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex-1 sm:flex-none`}><Icon name="chat" className="w-4 h-4" />WhatsApp</a>}
          <button type="button" onClick={() => setEditing(true)} className={`${btn} border border-gray-200 text-gray-800 hover:bg-gray-50 flex-1 sm:flex-none`}>Editar</button>
        </div>
      </header>

      <FigureLine items={file.figures} />

      {file.due && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <b>Le toca volver.</b> {file.due}
          {wa && <> <a href={wa} target="_blank" rel="noreferrer" className="font-semibold underline">Mandarle un WhatsApp</a>.</>}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-x-12 gap-y-9 items-start">
        <div className="space-y-9">
          <Section title={isAppointments ? 'Próxima cita' : 'Próxima reserva'}>
            {file.next ? (
              <Link to={file.next.to} className="block rounded-xl bg-violet-50 px-4 py-3 hover:bg-violet-100/70">
                <p className="text-[15px] font-semibold text-violet-950">{file.next.text}</p>
                <p className="text-xs text-violet-800 mt-0.5">{file.next.sub}</p>
              </Link>
            ) : (
              <p className="text-sm text-gray-500 py-1">No tiene ninguna. <button type="button" onClick={book} className="font-semibold text-violet-700">{file.bookLabel}</button></p>
            )}
            {file.habits.length > 0 && <div className="mt-3 space-y-1.5 text-sm text-gray-600">{file.habits.map((h, i) => <p key={i}>{h}</p>)}</div>}
          </Section>

          <Section title="Notas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={2000} placeholder={file.notesPlaceholder}
              className="w-full rounded-xl bg-amber-50/60 border border-amber-100 px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-violet-500/30" />
            <div className="flex items-center gap-3 mt-2">
              {dirty && <button type="button" onClick={saveNotes} disabled={savingNotes} className={`${btn} h-9 bg-gray-900 text-white`}>{savingNotes ? 'Guardando…' : 'Guardar notas'}</button>}
              {dirty && <button type="button" className="text-xs text-gray-500 hover:text-gray-800" onClick={() => setNotes(customer.notes || '')}>Descartar</button>}
              {notesSaved && <span className="text-sm text-emerald-600">Guardado ✓</span>}
              {!dirty && !notesSaved && <p className="text-[11px] text-gray-400">Solo las ve tu equipo, nunca el cliente.</p>}
            </div>
          </Section>
        </div>

        <Section title="Historial" aside={<span className="text-xs text-gray-400">{file.historyCount}</span>}>
          {file.history.length === 0 ? <Empty>Todavía no ha venido.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {file.history.map((h) => (
                <TimeRow key={h.key} wide time={h.when} end={h.time} tone={h.tone} sector={isAppointments ? 'appointments' : 'restaurant'}
                  title={h.title} subtitle={h.sub} trailing={h.right} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      {editing && (
        <Modal title="Editar cliente" onClose={() => setEditing(false)}>
          <CustomerForm customer={customer} onSave={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} onDeleted={() => navigate('/customers')} />
        </Modal>
      )}
      {booking && (
        <Modal title="Nueva reserva" onClose={() => setBooking(false)} size="md">
          <ReservationForm reservation={{ guestName: customer.name, guestPhone: customer.phone || '', guestEmail: customer.email || '' }}
            onSave={() => { setBooking(false); window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Reserva creada' } })); load(); }}
            onCancel={() => setBooking(false)} />
        </Modal>
      )}
    </div>
  );
}
