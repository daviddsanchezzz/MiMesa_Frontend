import { TONES } from '../lib/status';
import { toHHMM } from '../pages/agenda/utils';

/**
 * The working day in one glance: one thin track per professional (or per
 * table), hours left to right, a block per appointment in the colour of its
 * state, closed time hatched and a line for "now".
 *
 * lanes: [{ id, label, avatar, blocks: [{ key, start, end, tone, title, onClick }], closed: [[s, e]] }]
 * from/to: minutes of the day shown. now: minutes or null.
 */
export default function DayRibbon({ lanes, from, to, now = null, onEmpty }) {
  const span = Math.max(60, to - from);
  const pct = (m) => `${((Math.min(Math.max(m, from), to) - from) / span) * 100}%`;
  const width = (s, e) => `${((Math.min(e, to) - Math.max(s, from)) / span) * 100}%`;
  const hours = [];
  const stepH = span > 10 * 60 ? 3 : 2;
  for (let h = Math.ceil(from / 60); h * 60 <= to; h += 1) if (h % stepH === 0 || h * 60 === from) hours.push(h * 60);
  const showNow = now != null && now >= from && now <= to;

  return (
    <div className="select-none">
      <div className="space-y-2">
        {lanes.map((lane) => (
          <div key={lane.id} className="flex items-center gap-2.5">
            <div className="w-7 shrink-0 flex justify-center" title={lane.label}>{lane.avatar}</div>
            <div className="relative flex-1 h-8 rounded-lg bg-gray-50 overflow-hidden"
              onClick={onEmpty ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const m = from + ((e.clientX - rect.left) / rect.width) * span;
                onEmpty(lane.id, Math.floor(m / 15) * 15);
              } : undefined}>
              {(lane.closed || []).map(([s, e], i) => (
                <div key={`c${i}-${s}`} className="absolute inset-y-0"
                  style={{ left: pct(s), width: width(s, e), backgroundImage: 'repeating-linear-gradient(135deg, rgba(156,163,175,0.22) 0 4px, transparent 4px 8px)' }} />
              ))}
              {lane.blocks.map((b) => {
                const t = TONES[b.tone] || TONES.confirmed;
                const faded = b.tone === 'cancelled' || b.tone === 'lost';
                const past = now != null && b.end <= now;
                return (
                  <button key={b.key} type="button" title={b.title}
                    onClick={(e) => { e.stopPropagation(); b.onClick?.(); }}
                    className="absolute inset-y-1 rounded-md transition-transform hover:scale-y-110 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
                    style={{
                      left: `calc(${pct(b.start)} + 1px)`, width: `calc(${width(b.start, b.end)} - 2px)`,
                      backgroundColor: t.dashed ? t.soft : t.color,
                      border: t.dashed ? `1.5px dashed ${t.color}` : 'none',
                      opacity: faded ? 0.3 : past ? 0.45 : 1,
                    }} />
                );
              })}
              {showNow && <div className="absolute inset-y-0 w-0.5 bg-gray-900 pointer-events-none" style={{ left: pct(now) }} aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>
      <div className="relative ml-[38px] h-5 mt-1">
        {hours.filter((m) => !showNow || Math.abs(m - now) > span * 0.06).map((m) => (
          <span key={m} className="absolute -translate-x-1/2 text-[10px] text-gray-400 tabular-nums" style={{ left: pct(m) }}>{toHHMM(m)}</span>
        ))}
        {showNow && (
          <span className="absolute -translate-x-1/2 text-[10px] font-semibold text-white bg-gray-900 rounded px-1 tabular-nums" style={{ left: pct(now) }}>{toHHMM(now)}</span>
        )}
      </div>
    </div>
  );
}
