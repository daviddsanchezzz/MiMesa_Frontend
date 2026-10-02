import { useEffect, useRef, useState } from 'react';
import { closedGaps, euros, minutesInTz, timeInTz, tint, toHHMM } from './utils';
import { LINE } from './lineColors';

export const PX_PER_MIN = 1.4;
const SNAP_MIN = 15;
const TOP_PAD = 10; // room for the first hour label

const STATUS_STYLE = {
  pending:    { label: 'Pendiente', chip: 'bg-amber-100 text-amber-800', dashed: true },
  checked_in: { label: 'Ha llegado', chip: 'bg-sky-100 text-sky-800' },
  completed:  { label: 'Atendida', chip: 'bg-emerald-100 text-emerald-800', dim: true },
  cancelled:  { label: 'Cancelada', chip: 'bg-gray-100 text-gray-500', muted: true },
  no_show:    { label: 'No vino', chip: 'bg-rose-100 text-rose-700', muted: true },
};

function useNowMinute(tz, active) {
  const [now, setNow] = useState(() => (active ? minutesInTz(new Date().toISOString(), tz) : null));
  useEffect(() => {
    if (!active) { setNow(null); return undefined; }
    setNow(minutesInTz(new Date().toISOString(), tz));
    const t = setInterval(() => setNow(minutesInTz(new Date().toISOString(), tz)), 30000);
    return () => clearInterval(t);
  }, [tz, active]);
  return now;
}

// Time a professional is away: grey stripes, not bookable.
export function AbsenceBlock({ absence, top, height, left = '4px', width = 'calc(100% - 8px)', dense = false, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(absence); }}
      title={absence.reason ? `Ausente · ${absence.reason}` : 'Ausente'}
      className={`absolute z-10 rounded-lg text-left overflow-hidden border border-gray-300 text-gray-600 hover:border-gray-400 flex flex-col justify-start items-start ${dense ? 'px-1 py-0.5' : 'px-2 py-1'}`}
      style={{
        top, height, left, width,
        backgroundColor: '#f3f4f6',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(156,163,175,0.25) 0 6px, transparent 6px 12px)',
      }}
    >
      <p className="text-[11px] font-semibold leading-tight truncate">{dense ? 'Fuera' : 'Ausente'}</p>
      {!dense && absence.reason && height > 34 && <p className="text-[11px] leading-tight truncate">{absence.reason}</p>}
    </button>
  );
}

// kind (day view): the colour tells the state, like the list (see lineColors).
// Without it (week view) the block takes the professional's colour.
export function BookingBlock({ booking, segment, color, kind = null, isNext = false, tz, top, height, left = '4px', width = 'calc(100% - 8px)', dense = false, onClick }) {
  if (kind) return <StateBlock {...{ booking, segment, kind, isNext, tz, top, height, left, width, dense, onClick }} />;
  const st = STATUS_STYLE[booking.status];
  const muted = st?.muted;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(booking); }}
      title={`${timeInTz(segment.start, tz)}–${timeInTz(segment.end, tz)} · ${booking.guestName} · ${segment.serviceName}`}
      className={`absolute z-10 rounded-lg text-left overflow-hidden transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 ${dense ? 'px-1.5 py-0.5' : 'px-2 py-1'} ${st?.dim ? 'opacity-70' : ''}`}
      style={{
        top, height, left, width,
        backgroundColor: muted ? '#f9fafb' : tint(color, 0.14),
        borderLeft: `3px solid ${muted ? '#d1d5db' : color}`,
        outline: st?.dashed ? `1.5px dashed ${color}` : 'none',
        outlineOffset: -2,
      }}
    >
      <p className={`text-[11px] font-semibold leading-tight truncate ${muted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {!dense && <span className="tabular-nums">{timeInTz(segment.start, tz)} · </span>}{dense ? booking.guestName.split(' ')[0] : booking.guestName}
      </p>
      {height > 34 && !dense && (
        <p className={`text-[11px] leading-tight truncate ${muted ? 'text-gray-400' : 'text-gray-600'}`}>{segment.serviceName}</p>
      )}
      {st && height > 52 && !dense && (
        <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-px rounded ${st.chip}`}>{st.label}</span>
      )}
    </button>
  );
}

// Background tint per state: strong for what is live, faint for what is over.
const STATE_BG = { confirmed: 0.13, here: 0.16, unpaid: 0.14, done: 0.1, pending: 0.08, lost: 0, cancelled: 0 };

