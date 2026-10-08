import { changeTone, pct } from './format';

const STYLE = {
  up: 'text-rose-700 bg-rose-50',
  down: 'text-emerald-700 bg-emerald-50',
  flat: 'text-gray-500 bg-gray-100',
};

/** ▲ +12 % in rose (it costs more), ▼ −3 % in green; nothing when there is no earlier price. */
export default function Change({ value, className = '' }) {
  if (value === null || value === undefined) return null;
  const tone = changeTone(value);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${STYLE[tone]} ${className}`}>
      <span aria-hidden="true" className="text-[9px]">{tone === 'up' ? '▲' : tone === 'down' ? '▼' : '•'}</span>
      {tone === 'flat' ? 'Igual' : pct(value)}
    </span>
  );
}
