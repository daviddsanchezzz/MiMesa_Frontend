import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { publicBookingUrl } from '../../lib/publicUrl';
import { bookingTone } from '../../lib/status';
import { Section, SectionLink, TimeRow, RowAction, TodoRow, TodoLink, FigureLine, Empty, greeting } from '../../ui/kit';
import DayRibbon from '../../ui/DayRibbon';
import { useAbsences, useBookings, useResources, useSchedule, useServices, useStats, refreshBookings } from '../agenda/queries';
import StaffAvatar from '../agenda/StaffAvatar';
import ShareLink from '../agenda/ShareLink';
import BookingDetailModal from '../agenda/BookingDetailModal';
import {
  DEFAULT_TZ, addDays, euros, longDate, minutesInTz, staffColors, timeInTz, toHHMM, todayIn, waLink, windowsForDate, pluralize, absenceSpan,
} from '../agenda/utils';

const btnPrimary = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700';

function staffIdsOf(b, staffById) {
  return [...new Set((b.segments || []).flatMap((s) => s.resourceIds || []))].filter((id) => staffById[id]?.kind === 'staff');
}

/** Hoy for appointment businesses: the day as a ribbon, what to do, who comes next, how the month goes. */
export default function AppointmentsToday() {
  const { business, hasRole, session } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const isManager = hasRole('manager');
  const navigate = useNavigate();

  const [now, setNow] = useState(() => Date.now());
  const [showOverdue, setShowOverdue] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useSetMobileHeader({ title: business?.name || 'Hoy' });

  const statsQ = useStats();
  const listQ = useBookings(today, today);
  const resQ = useResources();
  const servQ = useServices();
  const schedQ = useSchedule();
  const absQ = useAbsences(today, today);
  const all = [statsQ, listQ, resQ, servQ, schedQ];
  const data = all.every((q) => q.data !== undefined)
    ? { stats: statsQ.data, bookings: listQ.data, resources: resQ.data, services: servQ.data, schedule: schedQ.data, absences: absQ.data || [] }
    : null;
  const failed = all.find((q) => q.error && q.data === undefined);
  const error = failed ? apiError(failed.error) : '';
  const load = refreshBookings;

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);

  const colors = useMemo(() => staffColors(data?.resources), [data]);
  const staffById = useMemo(() => Object.fromEntries((data?.resources || []).map((r) => [r._id, r])), [data]);
  const staff = useMemo(() => (data?.resources || []).filter((r) => r.kind === 'staff'), [data]);

  if (error) return <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>;

  const s = data?.stats;
  const bookings = (data?.bookings || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
  const live = bookings.filter((b) => !['cancelled', 'no_show'].includes(b.status));
  const upcoming = live.filter((b) => b.status !== 'completed' && !b.payment && new Date(b.end).getTime() > now).slice(0, 5);
  const toCharge = live.filter((b) => !b.payment && (b.status === 'completed' || (b.status === 'checked_in' && new Date(b.end).getTime() <= now)));
  const nowMin = minutesInTz(new Date(now).toISOString(), tz);
  const selected = selectedId ? bookings.find((b) => b._id === selectedId) : null;

  // Ribbon: opening hours of today (or the hours with appointments), one lane per professional.
  const windows = data ? windowsForDate(data.schedule, today) : [];
  const bookedMins = live.flatMap((b) => [minutesInTz(b.start, tz), minutesInTz(b.end, tz)]);
  const from = Math.floor(Math.min(...windows.map((w) => w[0]), ...bookedMins, 9 * 60) / 60) * 60;
  const to = Math.ceil(Math.max(...windows.map((w) => w[1]), ...bookedMins, from + 8 * 60) / 60) * 60;
  const closed = [];
  let cursor = from;
  for (const [ws, we] of [...windows].sort((a, b) => a[0] - b[0])) { if (ws > cursor) closed.push([cursor, ws]); cursor = Math.max(cursor, we); }
  if (cursor < to) closed.push([cursor, to]);
  const laneStaff = s?.restricted ? staff.filter((p) => bookings.some((b) => staffIdsOf(b, staffById).includes(p._id))) : staff;
  const lanes = laneStaff.map((p) => ({
    id: p._id,
    label: p.name,
    avatar: <StaffAvatar name={p.name} photo={p.photo} color={colors[p._id]} size={26} />,
    closed: [
      ...closed,
      ...(data?.absences || []).filter((a) => a.resourceId === p._id).map((a) => absenceSpan(a, today, tz)).filter(Boolean),
    ],
    blocks: bookings.filter((b) => b.status !== 'cancelled').flatMap((b) => (b.segments || [])
      .filter((seg) => (seg.resourceIds || []).includes(p._id))
      .map((seg) => ({
        key: `${b._id}-${seg._id || seg.start}`,
        start: minutesInTz(seg.start, tz),
        end: minutesInTz(seg.end, tz),
        tone: bookingTone(b),
        title: `${timeInTz(seg.start, tz)} · ${b.guestName} · ${seg.serviceName}`,
        onClick: () => setSelectedId(b._id),
      }))),
  }));

  const setup = data && {
    staff: staff.length > 0,
    services: data.services.length > 0,
    hours: (data.schedule?.rules || []).length > 0,
  };
  const setupDone = setup && setup.staff && setup.services && setup.hours;
  const revenueDelta = s?.money && s.money.previousRevenue > 0
    ? Math.round(((s.money.revenue - s.money.previousRevenue) / s.money.previousRevenue) * 100) : null;
  const pendingNext = s?.actions.pendingRequests.next;
  const pendingDate = pendingNext ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(pendingNext.start)) : today;

  const todos = s ? [
    s.actions.pendingRequests.count > 0 && (
      <TodoRow key="pending" icon="inbox" tint="amber" action={<TodoLink to={`/agenda?date=${pendingDate}`}>Revisar</TodoLink>}>
        <b className="text-gray-900">{pluralize(s.actions.pendingRequests.count, 'solicitud online', 'solicitudes online')}</b> por confirmar
      </TodoRow>
    ),
    toCharge.length > 0 && (
      <TodoRow key="charge" icon="cash" tint="rose" action={<TodoLink onClick={() => setSelectedId(toCharge[0]._id)}>Cobrar</TodoLink>}>
        <b className="text-gray-900">{pluralize(toCharge.length, 'cita', 'citas')}</b> atendida{toCharge.length === 1 ? '' : 's'} sin cobrar
      </TodoRow>
    ),
    ...s.actions.freeGapsToday.slice(0, 2).map((g) => (
      <TodoRow key={`gap-${g.resourceId}-${g.startMin}`} icon="clock" tint="violet"
        action={<TodoLink to={`/agenda?new=1&date=${today}&time=${toHHMM(g.startMin)}&staff=${g.resourceId}`}>Dar cita</TodoLink>}>
        Hueco libre <b className="text-gray-900 tabular-nums">{toHHMM(g.startMin)}–{toHHMM(g.endMin)}</b> con {g.name}
      </TodoRow>
    )),
    s.actions.overdueCustomers.count > 0 && (
      <TodoRow key="overdue" icon="users" tint="green" action={<TodoLink onClick={() => setShowOverdue((v) => !v)}>{showOverdue ? 'Ocultar' : 'Ver'}</TodoLink>}>
        <b className="text-gray-900">{pluralize(s.actions.overdueCustomers.count, 'cliente', 'clientes')}</b> deberían haber vuelto ya
      </TodoRow>
    ),
    s.tomorrow.appointments > 0 && (
      <TodoRow key="tomorrow" icon="calendar" tint="gray" action={<TodoLink to={`/agenda?date=${addDays(today, 1)}`}>Ver</TodoLink>}>
        Mañana: <b className="text-gray-900">{pluralize(s.tomorrow.appointments, 'cita', 'citas')}</b>, la primera a las {timeInTz(s.tomorrow.firstStart, tz)}
      </TodoRow>
    ),
  ].filter(Boolean) : [];

  const overdueList = showOverdue && s?.actions.overdueCustomers.top.length > 0 && (
    <ul className="mt-1 mb-2 rounded-xl bg-gray-50 divide-y divide-gray-100">
      {s.actions.overdueCustomers.top.map((c) => {
        const wa = waLink(c.phone, `¡Hola ${c.name.split(' ')[0]}! Hace tiempo que no te vemos por ${business?.name}. ¿Te reservo cita? Puedes elegir hora aquí: ${publicBookingUrl(business)}`);
        return (
          <li key={`${c.name}-${c.lastVisit}`} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">Hace {c.daysSince} días · {pluralize(c.visits, 'visita', 'visitas')}</p>
            </div>
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#25D366] text-white">WhatsApp</a>
              : <span className="text-xs text-gray-400">Sin teléfono</span>}
          </li>
        );
      })}
    </ul>
  );

  const todoSection = (cls) => (
    <Section title="Por hacer" className={cls}>
      {todos.length ? <ul className="divide-y divide-gray-100">{todos}</ul> : <p className="text-sm text-gray-500 py-2">Todo al día. Nada pendiente.</p>}
      {overdueList}
    </Section>
  );

  return (
    <div className="w-full">
      <header className="mb-6">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{longDate(today)}</p>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 mt-0.5">{greeting(session?.user?.name)}</h1>
          {s && (
            <div className="mt-4 lg:mt-3">
              <FigureLine stacked items={[
                { label: s.today.appointments === 1 ? 'cita hoy' : 'citas hoy', value: s.today.appointments },
                s.today.remaining > 0 && { label: 'por delante', value: s.today.remaining },
                !s.restricted && { label: 'previsto', value: euros(s.today.expectedRevenue) },
                s.week.occupancy != null && { label: 'ocupado esta semana', value: `${s.week.occupancy}%` },
              ]} />
            </div>
          )}
        </div>
      </header>

      {!data && <p className="text-sm text-gray-400">Cargando…</p>}

      {setup && !setupDone && (
        <section className="mb-8 rounded-2xl bg-violet-50/70 p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Prepara tu agenda</h3>
              <p className="text-sm text-gray-600">Tres pasos y podrás empezar a dar citas.</p>
            </div>
            {isManager && <Link to="/bienvenida" className={btnPrimary}>Hacerlo paso a paso</Link>}
          </div>
          <ol className="space-y-2">
            {[['staff', 'Añade a tus profesionales', 'profesionales'], ['hours', 'Define tu horario de apertura', 'horario'], ['services', 'Crea tus servicios con su duración y precio', 'servicios']].map(([key, label, tab], i) => (
              <li key={key} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${setup[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-500'}`}>{setup[key] ? '✓' : i + 1}</span>
                <span className={`text-sm flex-1 ${setup[key] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{label}</span>
                {!setup[key] && isManager && <Link to={`/configuracion?tab=${tab}`} className="text-sm font-semibold text-violet-700">Configurar</Link>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {s && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-x-12 gap-y-8">
          <div className="space-y-9 min-w-0">
            {todos.length > 0 && todoSection('lg:hidden')}

            {lanes.length > 0 && (
              <Section title="Tu día" aside={<SectionLink to="/agenda">Agenda</SectionLink>}>
                <div className="pt-2">
                  <DayRibbon lanes={lanes} from={from} to={to} now={nowMin >= from && nowMin <= to ? nowMin : null}
                    onEmpty={(staffId, minute) => navigate(`/agenda?new=1&date=${today}&time=${toHHMM(minute)}&staff=${staffId}`)} />
                </div>
              </Section>
            )}

            <Section title="A continuación">
              {upcoming.length === 0 ? (
                <Empty>{s.today.appointments ? 'No quedan citas por hoy.' : 'Hoy no tienes citas.'}</Empty>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcoming.map((b, i) => {
                    const ids = staffIdsOf(b, staffById);
                    const person = staffById[ids[0]];
                    const startMs = new Date(b.start).getTime();
                    const current = startMs <= now && ['confirmed', 'checked_in'].includes(b.status);
                    let action = null;
                    if (b.status === 'checked_in') action = <RowAction tone="neutral" onClick={() => setSelectedId(b._id)}>Cobrar</RowAction>;
                    else if (b.status === 'pending') action = <RowAction tone="warn" onClick={() => bookingsApi.setStatus(b._id, 'confirmed').then(load).catch(() => {})}>Aceptar</RowAction>;
                    else if (b.status === 'confirmed' && startMs - now <= 20 * 60000) {
                      action = <RowAction tone="neutral" onClick={() => bookingsApi.setStatus(b._id, 'checked_in').then(load).catch(() => {})}>Llegó</RowAction>;
                    }
                    return (
                      <TimeRow key={b._id}
                        time={timeInTz(b.start, tz)} end={timeInTz(b.end, tz)}
                        tone={bookingTone(b)}
                        highlight={i === 0}
                        title={b.guestName}
                        badge={current && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">En curso</span>}
                        subtitle={`${person ? `${ids.map((id) => staffById[id]?.name).join(', ')} · ` : ''}${b.segments.map((seg) => seg.serviceName).join(' + ')}`}
                        trailing={<>{action}{person && <span className="hidden sm:block"><StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={28} /></span>}</>}
                        onClick={() => setSelectedId(b._id)}
                      />
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          <aside className="space-y-9 min-w-0">
            {todoSection('hidden lg:block')}

            {s.money && (
              <Section title="Este mes">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <p className="text-3xl font-semibold tabular-nums text-gray-900">{euros(s.money.revenue)}</p>
                  {revenueDelta != null && Math.abs(revenueDelta) <= 300 && (
                    <span className={`text-sm font-semibold ${revenueDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {revenueDelta >= 0 ? '▲' : '▼'} {Math.abs(revenueDelta)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">cobrado en citas{s.money.previousRevenue > 0 && ` · mes pasado a estas alturas ${euros(s.money.previousRevenue)}`}</p>
                <dl className="mt-4 text-sm divide-y divide-gray-100 border-t border-gray-100">
                  {[
                    ['Reservadas online', `${s.money.onlineBookings.count} · ${euros(s.money.onlineBookings.amount)}`],
                    ['Vinieron tras el recordatorio', `${s.money.remindedAttended.count} · ${euros(s.money.remindedAttended.amount)}`],
                    ['Cancelaron con tiempo', s.money.cancelledInTime.count],
                    ['No vinieron', `${s.money.noShows.count}${s.money.noShows.amount ? ` · −${euros(s.money.noShows.amount)}` : ''}`, s.money.noShows.count > 0],
                  ].map(([k, v, bad]) => (
                    <div key={k} className="flex justify-between gap-3 py-2">
                      <dt className="text-gray-600">{k}</dt>
                      <dd className={`font-semibold tabular-nums whitespace-nowrap ${bad ? 'text-rose-600' : 'text-gray-900'}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {s.team.length > 1 && (
              <Section title="Equipo esta semana">
                <ul className="space-y-3 pt-1">
                  {s.team.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <StaffAvatar name={t.name} photo={staffById[t.id]?.photo} color={colors[t.id]} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">{t.name}</span>
                          <span className="text-gray-500 tabular-nums">{t.weekOccupancy == null ? 'Sin horario' : `${t.weekOccupancy}%`}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${t.weekOccupancy || 0}%`, backgroundColor: colors[t.id] }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {s.customers && (
              <Section title="Clientes este mes">
                <FigureLine items={[
                  { label: 'nuevos', value: s.customers.new },
                  { label: 'repiten', value: s.customers.returning },
                  s.customers.onlineShare != null && { label: 'online', value: `${s.customers.onlineShare}%` },
                ]} />
                {s.topServices[0] && (
                  <p className="text-xs text-gray-500 mt-2">Lo más pedido: <b className="text-gray-800">{s.topServices[0].name}</b> ({s.topServices[0].share}% de lo facturado)</p>
                )}
              </Section>
            )}

            {setupDone && isManager && (
              <Section title="Tu enlace de reservas">
                <p className="text-sm text-gray-500 mb-3">Cada cita que entra por aquí es una llamada menos.</p>
                <ShareLink variant="compact" />
              </Section>
            )}
          </aside>
        </div>
      )}

      {selected && (
        <BookingDetailModal booking={selected} staffById={staffById} services={data.services} staff={staff} colors={colors} tz={tz}
          onClose={() => setSelectedId(null)} onChanged={() => load()} />
      )}
    </div>
  );
}
