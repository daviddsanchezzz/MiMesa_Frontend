import { useEffect, useRef } from 'react';
import { addDays } from '../pages/agenda/utils';
import { shortDay } from '../lib/dates';

const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const chip = (on) => `shrink-0 rounded-xl border transition-colors ${on ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400'}`;

/**
 * Two weeks of days to tap. A day picked further away ("Otro día") becomes
 * the start of the strip, and every chip says its month when it is not the
 * current one, so «30» is never ambiguous.
 */
export default function DayChips({ date, today, onChange }) {
  const inFirstTwoWeeks = date >= today && date <= addDays(today, 13);
  const start = inFirstTwoWeeks || date < today ? today : date;
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const thisMonth = today.slice(0, 7);
  const rowRef = useRef(null);
  // Keep the chosen day in view (e.g. the 12th chosen with "Otro día").
  useEffect(() => {
    const el = rowRef.current?.querySelector('[data-on="1"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [date]);

  return (
    <div>
      <div ref={rowRef} className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {date < today && !days.includes(date) && (
          <button type="button" className={`${chip(true)} px-3 py-1.5 text-center`}>
            <span className="block text-[11px] text-gray-300">{shortDay(date).weekday}</span>
            <span className="block text-sm font-semibold tabular-nums">{Number(date.slice(8))} {MONTH[Number(date.slice(5, 7)) - 1]}</span>
          </button>
        )}
        {days.map((d, i) => {
          const { weekday, day } = shortDay(d);
          const on = d === date;
          const showMonth = (i === 0 && start !== today) || (d.slice(0, 7) !== thisMonth && (i === 0 || d.slice(0, 7) !== days[i - 1].slice(0, 7)));
          const otherMonth = d.slice(0, 7) !== thisMonth;
          return (
            <button key={d} type="button" data-on={on ? '1' : undefined} onClick={() => onChange(d)} className={`${chip(on)} w-12 py-1.5 text-center`}>
              <span className={`block text-[11px] ${on ? 'text-gray-300' : 'text-gray-500'}`}>{d === today ? 'hoy' : weekday}</span>
              <span className="block text-base font-semibold tabular-nums leading-5">{day}</span>
              <span className={`block text-[10px] leading-3 h-3 ${on ? 'text-gray-300' : 'text-gray-400'}`}>{showMonth || (otherMonth && on) ? MONTH[Number(d.slice(5, 7)) - 1] : ''}</span>
            </button>
          );
        })}
      </div>
      {start !== today && (
        <button type="button" onClick={() => onChange(today)} className="mt-1 text-xs font-semibold text-gray-500 hover:text-gray-900">‹ Volver a hoy</button>
      )}
    </div>
  );
}
