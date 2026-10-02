import { TimeRow, RowAction, StatusText } from '../../ui/kit';
import { TONES, reservationTone } from '../../lib/status';
import { toHHMM, toMinutes } from '../agenda/utils';
import { placeText, tablesOf } from './useRestaurantDay';

export const live = (r) => !['cancelled', 'no_show'].includes(r.status);
export const peopleOf = (list) => list.filter(live).reduce((s, r) => s + (Number(r.people) || 0), 0);
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** One reservation as a row: time, state line, name, people and table, one action. */
export function ReservationRow({ r, isToday, isManager, actions, onOpen, nowMin }) {
  const tone = reservationTone(r);
  const noTable = live(r) && !tablesOf(r).length;
  const visits = r.customerId?.visits || 0;
  const noShows = r.customerId?.noShowCount || 0;
  let trailing = null;
  if (r.status === 'pending' && isManager) trailing = <RowAction tone="primary" onClick={() => actions.accept(r)}>Aceptar</RowAction>;
  else if (r.status === 'confirmed' && isToday && nowMin != null && toMinutes(r.time) - nowMin <= 45) {
    trailing = <RowAction tone="good" onClick={() => actions.seat(r)}>Sentar</RowAction>;
  }
  if (!trailing && tone !== 'confirmed') trailing = <StatusText tone={tone} sector="restaurant" />;
  return (
    <TimeRow
      time={r.time}
      tone={tone}
      sector="restaurant"
      title={r.guestName}
      badge={(
        <>
          {noShows > 0 && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">{noShows === 1 ? '1 no vino' : `${noShows} no vino`}</span>}
          {visits >= 3 && !noShows && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Habitual</span>}
          {r.notes && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Tiene notas" />}
        </>
      )}
      subtitle={(
        <>
          <span className="font-medium text-gray-700">{plural(r.people, 'persona', 'personas')}</span>
          {' · '}
          <span className={noTable ? 'text-amber-700' : ''}>{placeText(r)}</span>
        </>
      )}
      trailing={trailing}
      onClick={() => onOpen(r)}
    />
  );
}

/**
 * A shift at a glance: how many people are coming at each time, coloured by
 * state, against the seats of the restaurant; the "now" mark when it is on.
 */
export function ShiftMeter({ shift, rows, seats, nowMin }) {
  // Half-hour buckets from the first to the last bookable time of the shift.
  const STEP = 30;
  const first = Math.min(shift.start, ...rows.map((r) => toMinutes(r.time)));
  const last = Math.max(shift.end, ...rows.map((r) => toMinutes(r.time)));
  const start = Math.floor(first / STEP) * STEP;
  const buckets = [];
  for (let m = start; m <= last; m += STEP) buckets.push(m);
  const times = buckets.map(toHHMM);
  const byTime = Object.fromEntries(times.map((t) => [t, { pending: 0, confirmed: 0, here: 0 }]));
  for (const r of rows.filter(live)) {
    const tone = reservationTone(r);
    const key = toHHMM(Math.floor(toMinutes(r.time) / STEP) * STEP);
    if (byTime[key] && byTime[key][tone] !== undefined) byTime[key][tone] += Number(r.people) || 0;
  }
  const totals = times.map((t) => Object.values(byTime[t]).reduce((a, b) => a + b, 0));
  const max = Math.max(12, ...totals);
  const people = peopleOf(rows);
  const share = seats ? Math.min(100, Math.round((people / seats) * 100)) : null;
  const end = buckets[buckets.length - 1] + STEP;
  const nowPct = nowMin != null && nowMin >= start && nowMin <= end ? ((nowMin - start) / (end - start)) * 100 : null;
  const labelEvery = Math.max(1, Math.ceil(times.length / 6));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 truncate">{shift.name}</p>
          <p className="text-xs text-gray-400 tabular-nums">{toHHMM(shift.start)}–{toHHMM(shift.end)}</p>
          {nowPct != null && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Ahora</span>}
        </div>
        <p className="text-sm text-gray-500 tabular-nums whitespace-nowrap">
          <b className="text-gray-900 text-base">{people}</b>{seats ? ` / ${seats}` : ''} personas
        </p>
      </div>
      <div className="relative mt-2 h-24 flex items-end gap-1">
        {times.map((t, i) => {
          const v = byTime[t];
          const total = totals[i];
          return (
            <div key={t} className="flex-1 h-full flex flex-col justify-end min-w-0" title={`${t} · ${total} personas`}>
              {total > 0 && <span className="text-[11px] font-semibold text-gray-700 tabular-nums text-center leading-4">{total}</span>}
              {total === 0 ? <div className="h-1 rounded-full bg-gray-100" /> : (
                <div className="w-full rounded-t-md overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(8, (total / max) * 78)}%` }}>
                  {['here', 'confirmed', 'pending'].map((k) => v[k] > 0 && (
                    <div key={k} style={{ height: `${(v[k] / total) * 100}%`, backgroundColor: TONES[k].color, opacity: k === 'pending' ? 0.55 : 1 }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {nowPct != null && (
          <div className="absolute inset-y-0 w-0.5 bg-gray-900/70 rounded-full pointer-events-none" style={{ left: `${nowPct}%` }} aria-hidden="true" />
        )}
      </div>
      <div className="mt-1 flex gap-1">
        {times.map((t, i) => (
          <span key={t} className="flex-1 text-[10px] text-gray-400 tabular-nums text-center min-w-0 overflow-hidden">{i % labelEvery === 0 ? t : ''}</span>
        ))}
      </div>
      {share != null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gray-900" style={{ width: `${share}%` }} />
          </div>
          <span className="text-[11px] text-gray-500 tabular-nums w-20 text-right">{share}% del aforo</span>
        </div>
      )}
    </div>
  );
}

/** Reservations grouped by shift: [{ shift, rows }] in shift order, then «Otras horas». */
export function groupByShift(list, shifts, shiftOf) {
  const groups = shifts.map((shift) => ({ shift, rows: [] }));
  const other = { shift: { name: 'Otras horas', start: 0, end: 0, times: [] }, rows: [] };
  for (const r of [...list].sort((a, b) => a.time.localeCompare(b.time))) {
    const name = shiftOf(r.time);
    const g = groups.find((x) => x.shift.name === name);
    (g || other).rows.push(r);
  }
  return [...groups, ...(other.rows.length ? [other] : [])];
}
