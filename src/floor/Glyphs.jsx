import { CHAIR, ELEMENTS, placeElement, rotatedHalf, seatsFor } from './geometry';

/**
 * How things are drawn on the plan (SVG, world units). Tables are seen from
 * above: chairs in a soft tone, the top in white or in the colour of its
 * state, the name always upright in the middle.
 */

export const LOOKS = {
  plain:     { surface: '#ffffff', edge: '#d4d4d8', chair: '#e4e4e7', ink: '#18181b', sub: '#71717a' },
  free:      { surface: '#ffffff', edge: '#d4d4d8', chair: '#e4e4e7', ink: '#18181b', sub: '#71717a' },
  confirmed: { surface: '#f5f3ff', edge: '#8b5cf6', chair: '#ddd6fe', ink: '#4c1d95', sub: '#6d28d9' },
  pending:   { surface: '#fffbeb', edge: '#f59e0b', chair: '#fde68a', ink: '#78350f', sub: '#b45309', dashed: true },
  here:      { surface: '#ecfdf5', edge: '#10b981', chair: '#a7f3d0', ink: '#064e3b', sub: '#047857' },
  late:      { surface: '#fff7ed', edge: '#f97316', chair: '#fed7aa', ink: '#7c2d12', sub: '#c2410c' },
  done:      { surface: '#f8fafc', edge: '#cbd5e1', chair: '#e2e8f0', ink: '#64748b', sub: '#94a3b8' },
  locked:    { surface: '#f4f4f5', edge: '#d4d4d8', chair: '#e4e4e7', ink: '#a1a1aa', sub: '#a1a1aa', dashed: true },
};

const ACCENT = '#7c3aed';

export function SvgDefs() {
  return (
    <defs>
      <filter id="fp-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.10" />
      </filter>
      <filter id="fp-lift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0f172a" floodOpacity="0.22" />
      </filter>
      <pattern id="fp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#f4f4f5" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#e4e4e7" strokeWidth="3" />
      </pattern>
    </defs>
  );
}

const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * One table. `p` = { cx, cy, w, h, angle, shape }.
 * look: a LOOKS entry; line2: second line under the name; badge: { text, bg }
 * pinned to the top-right corner; progress: 0–1 bar along the bottom.
 */
