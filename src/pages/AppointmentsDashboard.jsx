import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import { DEFAULT_TZ, STATUS, btnPrimary, btnSecondary, euros, longDate, timeInTz, todayIn } from './agenda/utils';

/**
 * Home for appointment businesses: today's numbers, what's next and, while the
 * agenda is not set up yet, a short checklist to get there.
 */
export default function AppointmentsDashboard() {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const today = todayIn(tz);
  const isManager = hasRole('manager');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useSetMobileHeader({ title: business?.name || 'Inicio' });

  useEffect(() => {
    Promise.all([
      bookingsApi.list({ from: today, to: today }),
      bookingsApi.resources(),
      bookingsApi.services(),
      bookingsApi.schedule(),
    ])
      .then(([bookings, resources, services, schedule]) => setData({ bookings, resources, services, schedule }))
      .catch((err) => setError(apiError(err)));
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [today]);

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.bookings.filter((b) => !['cancelled', 'no_show'].includes(b.status));
    return {
      total: active.length,
      done: active.filter((b) => b.status === 'completed').length,
      pending: data.bookings.filter((b) => b.status === 'pending').length,
      revenue: active.reduce((s, b) => s + (b.totalPrice || 0), 0),
      upcoming: active.filter((b) => new Date(b.end).getTime() > now && b.status !== 'completed').slice(0, 6),
    };
  }, [data, now]);

  const staffById = useMemo(
    () => Object.fromEntries((data?.resources || []).map((r) => [r._id, r.name])),
    [data],
  );

  const setup = data && {
    staff: data.resources.some((r) => r.kind === 'staff'),
    services: data.services.length > 0,
    hours: (data.schedule?.rules || []).length > 0,
  };
  const setupDone = setup && setup.staff && setup.services && setup.hours;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{business?.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{longDate(today)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/agenda" className={btnSecondary}>Ver agenda</Link>
          <Link to="/agenda?new=1" className={btnPrimary}>Nueva cita</Link>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {setup && !setupDone && (
        <section className="bg-white rounded-2xl border border-violet-200 p-5 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Prepara tu agenda</h3>
            <p className="text-sm text-gray-500">Tres pasos y podrás empezar a dar citas.</p>
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

      {setupDone && isManager && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-violet-900">Tus clientes ya pueden reservar solos con tu enlace.</p>
          <Link to="/configuracion?tab=enlace" className="text-sm font-semibold text-violet-700 hover:text-violet-900">Ver y compartir enlace →</Link>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Citas hoy', stats.total],
            ['Completadas', stats.done],
            ['Pendientes de confirmar', stats.pending],
            ['Previsto hoy', euros(stats.revenue)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <section className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Próximas citas de hoy</h3>
            <Link to="/agenda" className="text-xs font-semibold text-violet-600 hover:text-violet-800">Abrir agenda</Link>
          </div>
          {stats.upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No quedan citas para hoy.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.upcoming.map((b) => {
                const st = STATUS[b.status] || STATUS.confirmed;
                const who = [...new Set(b.segments.flatMap((s) => s.resourceIds || []).map((id) => staffById[id]).filter(Boolean))].join(', ');
                return (
                  <li key={b._id} className="px-5 py-3 flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums w-12 shrink-0">{timeInTz(b.start, tz)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.segments.map((s) => s.serviceName).join(' + ')}{who && ` · ${who}`}
                      </p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
