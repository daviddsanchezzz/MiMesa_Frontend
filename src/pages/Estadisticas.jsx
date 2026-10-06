import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useData } from '../lib/query';
import { publicBookingUrl } from '../lib/publicUrl';
import { Empty, Hero, PageHeader } from '../ui/kit';
import PeriodNavigator, { PAGE_BODY, StickyBar, usePeriod } from '../ui/PeriodNavigator';
import { previousLabel, shiftRange } from '../lib/periods';
import { euros, waLink } from './agenda/utils';

// Estadísticas for appointment businesses (restaurants have Analytics).

const SOURCE_LABEL = { online: 'Reserva online', phone: 'Por teléfono', walk_in: 'Sin cita previa', staff: 'Creadas por el equipo' };
const WEEKDAY_FULL = { Lun: 'lunes', Mar: 'martes', Mié: 'miércoles', Jue: 'jueves', Vie: 'viernes', Sáb: 'sábado', Dom: 'domingo' };

const pad = (n) => String(n).padStart(2, '0');

/** ▲ 12 % in green when the move is good, red when not. */
function Delta({ now, before, upIsBad = false }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (!pct || Math.abs(pct) > 300) return null; // a jump that big says nothing
  const good = upIsBad ? pct < 0 : pct > 0;
  return <span className={`text-[11px] font-semibold tabular-nums ${good ? 'text-emerald-600' : 'text-rose-500'}`}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)} %</span>;
}

function Stat({ label, value, delta }) {
  return (
    <div className="min-w-0 flex-1 px-3.5 first:pl-0 last:pr-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-gray-900 truncate">{value}</p>
      <div className="mt-0.5 min-h-4">{delta}</div>
    </div>
  );
}