export function TableGlyph({
  p, name, capacity, look = LOOKS.plain, line2, badge, progress, selected, highlight, dim, lifted,
  onPointerDown, onClick, onDoubleClick, onPointerEnter, onPointerLeave, cursor = 'pointer',
}) {
  const { w, h, angle, shape } = p;
  const seats = seatsFor(capacity, shape, w, h);
  const r = shape === 'circle' ? w / 2 : 0;
  const rx = shape === 'square' ? 14 : shape === 'circle' ? 0 : 16;
  const { hx, hy } = rotatedHalf(w, h, angle);
  const small = Math.min(w, h) < 72;
  const nameSize = small ? 13 : 15;
  const maxChars = Math.max(6, Math.floor(w / 7.2));
  const badgeW = badge ? Math.max(30, badge.text.length * 6.4 + 14) : 0;

  const surface = (grow = 0, props = {}) => (shape === 'circle'
    ? <circle r={r + grow} {...props} />
    : <rect x={-w / 2 - grow} y={-h / 2 - grow} width={w + grow * 2} height={h + grow * 2} rx={rx + grow} {...props} />);

  return (
    <g transform={`translate(${p.cx} ${p.cy})`} opacity={dim ? 0.32 : 1}
      style={{ cursor, transition: 'opacity 150ms' }}
      onPointerDown={onPointerDown} onClick={onClick} onDoubleClick={onDoubleClick}
      onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <g transform={`rotate(${angle})`}>
        {/* generous invisible hit area (chairs included) */}
        {surface(CHAIR.gap + CHAIR.h + 2, { fill: 'transparent' })}
        {seats.map((s, i) => (s.kind === 'bench'
          ? <rect key={i} x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={7} fill={look.chair} />
          : <rect key={i} x={-CHAIR.w / 2} y={-CHAIR.h / 2} width={CHAIR.w} height={CHAIR.h} rx={5} fill={look.chair}
              transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`} />))}
        {(selected || highlight) && surface(7, {
          fill: highlight && !selected ? 'rgba(124,58,237,0.08)' : 'none',
          stroke: ACCENT, strokeWidth: selected ? 2.5 : 2, strokeDasharray: highlight && !selected ? '6 5' : undefined,
        })}
        {surface(0, {
          fill: look.surface, stroke: look.edge, strokeWidth: look === LOOKS.plain || look === LOOKS.free ? 1.25 : 2,
          strokeDasharray: look.dashed ? '6 4' : undefined, filter: lifted ? 'url(#fp-lift)' : 'url(#fp-shadow)',
        })}
        {progress != null && (() => {
          // Along the bottom, inside the table (a chord for round ones).
          const by = shape === 'circle' ? r * 0.62 : h / 2 - 11;
          const bw = shape === 'circle' ? 2 * Math.sqrt(Math.max(0, r * r - by * by)) - 18 : w - 28;
          return (
            <g>
              <rect x={-bw / 2} y={by - 1.75} width={bw} height={3.5} rx={1.75} fill="rgba(15,23,42,0.08)" />
              <rect x={-bw / 2} y={by - 1.75} width={Math.max(3.5, bw * Math.min(1, progress))} height={3.5} rx={1.75}
                fill={progress >= 1 ? '#f97316' : look.edge} />
            </g>
          );
        })()}
      </g>
      <text textAnchor="middle" dominantBaseline="central" y={line2 ? -7 : 0}
        style={{ fontSize: nameSize, fontWeight: 650, letterSpacing: '-0.01em', fill: look.ink, pointerEvents: 'none', userSelect: 'none' }}>
        {truncate(name, maxChars)}
      </text>
      {line2 && (
        <text textAnchor="middle" dominantBaseline="central" y={10}
          style={{ fontSize: 11, fontWeight: 500, fill: look.sub, pointerEvents: 'none', userSelect: 'none' }}>
          {truncate(line2, maxChars + 2)}
        </text>
      )}
      {badge && (
        <g transform={`translate(${hx - badgeW / 2 + 6} ${-hy - 2})`} style={{ pointerEvents: 'none' }}>
          <rect x={-badgeW / 2} y={-9.5} width={badgeW} height={19} rx={9.5} fill={badge.bg} stroke="#fff" strokeWidth={2} />
          <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10.5, fontWeight: 700, fill: badge.ink || '#fff' }}>{badge.text}</text>
        </g>
      )}
    </g>
  );
}

/** Walls, bar, entrance… `e` = stored element { kind, x, y, w, h, angle, label }. */
export function ElementGlyph({ e, selected, onPointerDown, onClick, cursor }) {
  const { cx, cy } = placeElement(e);
  const { w, h } = e;
  const angle = e.angle || 0;
  const upright = angle > 90 && angle < 270 ? 180 : 0;
  const label = e.label || ELEMENTS[e.kind]?.label || '';
  const text = (props = {}) => (
    <text textAnchor="middle" dominantBaseline="central" transform={upright ? 'rotate(180)' : undefined}
      style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fill: '#71717a', pointerEvents: 'none', userSelect: 'none', ...props }}>
      {label}
    </text>
  );
  const box = { x: -w / 2, y: -h / 2, width: w, height: h };
  let body;
  switch (e.kind) {
    case 'wall':
      body = <rect {...box} rx={Math.min(4, h / 2)} fill="#3f3f46" />; break;
    case 'window':
      body = (
        <g>
          <rect {...box} rx={2} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={1.5} />
          <line x1={-w / 2 + 4} x2={w / 2 - 4} y1={0} y2={0} stroke="#7dd3fc" strokeWidth={1} />
        </g>
      ); break;
    case 'entrance':
      body = (
        <g>
          <rect {...box} rx={h / 2} fill="#ede9fe" />
          <path d={`M ${-8} ${-h / 2 - 5} L 0 ${-h / 2 - 13} L 8 ${-h / 2 - 5}`} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <g transform={`translate(0 ${h / 2 + 12})`}>{text({ fontSize: 10.5, fill: '#7c3aed' })}</g>
        </g>
      ); break;
    case 'bar':
      body = <g><rect {...box} rx={12} fill="#f5f5f4" stroke="#d6d3d1" strokeWidth={1.5} filter="url(#fp-shadow)" />{text()}</g>; break;
    case 'kitchen':
      body = <g><rect {...box} rx={10} fill="url(#fp-hatch)" stroke="#d4d4d8" strokeWidth={1.5} />{text()}</g>; break;
    case 'wc':
      body = <g><rect {...box} rx={10} fill="#f4f4f5" stroke="#d4d4d8" strokeWidth={1.5} />{text()}</g>; break;
    case 'zone':
      body = (
        <g>
          <rect {...box} rx={18} fill="rgba(139,92,246,0.035)" stroke="#c4b5fd" strokeWidth={1.5} strokeDasharray="8 6" />
          <g transform={`translate(${upright ? w / 2 - 14 : -w / 2 + 14} ${upright ? h / 2 - 16 : -h / 2 + 16})`}>
            {text({ textAnchor: 'start', fill: '#8b5cf6', fontSize: 11 })}
          </g>
        </g>
      ); break;
    case 'plant':
      body = (
        <g>
          <circle r={w / 2} fill="#dcfce7" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} r={w / 5} cx={Math.cos((a * Math.PI) / 180) * w / 5} cy={Math.sin((a * Math.PI) / 180) * w / 5} fill="#86efac" />
          ))}
          <circle r={w / 8} fill="#4ade80" />
        </g>
      ); break;
    case 'column':
      body = <rect {...box} rx={3} fill="#d4d4d8" />; break;
    default:
      body = <g><rect {...box} fill="transparent" />{text({ fontSize: 14, fill: '#a1a1aa' })}</g>;
  }
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle})`} onPointerDown={onPointerDown} onClick={onClick} style={{ cursor }}>
      {/* easier to grab thin things */}
      <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} fill="transparent" />
      {body}
      {selected && <rect x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12} rx={8} fill="none" stroke={ACCENT} strokeWidth={2} />}
    </g>
  );
}

