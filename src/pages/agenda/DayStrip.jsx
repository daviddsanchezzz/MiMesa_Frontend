import { useRef } from 'react';
import { addDays, dayOfWeek, weekStart } from './utils';

const LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Week strip to move around the agenda: L 29 · M 30 · X 1 … with a dot on the
 * days that have appointments. Arrows move a week; the calendar icon jumps
 * anywhere.
 */
export default function DayStrip({ date, today, counts = {}, onChange, closedDays = new Set() }) {
  const from = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const pickerRef = useRef(null);
  const [y, m] = date.split('-').map(Number);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-2 sm:p-2.5">
      <div className="flex items-center justify-between px-1.5 pb-1.5">
        <span className="text-sm font-semibold text-gray-900 capitalize">{MONTHS[m - 1]} {y}</span>
        <div className="flex items-center gap-1">
          {date !== today && (
            <button type="button" onClick={() => onChange(today)} className="text-xs font-semibold text-violet-700 px-2.5 py-1 rounded-lg hover:bg-violet-50">Hoy</button>
          )}
          <button type="button" aria-label="Semana anterior" onClick={() => onChange(addDays(date, -7))}
            className="w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center">‹</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => onChange(addDays(date, 7))}
            className="w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center">›</button>
          <label className="relative w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer" aria-label="Elegir fecha">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" /></svg>
            <input ref={pickerRef} type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)}
              onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* ignore */ } }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const selected = d === date;
          const isToday = d === today;
          const n = counts[d] || 0;
          const closed = closedDays.has(d);
          return (
            <button key={d} type="button" onClick={() => onChange(d)}
              className={`rounded-xl py-1.5 flex flex-col items-center gap-0.5 transition-colors ${
                selected ? 'bg-violet-600 text-white shadow-sm' : isToday ? 'bg-violet-50 text-violet-800' : closed ? 'text-gray-300 hover:bg-gray-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span className={`text-[11px] font-medium ${selected ? 'text-violet-100' : ''}`}>{LETTER[dayOfWeek(d)]}</span>
              <span className="text-base font-bold tabular-nums leading-none">{Number(d.slice(8))}</span>
              <span className={`text-[10px] leading-none h-3 tabular-nums ${selected ? 'text-violet-100' : 'text-gray-400'}`}>
                {n ? n : closed ? '·' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
