import { addDays, dayOfWeek, weekStart } from './utils';

const LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const iconBtn = 'w-8 h-8 shrink-0 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center';

/**
 * One compact row to move around the agenda: ‹ L 28 · M 29 · X 30 … › with the
 * number of appointments of each day, a date picker and "Hoy".
 */
export default function DayStrip({ date, today, counts = {}, onChange, closedDays = new Set(), extra = null }) {
  const from = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const [y, m] = date.split('-').map(Number);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-2 py-1.5 flex flex-wrap sm:flex-nowrap items-center gap-1.5">
      <span className="flex-1 sm:flex-none sm:hidden lg:block text-sm font-semibold text-gray-900 px-1.5 whitespace-nowrap capitalize">{MONTHS[m - 1]} {y}</span>
      <button type="button" aria-label="Semana anterior" onClick={() => onChange(addDays(date, -7))} className={iconBtn}>‹</button>
      <div className="grid grid-cols-7 gap-1 min-w-0 order-last w-full sm:order-none sm:w-auto sm:flex-1">
        {days.map((d) => {
          const selected = d === date;
          const isToday = d === today;
          const n = counts[d] || 0;
          const closed = closedDays.has(d);
          return (
            <button key={d} type="button" onClick={() => onChange(d)} title={closed ? 'Cerrado' : undefined}
              className={`h-12 sm:h-9 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5 text-sm transition-colors min-w-0 ${
                selected ? 'bg-violet-600 text-white shadow-sm'
                  : isToday ? 'bg-violet-50 text-violet-800 ring-1 ring-violet-200'
                    : closed ? 'text-gray-300 hover:bg-gray-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span className={`text-[11px] font-medium ${selected ? 'text-violet-100' : closed ? '' : 'text-gray-400'}`}>{LETTER[dayOfWeek(d)]}</span>
              <span className="font-bold tabular-nums">{Number(d.slice(8))}</span>
              {n > 0 && (
                <span className={`sm:hidden block w-1 h-1 rounded-full mt-0.5 ${selected ? 'bg-white' : 'bg-violet-400'}`} aria-hidden="true" />
              )}
              {n > 0 && (
                <span className={`hidden sm:inline-flex min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[10px] font-semibold items-center justify-center tabular-nums ${
                  selected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label="Semana siguiente" onClick={() => onChange(addDays(date, 7))} className={iconBtn}>›</button>
      <label className={`relative cursor-pointer ${iconBtn}`} aria-label="Elegir fecha" title="Elegir fecha">
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" /></svg>
        <input type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* ignore */ } }}
          className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
      <button type="button" onClick={() => onChange(today)} disabled={date === today}
        className="shrink-0 h-8 px-2.5 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:text-gray-300 disabled:hover:bg-transparent">
        Hoy
      </button>
      {extra && <div className="shrink-0 pl-1 border-l border-gray-100 ml-0.5">{extra}</div>}
    </div>
  );
}
