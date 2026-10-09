export { moneyPrecise as money, pct, ago, dateShort as shortDate } from '../../lib/format';

import { moneyPrecise } from '../../lib/format';

export const perUnit = (n, unit) => (n === null || n === undefined ? '—' : `${moneyPrecise(n)}/${unit}`);
export const UNIT_LABEL = { kg: 'kg', l: 'litro', ud: 'unidad' };
export const UNIT_NAME = { kg: 'kilo', l: 'litro', ud: 'unidad' };

/** Rising prices are bad news (rose), falling ones good (emerald). */
export const changeTone = (n) => (n === null || n === undefined || Math.abs(n) < 0.05 ? 'flat' : n > 0 ? 'up' : 'down');

/** 850 g · 12,5 kg · 300 ml · 4 l · 12 ud — small amounts in the small unit. */
export function qty(n, unit) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  const es = (x, d) => x.toLocaleString('es-ES', { maximumFractionDigits: d });
  if (unit === 'kg') return Math.abs(v) < 1 ? `${es(v * 1000, 0)} g` : `${es(v, 2)} kg`;
  if (unit === 'l') return Math.abs(v) < 1 ? `${es(v * 1000, 0)} ml` : `${es(v, 2)} l`;
  return `${es(v, 1)} ud`;
}
