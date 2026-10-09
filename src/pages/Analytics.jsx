import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useData } from '../lib/query';
import { dateShort } from '../lib/format';
import { Hero, Section, Segmented } from '../ui/kit';
import Page from '../ui/Page';

const PERIODS = [[7, '7 días'], [30, '30 días'], [90, '90 días']];


/** "+12 % que los 30 días anteriores" in green or red (up is good unless `upIsBad`). */
function Trend({ value, period, upIsBad = false }) {
  if (value === null || value === undefined) return null;
  if (value === 0) return <span className="text-gray-400">igual que los {period} días anteriores</span>;
  const good = upIsBad ? value < 0 : value > 0;
  return (
    <span className={good ? 'text-emerald-600' : 'text-rose-600'}>
      {value > 0 ? '▲' : '▼'} {Math.abs(value)} % que los {period} días anteriores
    </span>
  );
}

const nf = (n, digits = 1) => Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: digits });

/** "▼ 54 % vs 30 días anteriores" as a small pill (up is good unless `upIsBad`). */
function TrendPill({ value, period }) {
  if (value === null || value === undefined || value === 0) return null;
  const good = value > 0;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
      {value > 0 ? '▲' : '▼'} {nf(Math.abs(value), 0)} % vs {period} días anteriores
    </span>
  );
}

