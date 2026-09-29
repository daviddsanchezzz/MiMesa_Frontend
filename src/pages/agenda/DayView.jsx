import { useMemo } from 'react';
import { STATUS, minutesInTz, timeInTz, toHHMM, windowsForDate } from './utils';

const PX_PER_MIN = 1.4;
const SNAP_MIN = 15;
const UNASSIGNED = '__none__';

/**
 * One day of the agenda: a column per professional, the business opening
 * hours as the background and each booking segment as a block.
 */
export default function DayView({ date, tz, staff, bookings, businessSchedule, isToday, onEmptyClick, onBookingClick }) {
  const windows = useMemo(() => windowsForDate(businessSchedule, date), [businessSchedule, date]);

  // Visible range: opening hours (rounded to the hour) and any booking outside them.
  const [startMin, endMin] = useMemo(() => {
    let s = windows.length ? Math.min(...windows.map((w) => w[0])) : 9 * 60;
    let e = windows.length ? Math.max(...windows.map((w) => w[1])) : 20 * 60;
    for (const b of bookings) {
      s = Math.min(s, minutesInTz(b.start, tz));
      e = Math.max(e, minutesInTz(b.end, tz) || 1440);
    }
    return [Math.floor(s / 60) * 60, Math.min(1440, Math.ceil(e / 60) * 60)];
  }, [windows, bookings, tz]);

  // Blocks per column. Segments without a professional go to an extra column.
  const { columns, blocks } = useMemo(() => {
    const staffIds = new Set(staff.map((s) => s._id));
    const byCol = {};
    let hasUnassigned = false;
    for (const b of bookings) {
      for (const seg of b.segments || []) {
        const cols = (seg.resourceIds || []).filter((id) => staffIds.has(id));
        if (!cols.length) { cols.push(UNASSIGNED); hasUnassigned = true; }
        for (const col of cols) {
          (byCol[col] ||= []).push({
            booking: b,
            segment: seg,
            top: (minutesInTz(seg.start, tz) - startMin) * PX_PER_MIN,
            height: Math.max(22, (new Date(seg.end) - new Date(seg.start)) / 60000 * PX_PER_MIN),
          });
        }
      }
    }
    const cols = staff.map((s) => ({ id: s._id, name: s.name }));
    if (hasUnassigned) cols.push({ id: UNASSIGNED, name: 'Sin profesional' });
    return { columns: cols, blocks: byCol };
  }, [bookings, staff, startMin, tz]);

  const hours = [];
  for (let m = startMin; m < endMin; m += 60) hours.push(m);
  const height = (endMin - startMin) * PX_PER_MIN;
  const nowMin = isToday ? minutesInTz(new Date().toISOString(), tz) : null;

  function handleColumnClick(e, colId) {
    if (colId === UNASSIGNED) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = Math.floor((startMin + y / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
    onEmptyClick?.(colId, toHHMM(Math.max(startMin, Math.min(minute, endMin - SNAP_MIN))));
  }

  if (!columns.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        Aún no hay profesionales. Añádelos en la pestaña <span className="font-semibold">Configuración</span>.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex min-w-full w-max">
          {/* Hour labels */}
          <div className="sticky left-0 z-20 bg-white border-r border-gray-100 w-14 shrink-0">
            <div className="h-11 border-b border-gray-100" />
            <div className="relative" style={{ height }}>
              {hours.map((m) => (
                <div key={m} className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-400 tabular-nums"
                  style={{ top: (m - startMin) * PX_PER_MIN }}>
                  {m > startMin ? toHHMM(m) : ''}
                </div>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.id} className="flex-1 min-w-[11rem] sm:min-w-[13rem] border-r border-gray-100 last:border-r-0">
              <div className="h-11 border-b border-gray-100 flex items-center justify-center px-2">
                <span className="text-sm font-semibold text-gray-800 truncate">{col.name}</span>
              </div>
              <div
                className={`relative ${col.id === UNASSIGNED ? '' : 'cursor-pointer'}`}
                style={{ height }}
                onClick={(e) => handleColumnClick(e, col.id)}
              >
                {/* Closed time shading */}
                <div className="absolute inset-0 bg-gray-50" />
                {windows.map(([s, e]) => (
                  <div key={`${s}-${e}`} className="absolute inset-x-0 bg-white"
                    style={{ top: (s - startMin) * PX_PER_MIN, height: (e - s) * PX_PER_MIN }} />
                ))}
                {/* Hour lines */}
                {hours.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-gray-100" style={{ top: (m - startMin) * PX_PER_MIN }} />
                ))}
                {nowMin !== null && nowMin >= startMin && nowMin <= endMin && (
                  <div className="absolute inset-x-0 z-10 border-t-2 border-rose-400" style={{ top: (nowMin - startMin) * PX_PER_MIN }} />
                )}
                {(blocks[col.id] || []).map(({ booking, segment, top, height: h }) => {
                  const st = STATUS[booking.status] || STATUS.confirmed;
                  return (
                    <button
                      key={`${booking._id}-${segment._id}`}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onBookingClick?.(booking); }}
                      className={`absolute left-1 right-1 z-10 rounded-lg border text-left px-2 py-1 overflow-hidden shadow-sm hover:shadow transition-shadow ${st.cls}`}
                      style={{ top, height: h }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">
                        {timeInTz(segment.start, tz)} · {booking.guestName}
                      </p>
                      {h > 34 && <p className="text-[11px] leading-tight truncate opacity-80">{segment.serviceName}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
