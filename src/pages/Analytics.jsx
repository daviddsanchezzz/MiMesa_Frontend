import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, trendLabel, color = 'violet', icon }) {
  const colors = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'text-violet-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    icon: 'text-rose-500'    },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-500'   },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     icon: 'text-sky-500'     },
  };
  const c = colors[color] || colors.violet;

  const trendPositive = trend > 0;
  const trendNeutral  = trend === 0 || trend === null || trend === undefined;
  // For cancellations/no-show: up is bad (rose), for reservations: up is good (emerald)
  const trendColor = trendNeutral
    ? 'text-gray-400'
    : trendPositive ? 'text-emerald-600' : 'text-rose-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          {trendNeutral ? (
            <span className="text-gray-400">— Sin cambios</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${trendPositive ? '' : 'rotate-180'}`}>
                <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06L7.25 11.44V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
              </svg>
              <span>{Math.abs(trend)}% vs {trendLabel || 'período anterior'}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart (CSS) ─────────────────────────────────────────────────────────
function BarChart({ data, chartHeight = 120 }) {
  if (!data || data.length === 0) return <p className="text-xs text-gray-400 py-8 text-center">Sin datos</p>;

  const max = Math.max(...data.map(d => d.total), 1);
  // Show label every N bars to avoid overlap
  const step = data.length <= 10 ? 1 : data.length <= 20 ? 2 : data.length <= 45 ? 5 : 10;

  return (
    <div>
      <div className="flex items-end gap-px w-full" style={{ height: chartHeight }}>
        {data.map((d, i) => {
          const pct = Math.max(4, Math.round((d.total / max) * 100));
          const isPeak = d.total === max;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.total} reservas`}
              className="flex-1 rounded-t-sm transition-all cursor-default"
              style={{
                height: `${pct}%`,
                backgroundColor: isPeak ? '#7c3aed' : '#ddd6fe',
              }}
            />
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex w-full mt-1.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center" style={{ minWidth: 0 }}>
            {i % step === 0 && (
              <span className="text-[9px] text-gray-400 leading-none">{d.date.slice(5)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar ──────────────────────────────────────────────────────────
function HBar({ label, value, max, accent = 'bg-violet-500', sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-14 shrink-0 font-medium tabular-nums">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${accent} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right shrink-0 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-gray-300 w-8 shrink-0">{sub}</span>}
    </div>
  );
}

// ─── Section shell ────────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────
const PERIODS = [
  { value: 7,  label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcoBookmark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5V14a.5.5 0 0 1-.77.42L8 11.13 2.77 14.42A.5.5 0 0 1 2 14V2.5Z" />
  </svg>
);
const IcoX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
  </svg>
);
const IcoUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
  </svg>
);
const IcoPeople = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1.866 14c-.34-.592-.866-1.396-.866-2 0-1.74 1.006-3.16 2.572-4a5.98 5.98 0 0 0-.572 2.5c0 .618.089 1.211.25 1.773a1.27 1.27 0 0 1-.284-.273ZM13.134 14c.34-.592.866-1.396.866-2 0-1.74-1.006-3.16-2.572-4 .376.769.572 1.611.572 2.5 0 .618-.089 1.211-.25 1.773a1.27 1.27 0 0 0 .284-.273Z" />
  </svg>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Estadisticas() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/analytics/overview?period=${period}`)
      .then(r => setData(r.data))
      .catch(err => setError(err?.response?.status === 403 ? 'upgrade' : 'generic'))
      .finally(() => setLoading(false));
  }, [period]);

  const s = data?.summary;
  const t = data?.trend;
  const peakHours    = data?.peakHours || [];
  const busyWeekdays = data?.busyWeekdays || [];
  const daily        = data?.reservationsByDay || [];
  const cm           = data?.customerMix;
  const occ          = data?.occupancyEstimated;

  const trendLabel = `${period}d anteriores`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Estadísticas</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.range ? `${data.range.from} — ${data.range.to}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-32 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && error === 'upgrade' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-violet-500">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">Disponible en el plan Pro</p>
          <p className="text-sm text-gray-400 mb-5">Desbloquea estadísticas avanzadas para ver tendencias, ocupación y análisis de clientes.</p>
          <Link to="/configuracion?tab=subscription" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            Ver planes
          </Link>
        </div>
      )}

      {!loading && error === 'generic' && (
        <div className="py-16 text-center text-sm text-gray-400">Error al cargar los datos. Inténtalo de nuevo.</div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Reservas"
              value={s.totalReservations}
              sub={`${s.totalCovers} comensales`}
              trend={t.totalReservations}
              trendLabel={trendLabel}
              color="violet"
              icon={<IcoBookmark />}
            />
            <KpiCard
              label="Confirmadas"
              value={s.confirmed}
              sub={`${s.totalReservations > 0 ? Math.round((s.confirmed / s.totalReservations) * 100) : 0}% del total`}
              color="emerald"
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>}
            />
            <KpiCard
              label="Cancelaciones"
              value={s.cancellations}
              sub={`${s.cancelRatePct}% de baja`}
              trend={t.cancellations !== 0 ? -t.cancellations : 0}
              trendLabel={trendLabel}
              color="rose"
              icon={<IcoX />}
            />
            <KpiCard
              label="No-show"
              value={s.noShows}
              sub={`Media ${s.avgPartySize} personas/reserva`}
              trend={t.noShows !== 0 ? -t.noShows : 0}
              trendLabel={trendLabel}
              color="amber"
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" /></svg>}
            />
          </div>

          {/* Daily chart + occupancy */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <Section title={`Reservas por día (${period}d)`}>
                {daily.length > 0 ? (
                  <>
                    <BarChart data={daily} chartHeight={120} />
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 shrink-0" />
                        <span className="text-xs text-gray-500">Día pico</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-violet-200 shrink-0" />
                        <span className="text-xs text-gray-500">Resto de días</span>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">
                        Pico: {daily.reduce((a, b) => a.total > b.total ? a : b).total} reservas
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Sin reservas en este período</p>
                )}
              </Section>
            </div>

            <div className="space-y-3">
              {/* Occupancy */}
              {occ && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ocupación media</p>
                  <div className="flex items-end gap-2 mb-2">
                    <p className="text-3xl font-bold text-sky-600">{occ.avgPct}%</p>
                    <p className="text-xs text-gray-400 mb-1">por franja</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${occ.avgPct >= 80 ? 'bg-rose-400' : occ.avgPct >= 50 ? 'bg-amber-400' : 'bg-sky-400'}`}
                      style={{ width: `${Math.min(100, occ.avgPct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{occ.slotsMeasured} franjas analizadas · máx {occ.maxPeoplePerSlot} pax</p>
                </div>
              )}

              {/* Customer mix */}
              {cm && cm.distinctCustomers > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Clientes</p>
                  <div className="flex items-end gap-2 mb-3">
                    <p className="text-3xl font-bold text-gray-900">{cm.distinctCustomers}</p>
                    <p className="text-xs text-gray-400 mb-1">únicos</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${cm.newPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-24 shrink-0">{cm.newCustomers} nuevos ({cm.newPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${cm.recurrentPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-24 shrink-0">{cm.recurrentCustomers} recurrentes ({cm.recurrentPct}%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Peak hours + Weekdays */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {peakHours.length > 0 && (
              <Section title="Horas pico">
                <div className="space-y-2.5">
                  {peakHours.slice(0, 8).map(h => (
                    <HBar
                      key={h.time}
                      label={h.time}
                      value={h.reservations}
                      max={peakHours[0].reservations}
                      accent="bg-violet-500"
                    />
                  ))}
                </div>
              </Section>
            )}

            {busyWeekdays.length > 0 && (
              <Section title="Actividad por día de la semana">
                <div className="space-y-2.5">
                  {busyWeekdays.map(d => (
                    <HBar
                      key={d.day}
                      label={d.day}
                      value={d.reservations}
                      max={Math.max(...busyWeekdays.map(x => x.reservations), 1)}
                      accent="bg-emerald-500"
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
