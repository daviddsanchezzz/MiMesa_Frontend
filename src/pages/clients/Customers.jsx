import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import CustomerForm from '../../components/CustomerForm';
import Modal from '../../components/Modal';
import CustomerListTools from '../../components/CustomerListTools';
import { queryClient, useData } from '../../lib/query';
import { useResources } from '../agenda/queries';

const NO_SUMMARY = {};
const NO_RESOURCES = [];
import Icon from '../../ui/Icon';
import { MenuButton } from '../../ui/kit';
import { DEFAULT_TZ, euros, initials, pluralize, staffColors, todayIn } from '../agenda/utils';
import { dayLabel } from '../../lib/dates';
import { avatarColor, relDays, shortDateTime } from './format';

/**
 * Clientes, the same screen for citas and restaurante. What changes is what
 * each sector knows about a customer (spend and "due back" in citas, party
 * size in restaurante); the list, filters and file work the same.
 */
const SECTORS = {
  appointments: {
    filters: [['all', 'Todos'], ['due', 'Les toca volver'], ['upcoming', 'Con cita'], ['new', 'Nuevos'], ['noshow', 'No vinieron']],
    sorts: [['recent', 'Última visita'], ['name', 'Nombre'], ['visits', 'Más visitas'], ['spent', 'Más gasto']],
    load: async () => {
      const [summary, resources] = await Promise.all([bookingsApi.customersSummary(), bookingsApi.resources()]);
      return { summary, resources };
    },
    nextLabel: 'Próxima cita',
    lastColumn: 'Gastado',
  },
  restaurant: {
    filters: [['all', 'Todos'], ['regular', 'Habituales'], ['upcoming', 'Con reserva'], ['new', 'Nuevos'], ['noshow', 'No vinieron']],
    sorts: [['recent', 'Última visita'], ['name', 'Nombre'], ['visits', 'Más visitas']],
    load: async () => {
      const summary = await api.get('/reservations/customers/summary').then((r) => r.data).catch(() => ({}));
      return { summary, resources: [] };
    },
    nextLabel: 'Próxima reserva',
    lastColumn: 'Suele venir',
  },
};

