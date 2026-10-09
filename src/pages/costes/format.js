export { moneyPrecise as money, pct, ago, dateShort as shortDate } from '../../lib/format';

import { moneyPrecise } from '../../lib/format';

export const perUnit = (n, unit) => (n === null || n === undefined ? '—' : `${moneyPrecise(n)}/${unit}`);
export const UNIT_LABEL = { kg: 'kg', l: 'litro', ud: 'unidad' };
export const UNIT_NAME = { kg: 'kilo', l: 'litro', ud: 'unidad' };

/** Rising prices are bad news (rose), falling ones good (emerald). */
export const changeTone = (n) => (n === null || n === undefined || Math.abs(n) < 0.05 ? 'flat' : n > 0 ? 'up' : 'down');
