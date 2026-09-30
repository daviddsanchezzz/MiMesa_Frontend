import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import CustomerForm from '../../components/CustomerForm';
import Modal from '../../components/Modal';
import StaffAvatar from '../agenda/StaffAvatar';
import { DEFAULT_TZ, btnPrimary, btnSecondary, euros, initials, pluralize, staffColors, STAFF_COLORS, waLink } from '../agenda/utils';
import { relDays, shortDateTime } from './AppointmentCustomers';

const CHIP = {
  pending: ['Pendiente', 'bg-amber-100 text-amber-800'],
  confirmed: ['Confirmada', 'bg-violet-100 text-violet-700'],
  checked_in: ['Ha llegado', 'bg-sky-100 text-sky-800'],
  completed: ['Atendida', 'bg-emerald-100 text-emerald-800'],
  cancelled: ['Cancelada', 'bg-gray-100 text-gray-500'],
  no_show: ['No vino', 'bg-rose-100 text-rose-700'],
};

function everyText(days) {
  if (!days) return '—';
  if (days < 14) return `cada ${days} días`;
  const weeks = Math.round(days / 7);
  return weeks < 9 ? `cada ${weeks} semanas` : `cada ${Math.round(days / 30)} meses`;
}

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 tabular-nums ${tone || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

/** A customer's file: contact, notes, next appointment and history. */
export default function AppointmentCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState(null);
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useSetMobileHeader({ title: customer?.name || 'Cliente' });

  const load = () => Promise.all([api.get(`/customers/${id}`).then((r) => r.data.customer), bookingsApi.customerHistory(id), bookingsApi.resources(true)])
    .then(([c, h, r]) => { setCustomer(c); setNotes(c.notes || ''); setHistory(h); setResources(r); })
    .catch((err) => setError(apiError(err, 'No se encontró el cliente')));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const colors = useMemo(() => staffColors(resources.filter((r) => r.active !== false)), [resources]);
  const staffById = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);
  const dirty = !!customer && notes !== (customer.notes || '');
  useUnsavedChanges('customer-notes', dirty);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const { data } = await api.put(`/customers/${id}`, { notes });
      setCustomer((c) => ({ ...c, ...(data?.customer || data || {}), notes }));
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) { setError(apiError(err)); } finally { setSavingNotes(false); }
  }

  async function toggleVip() {
    const vip = !customer.vip;
    setCustomer((c) => ({ ...c, vip }));
    try { await api.put(`/customers/${id}`, { vip }); } catch { setCustomer((c) => ({ ...c, vip: !vip })); }
  }

  if (error && !customer) {
    return (
      <div className="space-y-3">
        <Link to="/customers" className="text-sm text-violet-700 font-semibold">‹ Clientes</Link>
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      </div>
    );
  }
  if (!customer || !history) return <p className="text-sm text-gray-400">Cargando…</p>;

  const s = history.summary;
  const bookUrl = `/agenda?new=1&name=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone || '')}&email=${encodeURIComponent(customer.email || '')}${s.favouriteStaffId ? `&staff=${s.favouriteStaffId}` : ''}`;
  const first = customer.name.split(' ')[0];
  const wa = waLink(customer.phone, s.dueBack
    ? `¡Hola ${first}! Hace tiempo que no te vemos por ${business?.name}. ¿Te reservo cita? Puedes elegir hora aquí: ${window.location.origin}/public/${business?.id}/cita`
    : `¡Hola ${first}! `);
  const fav = s.favouriteStaffId && staffById[s.favouriteStaffId];
  const avatarColor = STAFF_COLORS[(customer.name?.charCodeAt(0) || 0) % STAFF_COLORS.length];

  return (
    <div className="space-y-5 max-w-5xl">
      <Link to="/customers" className="text-sm text-violet-700 font-semibold hover:text-violet-900">‹ Clientes</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap items-center gap-4">
        <span className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: avatarColor }}>
          {initials(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">{customer.name}</h2>
            <button type="button" onClick={toggleVip} title={customer.vip ? 'Quitar VIP' : 'Marcar como VIP'}
              className={`text-lg leading-none ${customer.vip ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}>★</button>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'Sin teléfono ni email'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Cliente desde {new Date(customer.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link to={bookUrl} className={`${btnPrimary} flex-1 sm:flex-none`}>Dar cita</Link>
          {customer.phone && <a href={`tel:${customer.phone.replace(/\s/g, '')}`} className={`${btnSecondary} flex-1 sm:flex-none`}>Llamar</a>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-95 flex-1 sm:flex-none">WhatsApp</a>}
          <button type="button" className={`${btnSecondary} flex-1 sm:flex-none`} onClick={() => setEditing(true)}>Editar</button>
        </div>
      </div>

      {s.dueBack && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-900">
          <b>Le toca volver.</b> Vino por última vez {relDays(s.lastVisit)}{s.avgDays ? ` y suele venir ${everyText(s.avgDays)}` : ''}.
          {wa && <> <a href={wa} target="_blank" rel="noreferrer" className="font-semibold underline">Mandarle un WhatsApp</a>.</>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Visitas" value={s.visits} />
        <Stat label="Gastado" value={euros(s.spent)} />
        <Stat label="Suele venir" value={everyText(s.avgDays)} />
        <Stat label="No vino / canceló" value={`${s.noShows} / ${s.cancellations}`} tone={s.noShows ? 'text-rose-600' : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Next appointment */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Próxima cita</h3>
            {s.nextVisit ? (
              <button type="button" onClick={() => navigate(`/agenda?date=${new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(s.nextVisit))}`)}
                className="w-full text-left rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 hover:bg-violet-100/60">
                <p className="text-sm font-semibold text-violet-900 capitalize">{shortDateTime(s.nextVisit, tz)}</p>
                <p className="text-xs text-violet-700 mt-0.5">{relDays(s.nextVisit)} · Ver en la agenda</p>
              </button>
            ) : (
              <p className="text-sm text-gray-500">No tiene ninguna. <Link to={bookUrl} className="font-semibold text-violet-700">Dar cita</Link></p>
            )}
            {(s.favouriteService || fav) && (
              <div className="mt-4 space-y-1.5 text-sm">
                {s.favouriteService && <p className="text-gray-600">Servicio habitual: <b className="text-gray-900">{s.favouriteService}</b></p>}
                {fav && (
                  <p className="text-gray-600 flex items-center gap-1.5">Suele ir con
                    <StaffAvatar name={fav.name} photo={fav.photo} color={colors[fav._id] || '#9ca3af'} size={20} />
                    <b className="text-gray-900">{fav.name}</b>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Notas</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={2000}
              placeholder="Fórmula de color, alergias, cómo le gusta el corte, cumpleaños…"
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <div className="flex items-center gap-3">
              <button type="button" onClick={saveNotes} disabled={!dirty || savingNotes} className={btnPrimary}>{savingNotes ? 'Guardando…' : 'Guardar notas'}</button>
              {dirty && <button type="button" className="text-xs text-gray-500 hover:text-gray-800" onClick={() => setNotes(customer.notes || '')}>Descartar</button>}
              {notesSaved && <span className="text-sm text-emerald-600">Guardado ✓</span>}
            </div>
            <p className="text-[11px] text-gray-400">Solo las ve tu equipo, nunca el cliente.</p>
          </section>
        </div>

        {/* History */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Historial</h3>
            <span className="text-xs text-gray-400">{pluralize(history.bookings.length, 'cita', 'citas')}</span>
          </div>
          {history.bookings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Todavía no tiene citas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.bookings.map((b) => {
                const staffIds = [...new Set(b.segments.flatMap((seg) => seg.resourceIds || []))].filter((sid) => staffById[sid]?.kind === 'staff');
                const person = staffById[staffIds[0]];
                const chip = CHIP[b.status] || CHIP.confirmed;
                const future = new Date(b.start) > new Date();
                return (
                  <li key={b._id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-24 shrink-0">
                      <p className={`text-sm font-semibold ${future ? 'text-violet-700' : 'text-gray-900'}`}>
                        {new Date(b.start).toLocaleDateString('es-ES', { timeZone: tz, day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">{new Date(b.start).toLocaleTimeString('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${['cancelled', 'no_show'].includes(b.status) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {b.segments.map((seg) => seg.serviceName).join(' + ')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {person && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[person._id] || '#9ca3af' }} />}
                        <span className="text-xs text-gray-500">{person ? person.name : ''}{b.source === 'online' ? `${person ? ' · ' : ''}reservó online` : ''}</span>
                      </div>
                      {b.internalNotes && <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">{b.internalNotes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">{euros(b.totalPrice)}</p>
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-px rounded ${chip[1]}`}>{chip[0]}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <Modal title="Editar cliente" onClose={() => setEditing(false)}>
          <CustomerForm customer={customer}
            onSave={() => { setEditing(false); load(); }}
            onCancel={() => setEditing(false)}
            onDeleted={() => navigate('/customers')} />
        </Modal>
      )}
    </div>
  );
}
