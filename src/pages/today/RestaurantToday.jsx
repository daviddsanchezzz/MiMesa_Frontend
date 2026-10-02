import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { useData } from '../../lib/query';
import { Section, SectionLink, TodoRow, TodoLink, FigureLine, Empty, greeting } from '../../ui/kit';
import { DEFAULT_TZ, addDays, longDate, todayIn, toMinutes } from '../agenda/utils';
import { shortDay } from '../../lib/dates';
import useRestaurantDay, { tablesOf } from '../reservas/useRestaurantDay';
import ReservationSheet from '../reservas/ReservationSheet';
import PendingSheet from '../reservas/PendingSheet';
import { ReservationRow, ShiftMeter, groupByShift, live, peopleOf, plural } from '../reservas/parts';

function nowMinutes(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
}

/** People per day for the coming week, as bars you can tap. */
function WeekBars({ today, days, onPick }) {
  const max = Math.max(10, ...days.map((d) => d.people));
  return (
    <div className="flex items-end gap-1.5 h-32">
      {days.map((d) => {
        const { weekday, day } = shortDay(d.date);
        const isToday = d.date === today;
        return (
          <button key={d.date} type="button" onClick={() => onPick(d.date)} className="group flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0"
            title={`${d.people} personas · ${d.count} reservas`}>
            <span className="text-[11px] font-semibold tabular-nums text-gray-700">{d.people || ''}</span>
            <div className={`w-full rounded-md transition-colors ${isToday ? 'bg-violet-500' : 'bg-gray-200 group-hover:bg-gray-300'}`}
              style={{ height: `${Math.max(4, (d.people / max) * 70)}%` }} />
            <span className={`text-[11px] ${isToday ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{weekday}</span>
            <span className="text-[10px] text-gray-400 -mt-1 tabular-nums">{day}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Hoy for restaurants: how each shift fills up, what to do, who comes next. */
export default function RestaurantToday() {
  const { business, session } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const navigate = useNavigate();
  const day = useRestaurantDay(today);
  const { reservations, shifts, shiftOf, seats, pending, tables, actions, isManager, loading } = day;
  const [openId, setOpenId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [nowMin, setNowMin] = useState(() => nowMinutes(tz));

  useSetMobileHeader({ title: business?.name || 'Hoy' });

  useEffect(() => {
    const t = setInterval(() => setNowMin(nowMinutes(tz)), 60000);
    return () => clearInterval(t);
  }, [tz]);

  const weekQ = useData(['reservations', 'range', today, addDays(today, 6)],
    () => api.get('/reservations', { params: { from: today, to: addDays(today, 6) } }).then((res) => res.data || []));
  const week = useMemo(() => {
    if (!weekQ.data) return [];
    const list = weekQ.data.filter(live);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      const rows = list.filter((r) => r.date === d);
      return { date: d, count: rows.length, people: peopleOf(rows) };
    });
  }, [weekQ.data, today]);

  const groups = useMemo(() => groupByShift(reservations, shifts, shiftOf), [reservations, shifts, shiftOf]);
  const liveToday = reservations.filter(live);
  const upcoming = liveToday
    .filter((r) => r.status !== 'seated' && toMinutes(r.time) >= nowMin - 30)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 6);
  const seatedNow = liveToday.filter((r) => r.status === 'seated');
  const noTable = liveToday.filter((r) => r.status !== 'seated' && !tablesOf(r).length && toMinutes(r.time) >= nowMin - 30);
  const tomorrow = week[1];
  const opened = openId ? reservations.find((r) => r._id === openId) : null;

  const todos = [
    pending.length > 0 && (
      <TodoRow key="pending" icon="inbox" tint="amber" action={<TodoLink onClick={() => setShowPending(true)}>Revisar</TodoLink>}>
        <b className="text-gray-900">{plural(pending.length, 'solicitud', 'solicitudes')}</b> por confirmar
      </TodoRow>
    ),
    noTable.length > 0 && tables.length > 0 && (
      <TodoRow key="tables" icon="map" tint="violet" action={<TodoLink to="/reservations">Asignar</TodoLink>}>
        <b className="text-gray-900">{plural(noTable.length, 'reserva', 'reservas')}</b> de hoy sin mesa
      </TodoRow>
    ),
    tomorrow && tomorrow.count > 0 && (
      <TodoRow key="tomorrow" icon="calendar" tint="gray" action={<TodoLink to={`/reservations?date=${tomorrow.date}`}>Ver</TodoLink>}>
        Mañana: <b className="text-gray-900">{plural(tomorrow.count, 'reserva', 'reservas')}</b>, {plural(tomorrow.people, 'persona', 'personas')}
      </TodoRow>
    ),
  ].filter(Boolean);

  return (
    <div className="w-full">
      <header className="mb-6">
        <p className="text-sm text-gray-500">{longDate(today)}</p>
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 mt-0.5">{greeting(session?.user?.name)}</h1>
        <div className="mt-3">
          <FigureLine items={[
            { label: 'personas hoy', value: peopleOf(reservations) },
            { label: liveToday.length === 1 ? 'reserva' : 'reservas', value: liveToday.length },
            seatedNow.length > 0 && { label: 'en sala', value: peopleOf(seatedNow), tone: 'good' },
            pending.length > 0 && { label: 'por confirmar', value: pending.length, tone: 'warn' },
          ]} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-x-12 gap-y-8">
        <div className="space-y-9 min-w-0">
          {todos.length > 0 && (
            <Section title="Por hacer" className="lg:hidden">
              <ul className="divide-y divide-gray-100">{todos}</ul>
            </Section>
          )}
          <Section title="Tu día">
            {loading ? <p className="text-sm text-gray-400 py-6">Cargando…</p>
              : shifts.length === 0 ? (
                <Empty action={isManager && <Link to="/configuracion" className="text-sm font-semibold text-violet-700">Revisar turnos</Link>}>Hoy no hay turnos abiertos.</Empty>
              ) : (
                <div className="space-y-7 pt-2">
                  {groups.filter((g) => g.shift.times.length).map((g) => (
                    <ShiftMeter key={g.shift.name} shift={g.shift} rows={g.rows} seats={seats} nowMin={nowMin} />
                  ))}
                </div>
              )}
          </Section>

          <Section title="A continuación" aside={<SectionLink to="/reservations">Ver todas</SectionLink>}>
            {loading ? null : upcoming.length === 0 ? (
              <Empty>{liveToday.length ? 'No quedan reservas por llegar hoy.' : 'Hoy no hay reservas todavía.'}</Empty>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.map((r) => (
                  <ReservationRow key={r._id} r={r} isToday isManager={isManager} actions={actions} nowMin={nowMin} onOpen={(x) => setOpenId(x._id)} />
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-9 min-w-0">
          <Section title="Por hacer" className="hidden lg:block">
            {todos.length ? <ul className="divide-y divide-gray-100">{todos}</ul> : <p className="text-sm text-gray-500 py-2">Todo al día. Nada pendiente.</p>}
          </Section>

          {week.length > 0 && (
            <Section title="Próximos 7 días">
              <div className="pt-3">
                <WeekBars today={today} days={week} onPick={(d) => navigate(`/reservations?date=${d}`)} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Personas por día. Toca un día para verlo.</p>
            </Section>
          )}
        </aside>
      </div>

      {opened && (
        <ReservationSheet reservation={opened} tables={tables} actions={actions} isManager={isManager} today={today} onClose={() => setOpenId(null)} />
      )}
      {showPending && <PendingSheet pending={pending} actions={actions} today={today} onClose={() => setShowPending(false)} />}
    </div>
  );
}