/** Small preview of a table for palettes and pickers. */
export function TablePreview({ shape, capacity, size = 44 }) {
  const p = { cx: 0, cy: 0, angle: 0, shape, w: 0, h: 0 };
  const dims = (() => {
    if (shape === 'circle') { const d = capacity <= 2 ? 26 : 32; return { w: d, h: d }; }
    if (shape === 'square') return { w: 26, h: 26 };
    return { w: capacity <= 6 ? 40 : 46, h: 22 };
  })();
  Object.assign(p, dims);
  const seats = seatsFor(capacity, shape, dims.w, dims.h).map((s) => ({ ...s, x: s.x * 0.62 + (s.kind === 'chair' ? 0 : 0), y: s.y * 0.62 }));
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} aria-hidden="true">
      {seats.map((s, i) => (s.kind === 'bench'
        ? <rect key={i} x={-dims.w / 2} y={s.y - 4} width={dims.w} height={8} rx={4} fill="#d4d4d8" />
        : <rect key={i} x={-5} y={-3} width={10} height={6} rx={2.5} fill="#d4d4d8" transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`} />))}
      {shape === 'circle'
        ? <circle r={dims.w / 2} fill="#fff" stroke="#a1a1aa" strokeWidth={1.5} />
        : <rect x={-dims.w / 2} y={-dims.h / 2} width={dims.w} height={dims.h} rx={shape === 'square' ? 5 : 6} fill="#fff" stroke="#a1a1aa" strokeWidth={1.5} />}
    </svg>
  );
}

export function ElementPreview({ kind, size = 44 }) {
  const map = {
    bar: <rect x={-18} y={-7} width={36} height={14} rx={4} fill="#f5f5f4" stroke="#a8a29e" strokeWidth={1.5} />,
    wall: <rect x={-18} y={-2.5} width={36} height={5} rx={2} fill="#3f3f46" />,
    window: <g><rect x={-18} y={-3} width={36} height={6} rx={1} fill="#e0f2fe" stroke="#38bdf8" strokeWidth={1.2} /></g>,
    entrance: <g><rect x={-14} y={2} width={28} height={6} rx={3} fill="#ddd6fe" /><path d="M -6 -3 L 0 -9 L 6 -3" fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" /></g>,
    kitchen: <rect x={-16} y={-11} width={32} height={22} rx={4} fill="url(#fp-hatch-mini)" stroke="#a1a1aa" strokeWidth={1.2} />,
    wc: <g><rect x={-14} y={-11} width={28} height={22} rx={4} fill="#f4f4f5" stroke="#a1a1aa" strokeWidth={1.2} /><text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 8, fontWeight: 700, fill: '#71717a' }}>WC</text></g>,
    zone: <rect x={-17} y={-12} width={34} height={24} rx={6} fill="rgba(139,92,246,0.06)" stroke="#a78bfa" strokeWidth={1.3} strokeDasharray="4 3" />,
    plant: <g><circle r={9} fill="#dcfce7" /><circle r={4.5} cx={-3} cy={-2} fill="#86efac" /><circle r={4.5} cx={3} cy={2} fill="#86efac" /><circle r={2.5} fill="#22c55e" /></g>,
    column: <rect x={-6} y={-6} width={12} height={12} rx={2} fill="#a1a1aa" />,
    label: <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 13, fontWeight: 700, fill: '#71717a' }}>Aa</text>,
  };
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <defs>
        <pattern id="fp-hatch-mini" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#f4f4f5" /><line x1="0" y1="0" x2="0" y2="5" stroke="#d4d4d8" strokeWidth="2" />
        </pattern>
      </defs>
      {map[kind]}
    </svg>
  );
}
