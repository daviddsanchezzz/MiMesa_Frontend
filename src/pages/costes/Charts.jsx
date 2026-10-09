import { money } from './format';
import { dateShort } from '../../lib/format';

const TONE = { up: '#e11d48', down: '#059669', flat: '#9ca3af' };
const toneOf = (values) => {
  if (values.length < 2) return 'flat';
  const diff = values[values.length - 1] - values[values.length - 2];
  return Math.abs(diff) < 1e-9 ? 'flat' : diff > 0 ? 'up' : 'down';
};

/** The last prices as a small line: no axes, only the shape (rose if the last change was up, green if down). */
export function Sparkline({ values, width = 72, height = 26 }) {
  if (!values || values.length < 2) return <span aria-hidden="true" className="inline-block" style={{ width, height }} />;
  const min = Math.min(...values); const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - 2 * pad), height - pad - ((v - min) / span) * (height - 2 * pad)]);
  const color = TONE[toneOf(values)];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0 overflow-visible">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

/** The price over time with its lowest and highest value, for the detail. `points` oldest first: { date, price }. */
export function PriceChart({ points, unit }) {
  if (points.length < 2) {
    return <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Con una segunda compra verás aquí cómo evoluciona el precio.</p>;
  }
  const W = 640; const H = 190; const L = 8; const R = 8; const T = 18; const B = 26;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices); const max = Math.max(...prices);
  const lo = min - (max - min) * 0.15 || min * 0.95; const hi = max + (max - min) * 0.15 || max * 1.05;
  const t0 = new Date(`${points[0].date}T12:00:00`).getTime();
  const t1 = new Date(`${points[points.length - 1].date}T12:00:00`).getTime();
  const x = (d) => L + (t1 === t0 ? 0.5 : (new Date(`${d}T12:00:00`).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const y = (p) => T + (1 - (p - lo) / (hi - lo)) * (H - T - B);
  const color = TONE[toneOf(prices)];
  const line = points.map((p) => `${x(p.date).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ');
  const area = `${L},${H - B} ${line} ${x(points[points.length - 1].date).toFixed(1)},${H - B}`;
  const iMin = prices.indexOf(min); const iMax = prices.indexOf(max);
  const fmt = dateShort;
  const label = (i, above) => {
    const px = Math.min(W - 54, Math.max(54, x(points[i].date)));
    return <text x={px} y={y(points[i].price) + (above ? -9 : 17)} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4b5563">{money(points[i].price)}</text>;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Evolución del precio por ${unit}`}>
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient>
      </defs>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#e5e7eb" />
      <polygon points={area} fill="url(#pc-fill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(p.date)} cy={y(p.price)} r={i === points.length - 1 ? 4.5 : 3} fill="#fff" stroke={color} strokeWidth="2" />)}
      {max !== min && label(iMax, true)}
      {max !== min && label(iMin, false)}
      {max === min && label(points.length - 1, true)}
      <text x={L} y={H - 7} fontSize="11" fill="#9ca3af">{fmt(points[0].date)}</text>
      <text x={W - R} y={H - 7} fontSize="11" fill="#9ca3af" textAnchor="end">{fmt(points[points.length - 1].date)}</text>
    </svg>
  );
}
