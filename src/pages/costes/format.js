const es = (n, min, max) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: min, maximumFractionDigits: max });

/** 10,92 € (three decimals only for tiny prices, 0,045 €). */
export const money = (n) => (n === null || n === undefined ? '—' : `${es(n, 2, n !== 0 && Math.abs(n) < 1 ? 3 : 2)} €`);
export const perUnit = (n, unit) => (n === null || n === undefined ? '—' : `${money(n)}/${unit}`);
/** +12 % · −3,5 % */
export const pct = (n) => (n === null || n === undefined ? '' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${es(Math.abs(n), 0, 1)} %`);

export const UNIT_LABEL = { kg: 'kg', l: 'litro', ud: 'unidad' };
export const UNIT_NAME = { kg: 'kilo', l: 'litro', ud: 'unidad' };

/** "5 oct" · "5 oct 2025" when it is not this year. */
export function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  const opts = d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('es-ES', opts).replace('.', '');
}

/** "hoy" · "ayer" · "hace 6 días" · "hace 3 meses" */
export function ago(iso) {
  if (!iso) return '';
  const days = Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 45) return `hace ${days} días`;
  return `hace ${Math.round(days / 30)} meses`;
}

/** Rising prices are bad news (rose), falling ones good (emerald). */
export const changeTone = (n) => (n === null || n === undefined || Math.abs(n) < 0.05 ? 'flat' : n > 0 ? 'up' : 'down');