function Avatar({ name, vip }) {
  return (
    <span className="relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: avatarColor(name) }}>
      {initials(name)}
      {vip && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 ring-2 ring-white text-[9px] leading-4 text-center text-white">★</span>}
    </span>
  );
}

export default function Customers() {
  const { business, isAppointments } = useAuth();
  const sector = isAppointments ? 'appointments' : 'restaurant';
  const cfg = SECTORS[sector];
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [creating, setCreating] = useState(false);

  useSetMobileHeader({ title: 'Clientes', action: { label: 'Cliente', onClick: () => setCreating(true) } });

  // Cached (lib/query); saving a customer, booking or reservation refreshes it.
  const customersQ = useData(['customers', 'list'], () => api.get('/customers').then((r) => r.data));
  const summaryQ = useData([isAppointments ? 'bookings' : 'reservations', 'customersSummary'],
    () => (isAppointments ? bookingsApi.customersSummary() : api.get('/reservations/customers/summary').then((r) => r.data).catch(() => ({}))));
  const resQ = useResources();
  const customers = customersQ.data || null;
  const summary = summaryQ.data || NO_SUMMARY;
  const resources = (isAppointments && resQ.data) || NO_RESOURCES;
  const error = customersQ.error ? apiError(customersQ.error) : '';
  const load = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  const colors = useMemo(() => staffColors(resources), [resources]);
  const staffById = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);

  // One shape for both sectors: { visits, last, next (sortable), nextText, noShows, due, spent, people }
  const rows = useMemo(() => {
    if (!customers) return [];
    const monthAgo = Date.now() - 30 * 86400000;
    const list = customers.map((c) => {
      const s = summary[c._id] || null;
      if (isAppointments) {
        return {
          c, s, visits: s?.visits || 0, last: s?.lastVisit || null, next: s?.nextVisit || null,
          nextText: s?.nextVisit ? shortDateTime(s.nextVisit, tz) : null,
          noShows: s?.noShows || 0, due: !!s?.dueBack, spent: s?.spent || 0, fav: s?.favouriteStaffId && staffById[s.favouriteStaffId],
        };
      }
      const next = s?.nextVisit ? `${s.nextVisit.date}T${s.nextVisit.time}` : null;
      return {
        c, s, visits: s ? s.visits : (c.visits || 0), last: s?.lastVisit || null, next,
        nextText: s?.nextVisit ? `${dayLabel(s.nextVisit.date, today)}, ${s.nextVisit.time} · ${s.nextVisit.people} pers.` : null,
        noShows: s?.noShows ?? c.noShowCount ?? 0, people: s?.people || null,
      };
    });
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    return list
      .filter(({ c }) => !needle || c.name?.toLowerCase().includes(needle) || c.email?.toLowerCase().includes(needle)
        || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits)))
      .filter((r) => {
        if (filter === 'due') return r.due;
        if (filter === 'regular') return r.visits >= 3;
        if (filter === 'upcoming') return !!r.next;
        if (filter === 'new') return new Date(r.c.createdAt).getTime() >= monthAgo;
        if (filter === 'noshow') return r.noShows > 0;
        return true;
      })
      .sort({
        recent: (a, b) => String(b.last || b.next || '').localeCompare(String(a.last || a.next || '')),
        name: (a, b) => (a.c.name || '').localeCompare(b.c.name || '', 'es'),
        visits: (a, b) => b.visits - a.visits,
        spent: (a, b) => (b.spent || 0) - (a.spent || 0),
      }[sort]);
  }, [customers, summary, q, filter, sort, isAppointments, tz, today, staffById]);

  const counts = useMemo(() => {
    const values = Object.values(summary);
    return {
      due: values.filter((s) => s.dueBack).length,
      regular: isAppointments ? 0 : values.filter((s) => s.visits >= 3).length,
      upcoming: values.filter((s) => s.nextVisit).length,
    };
  }, [summary, isAppointments]);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 lg:mt-0.5">
            {customers ? pluralize(customers.length, 'cliente', 'clientes') : 'Cargando…'}
            {counts.due > 0 && <> · <button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => setFilter('due')}>{pluralize(counts.due, 'le toca volver', 'les toca volver')}</button></>}
            {counts.upcoming > 0 && <> · {counts.upcoming} con {isAppointments ? 'cita' : 'reserva'}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomerListTools onImported={load} />
          <button type="button" onClick={() => setCreating(true)}
            className="hidden lg:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
            <Icon name="plus" className="w-4 h-4" strokeWidth={2} />Nuevo cliente
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="space-y-3">
        <label className="relative block">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o email"
            className="w-full rounded-full bg-gray-100 border border-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-violet-500/30" />
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cfg.filters.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {label}{key === 'due' && counts.due ? ` · ${counts.due}` : ''}{key === 'regular' && counts.regular ? ` · ${counts.regular}` : ''}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <MenuButton ariaLabel="Ordenar" className="h-8 pl-2.5 pr-2 border border-gray-200"
              items={cfg.sorts.map(([k, l]) => ({ label: l, active: k === sort, onClick: () => setSort(k) }))}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4"><path d="M6 4v12m0 0-3-3m3 3 3-3M14 16V4m0 0-3 3m3-3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="hidden sm:inline">{cfg.sorts.find(([k]) => k === sort)?.[1]}</span>
            </MenuButton>
          </div>
        </div>
      </div>

      {customers && rows.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-sm text-gray-500">
            {customers.length === 0
              ? `Todavía no hay clientes. Se crean solos cuando alguien ${isAppointments ? 'pide cita' : 'reserva'} con su teléfono o email.`
              : 'Nadie coincide con la búsqueda.'}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span className="col-span-4">Cliente</span>
            <span className="col-span-2">Última visita</span>
            <span className="col-span-3">{cfg.nextLabel}</span>
            <span className="col-span-1 text-right">Visitas</span>
            <span className="col-span-2 text-right">{cfg.lastColumn}</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const { c } = r;
              return (
                <li key={c._id}>
                  <button type="button" onClick={() => navigate(`/customers/${c._id}`)}
                    className="w-full text-left px-2 -mx-0 py-3 md:grid md:grid-cols-12 md:gap-4 md:items-center flex items-center gap-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                    <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
                      <Avatar name={c.name} vip={c.vip} />
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-[13px] text-gray-500 truncate">{c.phone || c.email || 'Sin contacto'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
                          {r.due && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800">Le toca volver</span>}
                          {r.nextText && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800">{r.nextText}</span>}
                          {!r.nextText && r.last && <span className="text-[11px] text-gray-500">Vino {relDays(r.last)}</span>}
                          {r.noShows > 0 && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-rose-50 text-rose-700">{r.noShows} no vino</span>}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block md:col-span-2 text-sm text-gray-700">
                      {r.last ? relDays(r.last) : <span className="text-gray-300">—</span>}
                      {r.due && <span className="block text-[11px] font-semibold text-emerald-700">Le toca volver</span>}
                    </div>
                    <div className="hidden md:block md:col-span-3 text-sm text-gray-700 truncate">
                      {r.nextText || <span className="text-gray-300">—</span>}
                      {r.fav && (
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[r.fav._id] }} />Suele ir con {r.fav.name}
                        </span>
                      )}
                    </div>
                    <div className="hidden md:block md:col-span-1 text-right text-sm tabular-nums text-gray-900">
                      {r.visits}
                      {r.noShows > 0 && <span className="block text-[11px] text-rose-600">{r.noShows} no vino</span>}
                    </div>
                    <div className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-900">
                      {isAppointments ? <b className="font-semibold">{euros(r.spent)}</b> : (r.people ? `${r.people} personas` : <span className="text-gray-300">—</span>)}
                    </div>
                    <Icon name="right" className="md:hidden w-4 h-4 text-gray-300" strokeWidth={2} />
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