function Card({ title, aside, children }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Bar({ pct, color = 'bg-violet-500' }) {
  return <div className="h-2 rounded-full bg-gray-100"><div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, Math.min(100, pct))}%` }} /></div>;
}

/** Seven vertical bars, the strongest day in violet. */
function WeekdayBars({ data }) {
  const max = Math.max(...data.map((d) => d.appointments), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.day} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
          <span className="text-xs font-semibold tabular-nums text-gray-700">{d.appointments || ''}</span>
          <div className={`w-full rounded-t-lg ${d.appointments === max && max > 0 ? 'bg-violet-600' : 'bg-violet-200'}`}
            style={{ height: `${d.appointments ? Math.max(6, (d.appointments / max) * 100) : 2}%` }} />
          <span className="text-[11px] text-gray-500">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

export default function Estadisticas() {
  const { business } = useAuth();
  useSetMobileHeader({ title: 'Estadísticas' });
  const { period, dateRange, onPeriodChange, onShift, onRangeChange } = usePeriod('month');
  // Month and week compare with the one before; a custom range lets the server pick the same length right before
  const compare = period === 'custom' ? null : shiftRange(period, dateRange, -1);
  const query = `from=${dateRange.from}&to=${dateRange.to}${compare ? `&compareFrom=${compare.from}&compareTo=${compare.to}` : ''}`;
  const q = useData(['bookings', 'insights', query], () => api.get(`/bookings/insights?${query}`).then((r) => r.data), { retry: false });
  const d = q.data;
  const vsLabel = `vs ${previousLabel(period, dateRange)}`;

  const s = d?.summary;
  const p = d?.previous;
  const busiest = d && [...d.byWeekday].sort((a, b) => b.appointments - a.appointments)[0];
  const quietest = d && [...d.byWeekday].filter((x) => x.appointments > 0).sort((a, b) => a.appointments - b.appointments)[0];
  const topHours = d ? [...d.byHour].sort((a, b) => b.appointments - a.appointments).slice(0, 4) : [];
  const maxHour = topHours[0]?.appointments || 1;
  const sourceTotal = d ? d.sources.reduce((n, x) => n + x.appointments, 0) : 0;
  const empty = d && s.appointments === 0 && s.scheduled === 0;

  return (
    <div className={`w-full space-y-7 ${PAGE_BODY}`}>
      <div className="hidden lg:block"><PageHeader title="Estadísticas" subtitle="Qué servicios funcionan, cuándo vienen y quién vuelve." /></div>

      <StickyBar>
        <PeriodNavigator period={period} dateRange={dateRange} onPeriodChange={onPeriodChange} onShift={onShift} onRangeChange={onRangeChange} />
      </StickyBar>

      {q.isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {q.isError && (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500">No se han podido cargar las estadísticas.</p>
          <button type="button" onClick={() => q.refetch()} className="mt-2 text-sm font-semibold text-violet-700">Reintentar</button>
        </div>
      )}

      {d && empty && <Empty>Todavía no hay citas en este periodo.</Empty>}

      {d && !empty && (
        <div className={`space-y-8 lg:space-y-6 ${q.isFetching ? 'opacity-60' : ''}`}>
          <Hero label="Has atendido" value={s.appointments} unit={s.appointments === 1 ? 'cita' : 'citas'}
            pill={p.appointments > 0 && s.appointments !== p.appointments && Math.abs(Math.round(((s.appointments - p.appointments) / p.appointments) * 100)) <= 300 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${s.appointments > p.appointments ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {s.appointments > p.appointments ? '▲' : '▼'} {Math.abs(Math.round(((s.appointments - p.appointments) / p.appointments) * 100))} % {vsLabel}
              </span>
            )}
            stats={[
              { label: 'Facturado', value: euros(s.billed), sub: <Delta now={s.billed} before={p.billed} /> },
              { label: 'Ticket medio', value: euros(s.averageTicket), sub: <Delta now={s.averageTicket} before={p.averageTicket} /> },
              { label: 'Clientes', value: s.customers, sub: <Delta now={s.customers} before={p.customers} /> },
            ]} />

          <div className="space-y-8 xl:space-y-0 xl:grid xl:grid-cols-2 2xl:grid-cols-4 xl:gap-x-12 xl:gap-y-10 xl:items-start">
          <Card title="Servicios que más facturan">
            {d.services.length === 0 ? <p className="text-sm text-gray-500">Aún no hay servicios atendidos.</p> : (
              <ul className="space-y-3.5">
                {d.services.map((x) => (
                  <li key={x.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[15px] font-medium text-gray-900">{x.name}</span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">{euros(x.revenue)}</span>
                    </div>
                    <div className="mt-1.5"><Bar pct={x.share} /></div>
                    <p className="mt-1 text-xs text-gray-500">{x.count} {x.count === 1 ? 'vez' : 'veces'} · {x.share} % de lo facturado</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Cuándo tienes más citas">
            <WeekdayBars data={d.byWeekday} />
            {busiest?.appointments > 0 && (
              <p className="mt-3 text-[15px] leading-6 text-gray-600">
                Tu día fuerte es el <b className="text-gray-900">{WEEKDAY_FULL[busiest.day]}</b>
                {quietest && quietest.day !== busiest.day && <>, y el más tranquilo el <b className="text-gray-900">{WEEKDAY_FULL[quietest.day]}</b></>}.
              </p>
            )}
            {topHours.length > 0 && (
              <>
                <p className="mt-5 mb-1 text-xs font-semibold text-gray-500">Horas con más citas</p>
                <ul className="divide-y divide-gray-100">
                  {topHours.map((h) => (
                    <li key={h.hour} className="flex items-center gap-3 py-2.5">
                      <span className="w-14 shrink-0 text-sm tabular-nums text-gray-700">{pad(h.hour)}:00</span>
                      <span className="flex-1"><Bar pct={(h.appointments / maxHour) * 100} color="bg-emerald-500" /></span>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">{h.appointments}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card title="Tus clientes">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-3xl font-semibold tabular-nums text-gray-900">{d.customers.total}</p>
              <span className="text-sm text-gray-500">{d.customers.total === 1 ? 'cliente distinto' : 'clientes distintos'}</span>
            </div>
            {d.customers.total > 0 && (
              <>
                <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <span className="bg-emerald-500" style={{ width: `${(d.customers.returning / d.customers.total) * 100}%` }} />
                  <span className="bg-violet-300" style={{ width: `${(d.customers.new / d.customers.total) * 100}%` }} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><b className="tabular-nums">{d.customers.returning}</b><span className="text-gray-500">ya venían</span></span>
                  <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-violet-300" /><b className="tabular-nums">{d.customers.new}</b><span className="text-gray-500">nuevos</span></span>
                </div>
              </>
            )}
            {d.customers.lapsed.count > 0 && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                <p className="text-[15px] font-semibold text-gray-900">{d.customers.lapsed.count} {d.customers.lapsed.count === 1 ? 'cliente lleva' : 'clientes llevan'} tiempo sin volver</p>
                <p className="text-[13px] text-gray-600">Un mensaje a tiempo suele traerlos de vuelta.</p>
                <ul className="mt-2 divide-y divide-amber-100">
                  {d.customers.lapsed.top.map((c) => {
                    const wa = waLink(c.phone, `¡Hola ${c.name.split(' ')[0]}! Hace tiempo que no te vemos por ${business?.name}. ¿Te reservo cita? Puedes elegir hora aquí: ${publicBookingUrl(business)}`);
                    return (
                      <li key={`${c.name}-${c.daysSince}`} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500">Hace {c.daysSince} días · {c.visits} {c.visits === 1 ? 'visita' : 'visitas'}</p>
                        </div>
                        {wa ? <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#25D366] text-white">WhatsApp</a>
                          : <span className="text-xs text-gray-400">Sin teléfono</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Cancelaciones y origen">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Canceladas</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900">{d.cancellations.cancelled}</p>
                <p className="text-xs text-gray-500">{d.cancellations.cancelledRate} % de las citas</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">No vinieron</p>
                <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${d.cancellations.noShow ? 'text-amber-600' : 'text-gray-900'}`}>{d.cancellations.noShow}</p>
                <p className="text-xs text-gray-500">{d.cancellations.noShowRate} % de las citas</p>
              </div>
            </div>
            {sourceTotal > 0 && (
              <>
                <p className="mt-5 mb-1 text-xs font-semibold text-gray-500">De dónde vienen las citas</p>
                <ul className="space-y-3 pt-1">
                  {d.sources.filter((x) => x.appointments > 0).sort((a, b) => b.appointments - a.appointments).map((x) => (
                    <li key={x.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] text-gray-800">{SOURCE_LABEL[x.key]}</span>
                        <span className="text-sm tabular-nums text-gray-500"><b className="text-gray-900">{x.appointments}</b> · {Math.round((x.appointments / sourceTotal) * 100)} %</span>
                      </div>
                      <div className="mt-1.5"><Bar pct={(x.appointments / sourceTotal) * 100} color="bg-sky-500" /></div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}
