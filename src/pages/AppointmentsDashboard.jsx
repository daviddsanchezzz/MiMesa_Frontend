import { useEffect, useMemo, useState } from 'react';
import { publicBookingUrl } from '../lib/publicUrl';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import ShareLink from './agenda/ShareLink';
import StaffAvatar from './agenda/StaffAvatar';
import {
  DEFAULT_TZ, STATUS, btnPrimary, btnSecondary, euros, longDate, timeInTz, todayIn, addDays,
  staffColors, toHHMM, waLink, pluralize,
} from './agenda/utils';

const card = 'bg-white rounded-2xl border border-gray-200';

function greeting(name) {
  const h = new Date().getHours();
  const hello = h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  const first = /[a-zA-ZÀ-ÿ]/.test(name || '') ? name.trim().split(/\s+/)[0] : '';
  return first ? `${hello}, ${first}` : hello;
}

function Kpi({ label, value, hint, tone = 'default' }) {
  const tones = { default: 'text-gray-900', good: 'text-emerald-600', warn: 'text-amber-600' };
  return (
    <div className={`${card} px-4 py-3.5`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

// Neutral line icons (any sector: salon, clinic, studio…), tinted like their action.
const ICON_PATHS = {
  clock: 'M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  slot: 'M8 2v4m8-4v4M3 10h18M12 14v4m-2-2h4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
};
const ICON_TINT = {
  clock: 'bg-amber-50 text-amber-600',
  slot: 'bg-violet-50 text-violet-600',
  people: 'bg-emerald-50 text-emerald-600',
  calendar: 'bg-gray-100 text-gray-500',
};

function ActionRow({ icon, children, action }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ICON_TINT[icon]}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d={ICON_PATHS[icon]} /></svg>
      </span>
      <div className="min-w-0 flex-1 text-sm text-gray-800">{children}</div>
      {action}
    </li>
  );
}

const pill = 'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg';

/**
 * Home for appointment businesses: how today looks, what to do now, what
 * Vetra did for the business this month and how the team is doing.
 */
export default function AppointmentsDashboard() {
  const { business, hasRole, session } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const isManager = hasRole('manager');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [showOverdue, setShowOverdue] = useState(false);

  useSetMobileHeader({ title: business?.name || 'Inicio' });

  useEffect(() => {
    const load = () => Promise.all([
      bookingsApi.stats(),
      bookingsApi.list({ from: today, to: today }),
      bookingsApi.resources(),
      bookingsApi.services(),
      bookingsApi.schedule(),
    ])
      .then(([stats, bookings, resources, services, schedule]) => setData({ stats, bookings, resources, services, schedule }))
      .catch((err) => setError(apiError(err)));
    load();
    const tick = setInterval(() => setNow(Date.now()), 60000);
    const refresh = setInterval(load, 5 * 60000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, [today]);

  const colors = useMemo(() => staffColors(data?.resources), [data]);
  const staffById = useMemo(() => Object.fromEntries((data?.resources || []).map((r) => [r._id, r])), [data]);

  if (error) return <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>;

  const s = data?.stats;
  const upcoming = (data?.bookings || [])
    .filter((b) => !['cancelled', 'no_show', 'completed'].includes(b.status) && new Date(b.end).getTime() > now)
    .slice(0, 6);
  const setup = data && {
    staff: data.resources.some((r) => r.kind === 'staff'),
    services: data.services.length > 0,
    hours: (data.schedule?.rules || []).length > 0,
  };
  const setupDone = setup && setup.staff && setup.services && setup.hours;
  const revenueDelta = s?.money && s.money.previousRevenue > 0
    ? Math.round(((s.money.revenue - s.money.previousRevenue) / s.money.previousRevenue) * 100)
    : null;
  const pendingNext = s?.actions.pendingRequests.next;
  const pendingDate = pendingNext
    ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(pendingNext.start))
    : today;
  const actions = s ? [
    s.actions.pendingRequests.count > 0 && {
      key: 'pending', icon: 'clock',
      text: <><b>{pluralize(s.actions.pendingRequests.count, 'solicitud online', 'solicitudes online')}</b> por aprobar</>,
      action: <Link to={`/agenda?date=${pendingDate}`} className={`${pill} bg-amber-100 text-amber-800 hover:bg-amber-200`}>Revisar</Link>,
    },
    ...s.actions.freeGapsToday.slice(0, 2).map((g) => ({
      key: `gap-${g.resourceId}-${g.startMin}`, icon: 'slot',
      text: <>Hueco libre hoy <b>{toHHMM(g.startMin)}–{toHHMM(g.endMin)}</b> con {g.name}</>,
      action: <Link to={`/agenda?new=1&date=${today}&time=${toHHMM(g.startMin)}&staff=${g.resourceId}`} className={`${pill} bg-violet-50 text-violet-700 hover:bg-violet-100`}>Dar cita</Link>,
    })),
    s.actions.overdueCustomers.count > 0 && {
      key: 'overdue', icon: 'people',
      text: <><b>{pluralize(s.actions.overdueCustomers.count, 'cliente debería', 'clientes deberían')}</b> haber vuelto ya</>,
      action: <button type="button" onClick={() => setShowOverdue((v) => !v)} className={`${pill} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>{showOverdue ? 'Ocultar' : 'Ver quiénes'}</button>,
    },
    s.tomorrow.appointments > 0 && {
      key: 'tomorrow', icon: 'calendar',
      text: <>Mañana tienes <b>{pluralize(s.tomorrow.appointments, 'cita', 'citas')}</b>, la primera a las {timeInTz(s.tomorrow.firstStart, tz)}</>,
      action: <Link to={`/agenda?date=${addDays(today, 1)}`} className={`${pill} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Ver</Link>,
    },
  ].filter(Boolean) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {business?.logoUrl && <img src={business.logoUrl} alt="" className="w-11 h-11 rounded-xl object-contain bg-white border border-gray-200 p-1 shrink-0" />}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{greeting(session?.user?.name)}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{longDate(today)}<span className="hidden xl:inline"> · {business?.name}</span></p>
          </div>
        </div>
        <div className="hidden xl:flex gap-2">
          <Link to="/agenda" className={btnSecondary}>Ver agenda</Link>
          <Link to="/agenda?new=1" className={btnPrimary}>Nueva cita</Link>
        </div>
      </div>

      {!data && <p className="text-sm text-gray-400">Cargando…</p>}

      {setup && !setupDone && (
        <section className={`${card} border-violet-200 p-5 space-y-3`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Prepara tu agenda</h3>
              <p className="text-sm text-gray-500">Tres pasos y podrás empezar a dar citas.</p>
            </div>
            {isManager && <Link to="/bienvenida" className={btnPrimary}>Hacerlo paso a paso</Link>}
          </div>
          <ol className="space-y-2">
            {[
              ['staff', 'Añade a tus profesionales', 'profesionales'],
              ['hours', 'Define tu horario de apertura', 'horario'],
              ['services', 'Crea tus servicios con su duración y precio', 'servicios'],
            ].map(([key, label, tab], i) => (
              <li key={key} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  setup[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {setup[key] ? '✓' : i + 1}
                </span>
                <span className={`text-sm flex-1 ${setup[key] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{label}</span>
                {!setup[key] && isManager && (
                  <Link to={`/configuracion?tab=${tab}`} className="text-sm font-semibold text-violet-600 hover:text-violet-800">Configurar</Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Citas hoy" value={s.today.appointments}
            hint={s.today.appointments ? (s.today.remaining ? `${pluralize(s.today.remaining, 'queda', 'quedan')} por delante` : 'Todas atendidas') : (s.tomorrow.appointments ? `Mañana: ${s.tomorrow.appointments}` : 'Día tranquilo')} />
          {s.restricted ? (
            <Kpi label="Mañana" value={s.tomorrow.appointments} hint={s.tomorrow.firstStart ? `La primera a las ${timeInTz(s.tomorrow.firstStart, tz)}` : 'Sin citas todavía'} />
          ) : (
            <Kpi label="Previsto hoy" value={euros(s.today.expectedRevenue)} hint={s.week.expectedRevenue ? `${euros(s.week.expectedRevenue)} en 7 días` : null} />
          )}
          <Kpi label="Ocupación 7 días" value={s.week.occupancy == null ? '—' : `${s.week.occupancy}%`}
            hint={s.week.occupancy == null ? 'Define tu horario' : `${pluralize(s.week.freeHours, 'hora libre', 'horas libres')}`} />
          {s.restricted ? (
            <Kpi label="Esta semana" value={s.week.appointments} hint="citas en los próximos 7 días" />
          ) : (
            <Kpi label="Reservado online este mes" value={euros(s.money.onlineBookings.amount)} tone={s.money.onlineBookings.count ? 'good' : 'default'}
              hint={s.money.onlineBookings.count ? `${pluralize(s.money.onlineBookings.count, 'cita', 'citas')} sin coger el teléfono` : 'Comparte tu enlace'} />
          )}
        </div>
      )}

      {s && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: what to do + today's list */}
          <div className="lg:col-span-3 space-y-5">
            <section className={`${card} p-5`}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Para hacer ahora</h3>
              {actions.length === 0 ? (
                <p className="text-sm text-gray-500">Todo al día. 🎉 Nada pendiente por ahora.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {actions.map((a) => <ActionRow key={a.key} icon={a.icon} action={a.action}>{a.text}</ActionRow>)}
                </ul>
              )}
              {showOverdue && s.actions.overdueCustomers.top.length > 0 && (
                <ul className="mt-3 rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
                  {s.actions.overdueCustomers.top.map((c) => {
                    const wa = waLink(c.phone, `¡Hola ${c.name.split(' ')[0]}! Hace tiempo que no te vemos por ${business?.name}. ¿Te reservo cita? Puedes elegir hora aquí: ${publicBookingUrl(business)}`);
                    return (
                      <li key={`${c.name}-${c.lastVisit}`} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500">Última visita hace {c.daysSince} días · {pluralize(c.visits, 'visita', 'visitas')}</p>
                        </div>
                        {wa
                          ? <a href={wa} target="_blank" rel="noreferrer" className={`${pill} bg-[#25D366] text-white hover:brightness-95`}>WhatsApp</a>
                          : <span className="text-xs text-gray-400">Sin teléfono</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className={card}>
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Próximas citas de hoy</h3>
                <Link to="/agenda" className="text-xs font-semibold text-violet-600 hover:text-violet-800">Abrir agenda</Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">{s.today.appointments ? 'No quedan citas para hoy.' : 'Hoy no tienes citas.'}</p>
                  {s.tomorrow.appointments > 0 && (
                    <p className="text-sm text-gray-400 mt-1">Mañana tienes {pluralize(s.tomorrow.appointments, 'cita', 'citas')}, la primera a las {timeInTz(s.tomorrow.firstStart, tz)}.</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcoming.map((b) => {
                    const st = STATUS[b.status] || STATUS.confirmed;
                    const staffIds = [...new Set(b.segments.flatMap((seg) => seg.resourceIds || []))].filter((id) => staffById[id]?.kind === 'staff');
                    const first = staffById[staffIds[0]];
                    return (
                      <li key={b._id} className="px-5 py-3 flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums w-11 shrink-0">{timeInTz(b.start, tz)}</span>
                        <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colors[staffIds[0]] || '#d1d5db' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {b.segments.map((seg) => seg.serviceName).join(' + ')}{first && ` · ${staffIds.map((id) => staffById[id]?.name).join(', ')}`}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right: money, team, customers */}
          <div className="lg:col-span-2 space-y-5">
            {s.money && (
            <section className={`${card} p-5`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Este mes</h3>
                {revenueDelta != null && Math.abs(revenueDelta) <= 300 && (
                  <span className={`text-xs font-semibold ${revenueDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {revenueDelta >= 0 ? '▲' : '▼'} {Math.abs(revenueDelta)}% vs mes pasado
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{euros(s.money.revenue)}</p>
              <p className="text-xs text-gray-400">
                facturado en citas atendidas{s.money.previousRevenue > 0 && ` · mes pasado a estas alturas: ${euros(s.money.previousRevenue)}`}
              </p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-5 mb-2">Lo que Vetra ha hecho por ti</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Reservadas online, sin llamadas</dt>
                  <dd className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">{s.money.onlineBookings.count} · {euros(s.money.onlineBookings.amount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Recibieron recordatorio y vinieron</dt>
                  <dd className="font-semibold text-gray-900 tabular-nums whitespace-nowrap">{s.money.remindedAttended.count} · {euros(s.money.remindedAttended.amount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Cancelaron con tiempo (hueco libre)</dt>
                  <dd className="font-semibold text-gray-900 tabular-nums">{s.money.cancelledInTime.count}</dd>
                </div>
                <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
                  <dt className="text-gray-600">No vinieron</dt>
                  <dd className={`font-semibold tabular-nums whitespace-nowrap ${s.money.noShows.count ? 'text-rose-600' : 'text-gray-900'}`}>
                    {s.money.noShows.count}{s.money.noShows.amount ? ` · −${euros(s.money.noShows.amount)}` : ''}
                  </dd>
                </div>
              </dl>
            </section>
            )}

            {s.team.length > 0 && (
              <section className={`${card} p-5`}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Equipo</h3>
                <ul className="space-y-3.5">
                  {s.team.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <StaffAvatar name={t.name} photo={staffById[t.id]?.photo} color={colors[t.id]} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">{t.name}</span>
                          {t.revenue !== undefined && <span className="text-gray-500 tabular-nums whitespace-nowrap">{euros(t.revenue)} este mes</span>}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.weekOccupancy || 0}%`, backgroundColor: colors[t.id] }} />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-24 text-right">{t.weekOccupancy == null ? 'Sin horario' : `${t.weekOccupancy}% ocupada`}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-gray-400 mt-3">Ocupación de los próximos 7 días.</p>
              </section>
            )}

            {s.customers && (
            <section className={`${card} p-5`}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Clientes este mes</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 py-2.5"><p className="text-xl font-bold text-gray-900">{s.customers.new}</p><p className="text-[11px] text-gray-500">Nuevos</p></div>
                <div className="rounded-xl bg-gray-50 py-2.5"><p className="text-xl font-bold text-gray-900">{s.customers.returning}</p><p className="text-[11px] text-gray-500">Repiten</p></div>
                <div className="rounded-xl bg-gray-50 py-2.5"><p className="text-xl font-bold text-gray-900">{s.customers.onlineShare == null ? '—' : `${s.customers.onlineShare}%`}</p><p className="text-[11px] text-gray-500">Reservan online</p></div>
              </div>
              {s.topServices[0] && (
                <p className="text-xs text-gray-500 mt-3">Servicio estrella: <b className="text-gray-800">{s.topServices[0].name}</b> ({s.topServices[0].share}% de lo facturado)</p>
              )}
            </section>
            )}
          </div>
        </div>
      )}

      {setupDone && isManager && (
        <section className={`${card} p-5`}>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Consigue más reservas online</h3>
            <p className="text-sm text-gray-500 mt-0.5">Cada cita que entra por tu enlace es una llamada menos. Compártelo por WhatsApp o pon el cartel con el QR en el mostrador.</p>
          </div>
          <ShareLink variant="compact" />
        </section>
      )}
    </div>
  );
}
