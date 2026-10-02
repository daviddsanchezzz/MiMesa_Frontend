import { addDays, dayOfWeek, weekStart } from '../pages/agenda/utils';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const navBtn = 'w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent';

/**
 * Pick a day like in a calendar: the month on top, one week (L–D) at a time
 * with ‹ › to move, «Hoy» to come back and the calendar icon to jump far.
 * Past days can't be chosen. No sideways scrolling, no guessing the month.
 */
export default function DayChips({ date, today, onChange }) {
  const monday = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const [y, m] = days[3].split('-').map(Number); // the month of the week's Thursday
  const canGoBack = monday > today;
  const go = (n) => {
    const target = addDays(date, n);
    onChange(target < today ? today : target);
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-2">
      <div className="flex items-center gap-1 px-1">
        <p className="flex-1 text-sm font-semibold text-gray-900">{MONTHS[m - 1]} {y}</p>
        {date !== today && (
          <button type="button" onClick={() => onChange(today)} className="h-9 px-2.5 rounded-full text-xs font-semibold text-violet-700 hover:bg-violet-50">Hoy</button>
        )}
        <label className={`relative cursor-pointer ${navBtn}`} title="Elegir fecha" aria-label="Elegir fecha">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" /></svg>
          <input type="date" value={date} min={today} onChange={(e) => e.target.value && onChange(e.target.value < today ? today : e.target.value)}
            onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* ignore */ } }}
            className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <button type="button" onClick={() => go(-7)} disabled={!canGoBack} className={navBtn} aria-label="Semana anterior">‹</button>
        <button type="button" onClick={() => go(7)} className={navBtn} aria-label="Semana siguiente">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {days.map((d) => {
          const past = d < today;
          const on = d === date;
          const isToday = d === today;
          const otherMonth = Number(d.slice(5, 7)) !== m;
          return (
            <button key={d} type="button" disabled={past} onClick={() => onChange(d)}
              className={`h-14 rounded-xl flex flex-col items-center justify-center transition-colors ${
                on ? 'bg-gray-900 text-white'
                  : past ? 'text-gray-300 cursor-not-allowed'
                    : isToday ? 'text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-50'
                      : 'text-gray-800 hover:bg-gray-100'}`}>
              <span className={`text-[11px] ${on ? 'text-gray-300' : past ? '' : 'text-gray-400'}`}>{LETTER[dayOfWeek(d)]}</span>
              <span className="text-base font-semibold tabular-nums leading-5">{Number(d.slice(8))}</span>
              {otherMonth && <span className={`text-[9px] leading-3 ${on ? 'text-gray-300' : 'text-gray-400'}`}>{MONTHS[Number(d.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