/** Reservations per day: thin bars, the busiest day darker, a light baseline. */
function DayBars({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const step = data.length <= 10 ? 1 : data.length <= 20 ? 3 : data.length <= 45 ? 7 : 14;
  return (
    <div>
      <div className="flex items-end gap-[2px] h-36 border-b border-gray-200">
        {data.map((d) => (
          <div key={d.date} title={`${dateShort(d.date)}: ${d.total} reservas`}
            className="flex-1 rounded-t-[3px] min-w-0"
            style={{ height: `${d.total ? Math.max(3, (d.total / max) * 100) : 0}%`, backgroundColor: d.total === max ? '#7c3aed' : '#c4b5fd' }} />
        ))}
      </div>
      <div className="flex mt-1.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 min-w-0 text-center">
            {i % step === 0 && <span className="text-[10px] text-gray-400 whitespace-nowrap">{dateShort(d.date)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** One line of a ranking: label, thin bar, number. */
function BarRow({ label, value, max, color = '#8b5cf6' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-14 shrink-0 text-sm text-gray-700 tabular-nums">{label}</span>
      <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">{value}</span>
    </li>
  );
}

export default function Estadisticas() {
  const [period, setPeriod] = useState(30);
  const q = useData(['analytics', 'overview', period], () => api.get(`/analytics/overview?period=${period}`).then((r) => r.data), { retry: false });
  const data = q.data || null;
  const error = q.error ? (q.error?.response?.status === 403 ? 'upgrade' : 'generic') : null;
  const loading = q.isLoading;

  const s = data?.summary;
  const t = data?.trend;
  const peakHours = data?.peakHours || [];
  const busyWeekdays = data?.busyWeekdays || [];
  const daily = data?.reservationsByDay || [];
  const cm = data?.customerMix;
  const occ = data?.occupancyEstimated;
  const peakDay = daily.length ? daily.reduce((a, b) => (a.total >= b.total ? a : b)) : null;

  return (
    <Page title="Estadísticas"
      subtitle={data?.range ? `Del ${dateShort(data.range.from)} al ${dateShort(data.range.to)}` : 'Cómo van las reservas'}
      toolbar={<Segmented full value={period} onChange={setPeriod} options={PERIODS} />}>

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}

      {!loading && error === 'upgrade' && (
        <div className="py-12 text-center max-w-sm mx-auto">
          <p className="text-base font-semibold text-gray-900">Disponible en el plan Pro</p>
          <p className="text-sm text-gray-500 mt-1">Tendencias, ocupación y quién repite, para decidir con datos.</p>
          <Link to="/configuracion?tab=suscripcion" className="inline-flex mt-4 h-10 px-4 items-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">Ver planes</Link>
        </div>
      )}

      {!loading && error === 'generic' && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">No se han podido cargar las estadísticas.</p>
          <button type="button" onClick={() => q.refetch()} className="mt-2 text-sm font-semibold text-violet-700">Reintentar</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <Hero label="Reservas" value={s.totalReservations} pill={<TrendPill value={t?.totalReservations} period={period} />}
            bar={s.totalReservations > 0 ? {
              segments: [
                { label: 'Confirmadas', text: `${s.confirmed} · ${Math.round((s.confirmed / s.totalReservations) * 100)} %`, value: s.confirmed, color: '#10b981' },
                { label: 'Canceladas', text: `${s.cancellations} · ${nf(s.cancelRatePct)} %`, value: s.cancellations, color: '#fb7185' },
                ...(s.noShows ? [{ label: 'No vinieron', text: s.noShows, value: s.noShows, color: '#f59e0b' }] : []),
              ],
            } : null}
            stats={[
              { label: 'Comensales', value: s.totalCovers, sub: 'en total' },
              { label: 'Por reserva', value: nf(s.avgPartySize), sub: 'personas de media' },
              ...(s.theforkReservations ? [{ label: 'De TheFork', value: s.theforkReservations, sub: `${Math.round((s.theforkReservations / s.totalReservations) * 100)} %` }] : []),
            ]} />

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-12 gap-y-9 items-start">
            <Section title="Reservas por día"
              aside={peakDay && peakDay.total > 0 && <span className="text-xs text-gray-500">El día con más: {dateShort(peakDay.date)} · {peakDay.total}</span>}>
              {daily.some((d) => d.total > 0)
                ? <div className="pt-2"><DayBars data={daily} /></div>
                : <p className="py-8 text-sm text-gray-500">Sin reservas en este período.</p>}
            </Section>

            <div className="space-y-9">
              {occ && (
                <Section title="Ocupación media">
                  <p className="text-3xl font-semibold tabular-nums text-gray-900">{occ.avgPct} %</p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, occ.avgPct)}%`, backgroundColor: occ.avgPct >= 80 ? '#e11d48' : occ.avgPct >= 50 ? '#f59e0b' : '#8b5cf6' }} />
                  </div>
                  <p className="text-[13px] text-gray-500 mt-2">{occ.slotsMeasured} franjas medidas · máximo {occ.maxPeoplePerSlot} personas por franja</p>
                </Section>
              )}

              {cm && cm.distinctCustomers > 0 && (
                <Section title="Clientes">
                  <p className="text-3xl font-semibold tabular-nums text-gray-900">{cm.distinctCustomers} <span className="text-sm font-normal text-gray-500">distintos</span></p>
                  <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-gray-100">
                    <div style={{ width: `${cm.recurrentPct}%`, backgroundColor: '#10b981' }} />
                    <div style={{ width: `${cm.newPct}%`, backgroundColor: '#c4b5fd' }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><b className="tabular-nums">{cm.recurrentCustomers}</b><span className="text-gray-500">repiten ({cm.recurrentPct} %)</span></span>
                    <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-violet-300" /><b className="tabular-nums">{cm.newCustomers}</b><span className="text-gray-500">nuevos ({cm.newPct} %)</span></span>
                  </div>
                </Section>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-9">
            {peakHours.length > 0 && (
              <Section title="Horas con más reservas">
                <ul className="divide-y divide-gray-100">
                  {peakHours.slice(0, 8).map((h) => <BarRow key={h.time} label={h.time} value={h.reservations} max={peakHours[0].reservations} />)}
                </ul>
              </Section>
            )}
            {busyWeekdays.length > 0 && (
              <Section title="Por día de la semana">
                <ul className="divide-y divide-gray-100">
                  {busyWeekdays.map((d) => (
                    <BarRow key={d.day} label={d.day} value={d.reservations} color="#10b981"
                      max={Math.max(...busyWeekdays.map((x) => x.reservations), 1)} />
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
