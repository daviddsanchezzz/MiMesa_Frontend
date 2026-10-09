import { Chip } from '../../ui/list';
import { changeTone, pct } from './format';

const TONE = { up: 'rose', down: 'green', flat: 'gray' };

/** ▲ +12 % in rose (it costs more), ▼ −3 % in green; nothing when there is no earlier price. */
export default function Change({ value, className = '' }) {
  if (value === null || value === undefined) return null;
  const tone = changeTone(value);
  return (
    <Chip tone={TONE[tone]} className={`gap-1 ${className}`}>
      <span aria-hidden="true" className="text-[9px]">{tone === 'up' ? '▲' : tone === 'down' ? '▼' : '•'}</span>
      {tone === 'flat' ? 'Igual' : pct(value)}
    </Chip>
  );
}
