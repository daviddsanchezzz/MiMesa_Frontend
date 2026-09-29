// Date/time helpers for the agenda. Bookings come from the API as UTC instants;
// the agenda shows them in the business timezone.

export const DEFAULT_TZ = 'Europe/Madrid';

export const DAY_LABELS = [
  { value: 1, short: 'L', long: 'Lunes' },
  { value: 2, short: 'M', long: 'Martes' },
  { value: 3, short: 'X', long: 'Miércoles' },
  { value: 4, short: 'J', long: 'Jueves' },
  { value: 5, short: 'V', long: 'Viernes' },
  { value: 6, short: 'S', long: 'Sábado' },
  { value: 0, short: 'D', long: 'Domingo' },
];

export function todayIn(tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function longDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const text = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Minutes since local midnight of an instant, in the business timezone.
export function minutesInTz(iso, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') * 60 + get('minute');
}

export function timeInTz(iso, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const euros = (cents) => `${((cents || 0) / 100).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

// Opening windows of a schedule on a date (mirror of the backend logic).
export function windowsForDate(schedule, dateStr) {
  if (!schedule) return [];
  const overrides = (schedule.overrides || []).filter((o) => o.from <= dateStr && dateStr <= (o.to || o.from));
  const o = overrides[overrides.length - 1];
  if (o) {
    if (o.closed) return [];
    if (Array.isArray(o.windows)) return o.windows.map((w) => [toMinutes(w.start), toMinutes(w.end)]);
  }
  const dow = dayOfWeek(dateStr);
  return (schedule.rules || []).filter((r) => (r.days || []).includes(dow)).map((r) => [toMinutes(r.start), toMinutes(r.end)]);
}

export const STATUS = {
  pending:    { label: 'Pendiente',  cls: 'bg-amber-50 border-amber-300 text-amber-900' },
  confirmed:  { label: 'Confirmada', cls: 'bg-violet-50 border-violet-300 text-violet-900' },
  checked_in: { label: 'Ha llegado', cls: 'bg-sky-50 border-sky-300 text-sky-900' },
  completed:  { label: 'Completada', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
  cancelled:  { label: 'Cancelada',  cls: 'bg-gray-50 border-gray-200 text-gray-400 line-through' },
  no_show:    { label: 'No vino',    cls: 'bg-rose-50 border-rose-300 text-rose-900' },
};

export const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
export const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';
export const btnPrimary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors';
export const btnSecondary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors';
