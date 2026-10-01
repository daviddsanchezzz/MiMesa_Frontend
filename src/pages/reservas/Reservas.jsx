import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { Segmented, Empty } from '../../ui/kit';
import Icon from '../../ui/Icon';
import DayStrip from '../agenda/DayStrip';
import { DEFAULT_TZ, addDays, longDate, todayIn, weekStart, toHHMM } from '../agenda/utils';
import useRestaurantDay from './useRestaurantDay';
import ReservationSheet from './ReservationSheet';
import PendingSheet from './PendingSheet';
import { ReservationRow, groupByShift, live, peopleOf, plural } from './parts';

const ReservationsLegacy = lazy(() => import('../Reservations'));

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

function nowMinutes(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
}

/** The day by shift: Comida, Cena… each with its reservations in time order. */
function DayList({ date, today, tz }) {
  const day = useRestaurantDay(date);
  const { reservations, shifts, shiftOf, tables, pending, actions, isManager, loading } = day;
  const [openId, setOpenId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const isToday = date === today;
  const nowMin = isToday ? nowMinutes(tz) : null;

  const visible = reservations.filter((r) => showCancelled || live(r));
  const groups = useMemo(() => groupByShift(visible, shifts, shiftOf), [visible, shifts, shiftOf]);
  const cancelledCount = reservations.length - reservations.filter(live).length;
  const opened = openId ? reservations.find((r) => r._id === openId) : null;
  const pendingHere = pending.filter((r) => r.date >= today);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{longDate(date)}</span>
          {reservations.length > 0 && <> · {plural(reservations.filter(live).length, 'reserva', 'reservas')} · {plural(peopleOf(reservations), 'persona', 'personas')}</>}
        </p>
        {cancelledCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Ver canceladas ({cancelledCount})
          </label>
        )}
      </div>

      {pendingHere.length > 0 && (
        <button type="button" onClick={() => setShowPending(true)}
          className="w-full flex items-center gap-3 rounded-xl bg-amber-50 hover:bg-amber-100/70 px-4 py-3 text-left transition-colors">
          <Icon name="inbox" className="w-5 h-5 text-amber-600" />
          <span className="flex-1 text-sm text-amber-950"><b>{plural(pendingHere.length, 'solicitud', 'solicitudes')}</b> por confirmar</span>
          <span className="text-[13px] font-semibold text-amber-900 inline-flex items-center gap-0.5">Revisar <Icon name="right" className="w-3.5 h-3.5" strokeWidth={2} /></span>
        </button>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8">Cargando…</p>
      ) : shifts.length === 0 && visible.length === 0 ? (
        <Empty>Este día el restaurante está cerrado.</Empty>
      ) : (
        <div className={`grid grid-cols-1 gap-x-12 gap-y-8 ${groups.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {groups.map(({ shift, rows }) => {
            const on = isToday && nowMin != null && shift.times.length && nowMin >= shift.start - 30 && nowMin <= shift.end + 90;
            return (
              <section key={shift.name} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 pb-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">{shift.name}</h3>
                    {shift.times.length > 0 && <span className="text-xs text-gray-400 tabular-nums">{toHHMM(shift.start)}–{toHHMM(shift.end)}</span>}
                    {on && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Ahora</span>}
                  </div>
                  <span className="text-sm text-gray-500 tabular-nums whitespace-nowrap">
                    {rows.filter(live).length} res. · <b className="text-gray-900">{peopleOf(rows)}</b> pers.
                  </span>
                </div>
                {rows.length === 0 ? (
                  <div className="py-5 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">Sin reservas.</p>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('app:new'))}
                      className="text-[13px] font-semibold text-violet-700">+ Añadir</button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <ReservationRow key={r._id} r={r} isToday={isToday} isManager={isManager} actions={actions} nowMin={nowMin} onOpen={(x) => setOpenId(x._id)} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {opened && <ReservationSheet reservation={opened} tables={tables} actions={actions} isManager={isManager} today={today} onClose={() => setOpenId(null)} />}
      {showPending && <PendingSheet pending={pendingHere} actions={actions} today={today} onClose={() => setShowPending(false)} />}
    </div>
  );
}

/**
 * Reservas: the same screen as Agenda in citas — a day strip on top and the
 * day below. Views: Lista (by shift, the default), Calendario and Plano.
 */
export default function Reservas() {
  const { business } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const [params, setParams] = useSearchParams();
  const view = ['calendar', 'map'].includes(params.get('view')) ? params.get('view') : 'list';
  const [date, setDate] = useState(() => (isDate(params.get('date')) ? params.get('date') : today));
  const [counts, setCounts] = useState({});

  useSetMobileHeader({ title: 'Reservas', action: false });

  useEffect(() => {
    const d = params.get('date');
    if (isDate(d)) {
      setDate(d);
      const next = new URLSearchParams(params);
      next.delete('date');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const from = weekStart(date);
  useEffect(() => {
    const load = () => api.get('/reservations', { params: { from, to: addDays(from, 6) } })
      .then((res) => {
        const out = {};
        for (const r of (res.data || []).filter(live)) out[r.date] = (out[r.date] || 0) + 1;
        setCounts(out);
      })
      .catch(() => {});
    load();
    window.addEventListener('reservation:created', load);
    return () => window.removeEventListener('reservation:created', load);
  }, [from]);

  const setView = (v) => {
    const next = new URLSearchParams(params);
    if (v === 'list') next.delete('view'); else next.set('view', v);
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900">Reservas</h1>
        <Segmented value={view} onChange={setView} options={[['list', 'Lista'], ['calendar', 'Calendario'], ['map', 'Plano']]} />
      </div>

      {view === 'list' ? (
        <>
          <DayStrip date={date} today={today} counts={counts} onChange={setDate} />
          <DayList key={date} date={date} today={today} tz={tz} />
        </>
      ) : (
        <Suspense fallback={<p className="text-sm text-gray-400">Cargando…</p>}>
          <ReservationsLegacy hideTabs />
        </Suspense>
      )}
    </div>
  );
}