function StateBlock({ booking, segment, kind, isNext, tz, top, height, left, width, dense, onClick }) {
  const l = LINE[kind] || LINE.confirmed;
  const lost = kind === 'lost' || kind === 'cancelled';
  const bg = STATE_BG[kind] ? tint(l.color, STATE_BG[kind]) : lost ? '#fff7f8' : '#f9fafb';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(booking); }}
      title={`${timeInTz(segment.start, tz)}–${timeInTz(segment.end, tz)} · ${booking.guestName} · ${segment.serviceName} · ${l.label}`}
      className={`absolute z-10 rounded-lg text-left overflow-hidden transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 flex flex-col justify-start items-stretch ${dense ? 'px-1.5 py-0.5' : height < 34 ? 'px-2 py-0.5 justify-center' : 'px-2 py-1.5'} ${isNext ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
      style={{
        top, height, left, width,
        backgroundColor: bg,
        borderLeft: l.dashed ? 'none' : `3px solid ${l.color}`,
        backgroundImage: l.dashed ? `repeating-linear-gradient(to bottom, ${l.color} 0 5px, transparent 5px 9px)` : 'none',
        backgroundSize: l.dashed ? '3px 100%' : undefined,
        backgroundRepeat: 'no-repeat',
        paddingLeft: l.dashed ? (dense ? 9 : 11) : undefined,
      }}
    >
      {dense ? (
        <p className={`text-[11px] font-semibold leading-tight truncate ${lost ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{booking.guestName.split(' ')[0]}</p>
      ) : height < 34 ? (
        <p className={`text-[12px] font-semibold leading-tight truncate ${lost ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          <span className="tabular-nums font-medium text-gray-500">{timeInTz(segment.start, tz)}</span> {booking.guestName}
        </p>
      ) : (
        <>
          <p className={`text-[13px] font-semibold leading-tight truncate ${lost ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{booking.guestName}</p>
          <p className={`text-[12px] leading-tight truncate mt-0.5 ${lost ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="tabular-nums">{timeInTz(segment.start, tz)}–{timeInTz(segment.end, tz)}</span>{height < 52 ? ` · ${segment.serviceName}` : ''}
          </p>
          {height >= 52 && <p className={`text-[12px] leading-tight truncate mt-0.5 ${lost ? 'text-gray-400' : 'text-gray-700'}`}>{segment.serviceName}</p>}
          {height >= 76 && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
              {segment.price > 0 && <span className="font-semibold tabular-nums text-gray-700">{euros(segment.price)}</span>}
              {kind === 'pending' && <span className="font-semibold text-amber-700">Por confirmar</span>}
              {booking.notes && <span className="inline-flex items-center gap-0.5" title={booking.notes}>· <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h5.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12A1.5 1.5 0 0 1 13.5 4.622V13.5A1.5 1.5 0 0 1 12 15H4.5A1.5 1.5 0 0 1 3 13.5v-11Z" /></svg>nota</span>}
              {booking.source === 'online' && <span>· online</span>}
            </p>
          )}
        </>
      )}
      <span className="sr-only">{l.label}</span>
    </button>
  );
}

/**
 * Hours down the side, one column per professional (day) or per day (week).
 * Each column: closed time shaded and labelled, hour lines, the "now" line,
 * a ghost slot under the pointer ("+ 10:15") and the booking blocks.
 *
 * columns: [{ key, header, windows: [[s,e]], isToday, blocks: [{ key, top, height, left, width, render }],
 *             lanes: [{ key, left, width }] | undefined, onEmpty(minute, laneKey) | undefined }]
 */
export default function TimeGrid({ columns, startMin, endMin, tz, minColWidth = '11rem', headerHeight = 'h-14', fill = false, pxPerMin = PX_PER_MIN, snapX = false, labelWidth = 'w-14' }) {
  const PPM = pxPerMin;
  const scrollRef = useRef(null);
  const scrolledFor = useRef(null);
  const [ghost, setGhost] = useState(null); // { col, lane, minute }
  const anyToday = columns.some((c) => c.isToday);
  const nowMin = useNowMinute(tz, anyToday);
  const height = (endMin - startMin) * PPM;
  const columnsKey = columns.map((c) => c.key).join('|');
  // Open scrolled to the current time (today) or the start of the day.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolledFor.current === columnsKey) return;
    scrolledFor.current = columnsKey;
    const target = anyToday && nowMin !== null ? (nowMin - startMin) * PPM - 120 : 0;
    el.scrollTop = Math.max(0, target);
  }, [columnsKey, anyToday, nowMin, startMin]);
  const hours = [];
  for (let m = startMin; m <= endMin; m += 60) hours.push(m);
  const y = (m) => (m - startMin) * PPM;

  function pointerMinute(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = Math.floor((startMin + (e.clientY - rect.top) / PPM) / SNAP_MIN) * SNAP_MIN;
    return Math.max(startMin, Math.min(minute, endMin - SNAP_MIN));
  }
  function laneAt(e, col) {
    if (!col.lanes?.length) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = Math.min(col.lanes.length - 1, Math.floor(((e.clientX - rect.left) / rect.width) * col.lanes.length));
    return col.lanes[idx];
  }
  const inClosed = (col, minute) => !col.windows.some(([s, e]) => minute >= s && minute < e);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${fill ? 'h-full flex flex-col' : ''}`}>
      <div ref={scrollRef} className={fill ? 'flex-1 min-h-0 overflow-auto overscroll-contain' : 'overflow-x-auto'}
        style={snapX ? { scrollSnapType: 'x proximity', scrollPaddingLeft: labelWidth === 'w-11' ? '2.75rem' : '3.5rem' } : undefined}>
        <div className="flex min-w-full w-max">
          {/* Hour labels */}
          <div className={`sticky left-0 z-30 bg-white border-r border-gray-100 ${labelWidth} shrink-0`}>
            <div className={`${headerHeight} border-b border-gray-100 sticky top-0 z-10 bg-white`} />
            <div className="relative" style={{ height: height + TOP_PAD }}>
              {hours.map((m) => (
                <div key={m} className="absolute right-2 text-[11px] text-gray-400 tabular-nums leading-none"
                  style={{ top: y(m) + TOP_PAD - 5 }}>
                  {toHHMM(m % 1440)}
                </div>
              ))}
              {nowMin !== null && nowMin >= startMin && nowMin <= endMin && (
                <div className="absolute right-1 z-10 px-1 rounded bg-rose-500 text-white text-[10px] font-semibold tabular-nums leading-4"
                  style={{ top: y(nowMin) + TOP_PAD - 8 }}>
                  {toHHMM(nowMin)}
                </div>
              )}
            </div>
          </div>

          {columns.map((col) => {
            const closed = closedGaps(col.windows, startMin, endMin);
            const showGhost = ghost && ghost.col === col.key && col.onEmpty;
            return (
              <div key={col.key} className="flex-1 border-r border-gray-100 last:border-r-0" style={{ minWidth: minColWidth, scrollSnapAlign: snapX ? 'start' : undefined }}>
                <div className={`${headerHeight} border-b border-gray-100 flex items-center justify-center px-2 sticky top-0 z-[25] ${col.isToday ? 'bg-violet-50' : 'bg-white'}`}>
                  {col.header}
                </div>
                <div className="relative" style={{ height: height + TOP_PAD, paddingTop: TOP_PAD }}>
                  <div
                    className={`absolute inset-x-0 bottom-0 ${col.onEmpty ? 'cursor-pointer' : ''}`}
                    style={{ top: TOP_PAD }}
                    onMouseMove={(e) => col.onEmpty && setGhost({ col: col.key, lane: laneAt(e, col), minute: pointerMinute(e) })}
                    onMouseLeave={() => setGhost(null)}
                    onClick={(e) => col.onEmpty?.(pointerMinute(e), laneAt(e, col)?.key)}
                  >
                    {/* Closed stretches */}
                    {closed.map(([s, e]) => (
                      <div key={`c-${s}`} className="absolute inset-x-0 flex items-center justify-center"
                        style={{
                          top: y(s), height: y(e) - y(s),
                          backgroundImage: 'repeating-linear-gradient(135deg, #f8fafc 0, #f8fafc 6px, #f1f5f9 6px, #f1f5f9 12px)',
                        }}>
                        {y(e) - y(s) >= 36 && <span className="text-[11px] font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">Cerrado</span>}
                      </div>
                    ))}
                    {/* Hour and half-hour lines */}
                    {hours.map((m) => (
                      <div key={m} className="absolute inset-x-0 border-t border-gray-100 pointer-events-none" style={{ top: y(m) }} />
                    ))}
                    {hours.slice(0, -1).map((m) => (
                      <div key={`h-${m}`} className="absolute inset-x-0 border-t border-dashed border-gray-100/70 pointer-events-none" style={{ top: y(m + 30) }} />
                    ))}
                    {/* Ghost slot under the pointer */}
                    {showGhost && !inClosed(col, ghost.minute) && (
                      <div className="absolute z-0 rounded-lg border border-dashed border-violet-400 bg-violet-50/70 text-[11px] font-semibold text-violet-700 px-2 flex items-center pointer-events-none"
                        style={{
                          top: y(ghost.minute), height: 30 * PPM,
                          left: ghost.lane ? `calc(${ghost.lane.left} + 2px)` : 4,
                          width: ghost.lane ? `calc(${ghost.lane.width} - 4px)` : 'calc(100% - 8px)',
                        }}>
                        + {toHHMM(ghost.minute)}
                      </div>
                    )}
                    {/* Now line */}
                    {col.isToday && nowMin !== null && nowMin >= startMin && nowMin <= endMin && (
                      <div className="absolute inset-x-0 z-[5] pointer-events-none" style={{ top: y(nowMin) }}>
                        <div className="border-t-2 border-rose-500" />
                        <div className="absolute -left-1 -top-[5px] w-2.5 h-2.5 rounded-full bg-rose-500" />
                      </div>
                    )}
                    {col.blocks.map((b) => <div key={b.key}>{b.render}</div>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
