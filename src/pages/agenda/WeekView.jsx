import { useMemo } from 'react';
import TimeGrid, { BookingBlock, PX_PER_MIN } from './TimeGrid';
import { visibleRange } from './DayView';
import { addDays, dateInTz, minutesInTz, toHHMM, windowsForDate, layoutOverlaps } from './utils';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Seven days side by side. Inside each day every professional has a thin lane
 * in their colour, so overlapping appointments never hide each other.
 */
export default function WeekView({ from, today, tz, staff, bookings, businessSchedule, colors, onEmptyClick, onBookingClick, onDayClick }) {
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(from, i)), [from]);
  const windowsByDate = useMemo(() => Object.fromEntries(dates.map((d) => [d, windowsForDate(businessSchedule, d)])), [dates, businessSchedule]);
  const [startMin, endMin] = useMemo(() => visibleRange(Object.values(windowsByDate), bookings, tz), [windowsByDate, bookings, tz]);

  const columns = useMemo(() => {
    const n = Math.max(1, staff.length);
    const lanes = staff.map((s, i) => ({ key: s._id, left: `${(i / n) * 100}%`, width: `${100 / n}%` }));
    const laneIndex = Object.fromEntries(staff.map((s, i) => [s._id, i]));
    return dates.map((d) => {
      const dayBookings = bookings.filter((b) => dateInTz(b.start, tz) === d);
      const live = dayBookings.filter((b) => !['cancelled', 'no_show'].includes(b.status)).length;
      const [y, m, dd] = d.split('-').map(Number);
      const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
      const byLane = {};
      for (const b of dayBookings) {
        for (const seg of b.segments || []) {
          const ids = (seg.resourceIds || []).filter((id) => id in laneIndex);
          for (const id of ids.length ? ids : [null]) {
            const start = minutesInTz(seg.start, tz);
            (byLane[id || '_'] ||= []).push({ b, seg, id, start, end: start + (new Date(seg.end) - new Date(seg.start)) / 60000 });
          }
        }
      }
      const blocks = [];
      for (const items of Object.values(byLane)) {
        for (const { b, seg, id, start, end, col, cols } of layoutOverlaps(items)) {
          const i = id ? laneIndex[id] : 0;
          const laneW = 100 / n;
          const w = laneW / cols;
          blocks.push({
            key: `${b._id}-${seg._id}-${id}`,
            render: (
              <BookingBlock booking={b} segment={seg} tz={tz} dense
                top={(start - startMin) * PX_PER_MIN}
                height={Math.max(20, (end - start) * PX_PER_MIN)}
                left={`calc(${i * laneW + col * w}% + 1px)`} width={`calc(${w}% - 2px)`}
                color={(id && colors[id]) || '#9ca3af'} onClick={onBookingClick} />
            ),
          });
        }
      }
      return {
        key: d,
        isToday: d === today,
        windows: windowsByDate[d],
        lanes,
        header: (
          <button type="button" onClick={() => onDayClick?.(d)} className="text-center leading-tight rounded-lg px-2 py-1 hover:bg-gray-50">
            <span className={`block text-[11px] uppercase tracking-wide ${d === today ? 'text-violet-700 font-semibold' : 'text-gray-500'}`}>{DOW[dow]}</span>
            <span className={`block text-base font-bold ${d === today ? 'text-violet-700' : 'text-gray-900'}`}>{dd}</span>
            <span className="block text-[10px] text-gray-400">{live ? `${live} ${live === 1 ? 'cita' : 'citas'}` : '—'}</span>
          </button>
        ),
        onEmpty: (minute, laneKey) => onEmptyClick?.(laneKey || '', toHHMM(minute), d),
        blocks,
      };
    });
  }, [dates, bookings, tz, staff, colors, startMin, windowsByDate, today, onBookingClick, onEmptyClick, onDayClick]);

  return (
    <div className="space-y-2">
      {staff.length > 1 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {staff.map((s) => (
            <span key={s._id} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[s._id] }} />{s.name}
            </span>
          ))}
        </div>
      )}
      <TimeGrid columns={columns} startMin={startMin} endMin={endMin} tz={tz} minColWidth="7.5rem" headerHeight="h-16" />
    </div>
  );
}
