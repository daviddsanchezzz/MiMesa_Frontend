import { chipCls } from '../carta/labels';

export const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];

// <input type="time"> has no 24:00: midnight is 00:00, and a close before the open runs past midnight
export const toInput = (t) => (t === '24:00' ? '00:00' : t);
const timeCls = 'h-11 w-[8.75rem] min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 text-base tabular-nums text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

/** Opening hours, day by day: closed, or one to three ranges (lunch, dinner…). */
export default function HoursEditor({ hours, onChange }) {
  const byDay = Object.fromEntries(hours.map((d) => [d.day, d.ranges]));
  const setDay = (day, ranges) => onChange(hours.map((d) => (d.day === day ? { ...d, ranges } : d)));
  const copyToAll = (day) => onChange(hours.map((d) => ({ ...d, ranges: byDay[day].map((r) => ({ ...r })) })));

  return (
    <ul className="divide-y divide-gray-100 border-t border-gray-100">
      {DAYS.map(([day, label]) => {
        const ranges = byDay[day] || [];
        const open = ranges.length > 0;
        return (
          <li key={day} className="py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-medium text-gray-900 w-24">{label}</p>
              <div className="flex items-center gap-2">
                {open && <button type="button" onClick={() => copyToAll(day)} className="text-xs font-semibold text-gray-400 hover:text-violet-700">Copiar a todos</button>}
                <button type="button" onClick={() => setDay(day, open ? [] : [{ open: '13:00', close: '16:00' }])} className={chipCls(open)}>{open ? 'Abierto' : 'Cerrado'}</button>
              </div>
            </div>
            {open && (
              <div className="mt-2.5 space-y-2">
                {ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" className={timeCls} value={toInput(r.open)} onChange={(e) => setDay(day, ranges.map((x, idx) => (idx === i ? { ...x, open: e.target.value } : x)))} aria-label="Abre" />
                    <span className="text-gray-400">–</span>
                    <input type="time" className={timeCls} value={toInput(r.close)} onChange={(e) => setDay(day, ranges.map((x, idx) => (idx === i ? { ...x, close: e.target.value } : x)))} aria-label="Cierra" />
                    <button type="button" aria-label="Quitar franja" className="px-1.5 text-gray-400 hover:text-rose-600" onClick={() => setDay(day, ranges.filter((_, idx) => idx !== i))}>✕</button>
                  </div>
                ))}
                {ranges.length < 3 && (
                  <button type="button" className="text-[13px] font-semibold text-violet-700" onClick={() => setDay(day, [...ranges, { open: '20:00', close: '23:30' }])}>+ Añadir franja</button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
