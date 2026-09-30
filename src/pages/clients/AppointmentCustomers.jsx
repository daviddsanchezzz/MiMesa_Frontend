import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import CustomerForm from '../../components/CustomerForm';
import Modal from '../../components/Modal';
import { DEFAULT_TZ, btnPrimary, euros, initials, pluralize, staffColors, STAFF_COLORS } from '../agenda/utils';

const FILTERS = [
  ['all', 'Todos'],
  ['due', 'Les toca volver'],
  ['upcoming', 'Con cita'],
  ['new', 'Nuevos (30 días)'],
  ['noshow', 'No vinieron'],
];
const SORTS = [
  ['recent', 'Última visita'],
  ['name', 'Nombre'],
  ['visits', 'Más visitas'],
  ['spent', 'Más gasto'],
];

export function relDays(date) {
  if (!date) return null;
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days === -1) return 'mañana';
  if (days < 0) return `en ${-days} días`;
  if (days < 60) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months < 12 ? `hace ${months} meses` : `hace más de un año`;
}

export function shortDateTime(date, tz = DEFAULT_TZ) {
  return new Date(date).toLocaleString('es-ES', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name }) {
  const idx = (name?.charCodeAt(0) || 0) % STAFF_COLORS.length;
  return (
    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: STAFF_COLORS[idx] }}>
      {initials(name)}
    </span>
  );
}

/**
 * Customers of an appointment business: who they are, when they came, when
 * they come next and who is due back.
 */
export default function AppointmentCustomers() {
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [summary, setSummary] = useState({});
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [creating, setCreating] = useState(false);

  useSetMobileHeader({ title: 'Clientes' });

  const load = () => Promise.all([api.get('/customers').then((r) => r.data), bookingsApi.customersSummary(), bookingsApi.resources()])
    .then(([c, s, r]) => { setCustomers(c); setSummary(s); setResources(r); })
    .catch((err) => setError(apiError(err)));
  useEffect(() => { load(); }, []);

  const colors = useMemo(() => staffColors(resources), [resources]);
  const staffById = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);

  const rows = useMemo(() => {
    if (!customers) return [];
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    const monthAgo = Date.now() - 30 * 86400000;
    const list = customers.map((c) => ({ ...c, s: summary[c._id] || null }))
      .filter((c) => !needle
        || c.name?.toLowerCase().includes(needle)
        || c.email?.toLowerCase().includes(needle)
        || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits)))
      .filter((c) => {
        if (filter === 'due') return c.s?.dueBack;
        if (filter === 'upcoming') return !!c.s?.nextVisit;
        if (filter === 'new') return new Date(c.createdAt).getTime() >= monthAgo;
        if (filter === 'noshow') return (c.s?.noShows || 0) > 0;
        return true;
      });
    const by = {
      recent: (a, b) => new Date(b.s?.lastVisit || b.s?.nextVisit || 0) - new Date(a.s?.lastVisit || a.s?.nextVisit || 0),
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'es'),
      visits: (a, b) => (b.s?.visits || 0) - (a.s?.visits || 0),
      spent: (a, b) => (b.s?.spent || 0) - (a.s?.spent || 0),
    };
    return list.sort(by[sort]);
  }, [customers, summary, q, filter, sort]);

  const counts = useMemo(() => {
    const values = Object.values(summary);
    return { due: values.filter((s) => s.dueBack).length, upcoming: values.filter((s) => s.nextVisit).length };
  }, [summary]);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers ? `${pluralize(customers.length, 'cliente', 'clientes')}` : 'Cargando…'}
            {counts.due > 0 && <> · <button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => setFilter('due')}>{pluralize(counts.due, 'le toca volver', 'les toca volver')}</button></>}
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>Nuevo cliente</button>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="space-y-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o email"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {label}{key === 'due' && counts.due ? ` · ${counts.due}` : ''}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600">
            {SORTS.map(([k, l]) => <option key={k} value={k}>Ordenar: {l}</option>)}
          </select>
        </div>
      </div>

      {customers && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">
            {customers.length === 0
              ? 'Todavía no hay clientes. Se crean solos cuando alguien reserva con su teléfono o email.'
              : 'Nadie coincide con la búsqueda.'}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span className="col-span-4">Cliente</span>
            <span className="col-span-2">Última visita</span>
            <span className="col-span-3">Próxima cita</span>
            <span className="col-span-1 text-right">Visitas</span>
            <span className="col-span-2 text-right">Gastado</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((c) => {
              const fav = c.s?.favouriteStaffId && staffById[c.s.favouriteStaffId];
              return (
                <li key={c._id}>
                  <button type="button" onClick={() => navigate(`/customers/${c._id}`)}
                    className="w-full text-left px-4 md:px-5 py-3 md:grid md:grid-cols-12 md:gap-3 md:items-center flex items-center gap-3 hover:bg-gray-50/70 transition-colors">
                    <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
                      <Avatar name={c.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                          {c.name}
                          {c.vip && <span className="text-amber-400" title="VIP">★</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{c.phone || c.email || 'Sin contacto'}</p>
                        <div className="flex flex-wrap gap-1 mt-1 md:hidden">
                          {c.s?.dueBack && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-emerald-100 text-emerald-800">Le toca volver</span>}
                          {c.s?.nextVisit && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-violet-100 text-violet-700">Cita {shortDateTime(c.s.nextVisit, tz)}</span>}
                          {!c.s?.nextVisit && c.s?.lastVisit && <span className="text-[10px] text-gray-500">Vino {relDays(c.s.lastVisit)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block md:col-span-2 text-sm text-gray-700">
                      {c.s?.lastVisit ? relDays(c.s.lastVisit) : <span className="text-gray-300">—</span>}
                      {c.s?.dueBack && <span className="block text-[11px] font-semibold text-emerald-700">Le toca volver</span>}
                    </div>
                    <div className="hidden md:block md:col-span-3 text-sm text-gray-700 truncate">
                      {c.s?.nextVisit ? <span className="capitalize">{shortDateTime(c.s.nextVisit, tz)}</span> : <span className="text-gray-300">—</span>}
                      {fav && (
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[fav._id] }} />Suele ir con {fav.name}
                        </span>
                      )}
                    </div>
                    <div className="hidden md:block md:col-span-1 text-right text-sm tabular-nums text-gray-900">
                      {c.s?.visits || 0}
                      {c.s?.noShows > 0 && <span className="block text-[11px] text-rose-600">{c.s.noShows} no vino</span>}
                    </div>
                    <div className="hidden md:block md:col-span-2 text-right text-sm font-semibold tabular-nums text-gray-900">{euros(c.s?.spent || 0)}</div>
                    <span className="md:hidden text-gray-300 text-lg">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {creating && (
        <Modal title="Nuevo cliente" onClose={() => setCreating(false)}>
          <CustomerForm onSave={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />
        </Modal>
      )}
    </div>
  );
}
