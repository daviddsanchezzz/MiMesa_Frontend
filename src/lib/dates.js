import { addDays } from '../pages/agenda/utils';

const WEEKDAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → «Hoy», «Mañana», «Ayer» or «jue 8 oct». Never an ISO date on screen. */
export function dayLabel(dateStr, today) {
  if (!dateStr) return '';
  if (today) {
    if (dateStr === today) return 'Hoy';
    if (dateStr === addDays(today, 1)) return 'Mañana';
    if (dateStr === addDays(today, -1)) return 'Ayer';
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const thisYear = Number((today || new Date().toISOString()).slice(0, 4));
  return `${WEEKDAY[dow]} ${d} ${MONTH[m - 1]}${y !== thisYear ? ` ${y}` : ''}`;
}

/** Short weekday letter-ish label for charts: «L 5». */
export function shortDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { weekday: WEEKDAY[dow], day: d };
}
