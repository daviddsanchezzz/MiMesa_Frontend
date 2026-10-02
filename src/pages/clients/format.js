import { DEFAULT_TZ, STAFF_COLORS } from '../agenda/utils';

/** «hoy», «ayer», «hace 12 días», «hace 3 meses», «en 4 días». */
export function relDays(date) {
  if (!date) return null;
  const at = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  const days = Math.round((Date.now() - at.getTime()) / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days === -1) return 'mañana';
  if (days < 0) return `en ${-days} días`;
  if (days < 60) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months < 12 ? `hace ${months} meses` : 'hace más de un año';
}

/** «jue, 8 oct, 10:30» in the business timezone. */
export function shortDateTime(date, tz = DEFAULT_TZ) {
  return new Date(date).toLocaleString('es-ES', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const avatarColor = (name) => STAFF_COLORS[(name?.charCodeAt(0) || 0) % STAFF_COLORS.length];

export function everyText(days) {
  if (!days) return '—';
  if (days < 14) return `cada ${days} días`;
  const weeks = Math.round(days / 7);
  return weeks < 9 ? `cada ${weeks} semanas` : `cada ${Math.round(days / 30)} meses`;
}

/** «685292717» → «685 29 27 17»; «+34685292717» → «+34 685 29 27 17». Other formats stay as typed. */
export function phoneText(raw) {
  const t = String(raw || '').trim();
  const d = t.replace(/\D/g, '');
  const es = d.length === 11 && d.startsWith('34') ? d.slice(2) : d.length === 9 ? d : null;
  if (!es) return t;
  const pretty = `${es.slice(0, 3)} ${es.slice(3, 5)} ${es.slice(5, 7)} ${es.slice(7)}`;
  return d.length === 11 ? `+34 ${pretty}` : pretty;
}
