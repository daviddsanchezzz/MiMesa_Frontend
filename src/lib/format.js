/**
 * How numbers and dates are written on screen, in one place. Every screen imports from here, so a
 * change in how an amount or a date looks changes everywhere.
 * Dates come as 'YYYY-MM-DD' (or an ISO timestamp, of which only the day is used); amounts in euros unless the name says cents.
 */

const es = (n, min, max) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: 'always' });
const isNone = (v) => v === null || v === undefined || v === '';

// ── Amounts ─────────────────────────────────────────────────────────────

/** 1.234,50 € — always two decimals; nothing counts as 0. */
export const money = (value) => `${es(Number(value) || 0, 2, 2)} €`;

/** 12 € · 12,50 € — no decimals when the amount is whole; '—' when there is none. */
export const eur = (value) => (isNone(value) || !Number.isFinite(Number(value)) ? '—' : `${es(value, Number(value) % 1 ? 2 : 0, 2)} €`);

/** The same from cents. */
export const eurCents = (cents) => eur(Math.round(Number(cents) || 0) / 100);

/** Prices of ingredients: 0,045 € keeps its third decimal. */
export const moneyPrecise = (value) => (isNone(value) ? '—' : `${es(value, 2, Number(value) !== 0 && Math.abs(value) < 1 ? 3 : 2)} €`);

/** 1.234,50 € / $ / £ for any currency. */
export function moneyCurrency(value, currency = 'EUR') {
  const parsed = Number(value);
  if (isNone(value) || !Number.isFinite(parsed)) return '—';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(parsed);
  } catch {
    return `${es(parsed, 2, 2)} ${currency || 'EUR'}`;
  }
}

/** +12 % · −3,5 % · empty when there is none. */
export const pct = (n) => (isNone(n) ? '' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${es(Math.abs(n), 0, 1)} %`);

// ── Dates ───────────────────────────────────────────────────────────────

const parse = (value) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`) : null;
};
const noDot = (s) => s.replace(/[.,]/g, '');

/** 5 oct — with the year when it is not this year (or when asked). */
export function dateShort(value, withYear = false) {
  const d = parse(value);
  if (!d) return '—';
  const year = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }).replace('.', '');
}

/** 5 oct 2026 */
export const dateYear = (value) => dateShort(value, true);

/** mié 5 oct */
export function dateDay(value) {
  const d = parse(value);
  return d ? noDot(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })) : '—';
}

/** Viernes, 9 de octubre */
export function dateLong(value) {
  const d = parse(value);
  if (!d) return '—';
  const text = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 05/10/2026 */
export function dateNumeric(value) {
  const d = parse(value);
  return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

/** hoy · ayer · hace 6 días · hace 3 meses */
export function ago(value) {
  const d = parse(value);
  if (!d) return '';
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 45) return `hace ${days} días`;
  return `hace ${Math.round(days / 30)} meses`;
}
