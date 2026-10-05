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

export const euros = (cents) => {
  const c = Math.round(cents || 0);
  const digits = c % 100 === 0 ? 0 : 2; // 12 € · 12,50 €
  return `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: 'always' })} €`;
};

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

// Colour per professional: their own, or one from this palette by position.
export const STAFF_COLORS = ['#7c3aed', '#db2777', '#0891b2', '#ea580c', '#16a34a', '#2563eb', '#ca8a04', '#9333ea'];

export function staffColors(resources = []) {
  const out = {};
  resources.filter((r) => r.kind === 'staff').forEach((r, i) => { out[r._id] = r.color || STAFF_COLORS[i % STAFF_COLORS.length]; });
  return out;
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// wa.me link to a customer (Spanish numbers without prefix get +34).
export function waLink(phone, text = '') {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) digits = `34${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Local calendar date ('YYYY-MM-DD') of an instant in the business timezone.
export function dateInTz(iso, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

// Monday of the week that contains dateStr.
export function weekStart(dateStr) {
  const dow = dayOfWeek(dateStr);
  return addDays(dateStr, dow === 0 ? -6 : 1 - dow);
}

export function shortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Solid pastel of a colour (mixed with white), so lines behind never show through.
export function tint(hex, alpha = 0.14) {
  const h = String(hex || '#7c3aed').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const mix = (c) => Math.round(255 - (255 - c) * alpha);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// Closed stretches between opening windows, inside [from, to).
export function closedGaps(windows, from, to) {
  const out = [];
  let cursor = from;
  for (const [s, e] of [...windows].sort((a, b) => a[0] - b[0])) {
    if (s > cursor) out.push([cursor, Math.min(s, to)]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < to) out.push([cursor, to]);
  return out.filter(([s, e]) => e > s);
}

export function intersectWindows(a, b) {
  const out = [];
  for (const [s1, e1] of a) for (const [s2, e2] of b) {
    const s = Math.max(s1, s2); const e = Math.min(e1, e2);
    if (e > s) out.push([s, e]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/**
 * Side-by-side layout for overlapping items in one column (Google Calendar
 * style). items: [{ start, end, ... }] in minutes → adds { col, cols }.
 */
export function layoutOverlaps(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const colsEnd = [];
    for (const it of cluster) {
      let c = colsEnd.findIndex((e) => e <= it.start);
      if (c === -1) { c = colsEnd.length; colsEnd.push(it.end); } else colsEnd[c] = it.end;
      it.col = c;
    }
    for (const it of cluster) { it.cols = colsEnd.length; out.push(it); }
    cluster = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push({ ...it });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

/**
 * Reads an image file and returns a small data URL (fits in `max` px, WebP or
 * PNG to keep transparency for logos). Used for logos and staff photos.
 */
export function resizeImage(file, { max = 256, square = false, type = 'image/webp', quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Elige una imagen (JPG, PNG o WebP)')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let sx = 0; let sy = 0; let sw = img.width; let sh = img.height;
      if (square) { const side = Math.min(sw, sh); sx = (sw - side) / 2; sy = (sh - side) / 2; sw = side; sh = side; }
      const scale = Math.min(1, max / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let out = canvas.toDataURL(type, quality);
      if (!out.startsWith(`data:${type}`)) out = canvas.toDataURL('image/png'); // browsers without WebP encoding
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LETTERS = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
const hm = (t) => t.replace(/^0(\d)/, '$1');

/** "L–V 9:00–14:00 y 16:00–20:30 · S 9:00–14:00 · D cerrado" */
export function summarizeRules(rules = []) {
  const byDay = DAY_ORDER.map((d) => {
    const ws = rules.filter((r) => (r.days || []).includes(d)).map((r) => [r.start, r.end]).sort();
    return { d, text: ws.length ? ws.map(([s, e]) => `${hm(s)}–${hm(e)}`).join(' y ') : 'cerrado' };
  });
  const groups = [];
  for (const x of byDay) {
    const last = groups[groups.length - 1];
    if (last && last.text === x.text) last.days.push(x.d); else groups.push({ text: x.text, days: [x.d] });
  }
  return groups.map((g) => {
    const days = g.days.length > 2 ? `${LETTERS[g.days[0]]}–${LETTERS[g.days[g.days.length - 1]]}` : g.days.map((d) => LETTERS[d]).join(', ');
    return `${days} ${g.text}`;
  }).join(' · ');
}

// "12,50" / "12.5" / "12" → 1250 cents (null if not a number)
export function parseEuros(text) {
  const t = String(text ?? '').trim().replace(/\s|€/g, '').replace(',', '.');
  if (t === '') return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const centsToInput = (c) => (c ? (c / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') : '');

export const PAY_METHODS = [
  { key: 'cash', label: 'Efectivo', icon: '💶' },
  { key: 'card', label: 'Tarjeta', icon: '💳' },
  { key: 'bizum', label: 'Bizum', icon: '📱' },
  { key: 'other', label: 'Otro', icon: '•' },
];
export const payMethodLabel = (k) => (k === 'pack' ? 'Bono' : PAY_METHODS.find((m) => m.key === k)?.label || k);

// Minutes [start, end) of an absence inside one local day, or null if it does not touch it.
export function absenceSpan(a, date, tz = DEFAULT_TZ) {
  const sDate = dateInTz(a.start, tz);
  const eDate = dateInTz(new Date(new Date(a.end).getTime() - 1).toISOString(), tz);
  if (date < sDate || date > eDate) return null;
  const s = date === sDate ? minutesInTz(a.start, tz) : 0;
  const e = date === eDate ? (minutesInTz(a.end, tz) || 1440) : 1440;
  return e > s ? [s, e] : null;
}

// "Todo el día", "Hasta el 12 oct" or "10:00 – 12:00".
export function absenceText(a) {
  if (!a.allDay) return `${a.startTime} – ${a.endTime}`;
  if (a.fromDate === a.toDate) return 'Todo el día';
  const [, m, d] = a.toDate.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  return `Hasta el ${d} ${months[m - 1]}`;
}
