// Period helpers shared by every screen with a date selector (Finanzas, Estadísticas, Rendimiento, Compras).
// Dates are 'YYYY-MM-DD' strings; ranges are { from, to }.

// Uses local date parts to avoid UTC offset shifting the date (e.g. Spain CEST = UTC+2)
export function toIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekRange(anchor = new Date()) {
  const today = new Date(anchor);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today); mon.setDate(today.getDate() + diff);
  const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
  return { from: toIso(mon), to: toIso(sun) };
}

export function getMonthRange(anchor = new Date()) {
  const today = new Date(anchor);
  return {
    from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
    to:   toIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

export function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The same kind of period, `direction` steps away (-1 = the previous one).
export function shiftRange(period, dateRange, direction) {
  if (period === 'month') {
    const anchor = parseIso(dateRange.from);
    anchor.setMonth(anchor.getMonth() + direction);
    return getMonthRange(anchor);
  }
  if (period === 'week') {
    const anchor = parseIso(dateRange.from);
    anchor.setDate(anchor.getDate() + (7 * direction));
    return getWeekRange(anchor);
  }
  const from = parseIso(dateRange.from);
  const to = parseIso(dateRange.to);
  const days = Math.round((to - from) / 86400000) + 1;
  from.setDate(from.getDate() + (days * direction));
  to.setDate(to.getDate() + (days * direction));
  return { from: toIso(from), to: toIso(to) };
}

import { dateDay as fmtDay, dateShort as fmtShort } from './format';
export { fmtDay, fmtShort };

export function fmtRange({ from, to }) {
  if (!from || !to) return '';
  return `${fmtShort(from)} – ${fmtShort(to, true)}`;
}


export const MONTH_NAME = (iso) => parseIso(iso).toLocaleDateString('es-ES', { month: 'long' });
export function previousLabel(period, dateRange) {
  if (period === 'month') return MONTH_NAME(shiftRange('month', dateRange, -1).from);
  return period === 'week' ? 'la semana anterior' : 'el periodo anterior';
}

