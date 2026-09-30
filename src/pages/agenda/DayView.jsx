import { useMemo } from 'react';
import TimeGrid, { BookingBlock, PX_PER_MIN } from './TimeGrid';
import StaffAvatar from './StaffAvatar';
import { minutesInTz, toHHMM, windowsForDate, intersectWindows, layoutOverlaps } from './utils';

const UNASSIGNED = '__none__';

// Visible hours: opening hours (whole hours) plus any booking outside them.
export function visibleRange(windowsList, bookings, tz) {
  const all = windowsList.flat();
  let s = all.length ? Math.min(...all.map((w) => w[0])) : 9 * 60;
  let e = all.length ? Math.max(...all.map((w) => w[1])) : 20 * 60;
  for (const b of bookings) {
    s = Math.min(s, minutesInTz(b.start, tz));
    e = Math.max(e, minutesInTz(b.end, tz) || 1440);
  }
  return [Math.floor(s / 60) * 60, Math.min(1440, Math.ceil(e / 60) * 60)];
}

/**
 * One day: a column per professional with their photo or initials, their own
 * hours (inside the business hours) and their appointments in their colour.
 */
export default function DayView({ date, tz, staff, bookings, businessSchedule, staffSchedules = {}, colors, isToday, onEmptyClick, onBookingClick, fill = false, compact = false }) {
  const bizWindows = useMemo(() => windowsForDate(businessSchedule, date), [businessSchedule, date]);
  const windowsFor = (id) => (staffSchedules[id] ? intersectWindows(windowsForDate(staffSchedules[id], date), bizWindows) : bizWindows);
  const [startMin, endMin] = useMemo(() => visibleRange([bizWindows], bookings, tz), [bizWindows, bookings, tz]);

  const columns = useMemo(() => {
    const staffIds = new Set(staff.map((s) => s._id));
    const byCol = {};
    const count = {};
    for (const b of bookings) {
      const seen = new Set();
      for (const seg of b.segments || []) {
        const cols = (seg.resourceIds || []).filter((id) => staffIds.has(id));
        if (!cols.length) cols.push(UNASSIGNED);
        for (const col of cols) {
          if (!seen.has(col) && !['cancelled', 'no_show'].includes(b.status)) { count[col] = (count[col] || 0) + 1; seen.add(col); }
          (byCol[col] ||= []).push({ booking: b, segment: seg });
        }
      }
    }
    const make = (id, name, photo) => ({
      key: id,
      isToday,
      windows: id === UNASSIGNED ? bizWindows : windowsFor(id),
      header: (
        <div className="flex items-center gap-2 min-w-0">
          {id !== UNASSIGNED && <StaffAvatar name={name} photo={photo} color={colors[id]} size={30} />}
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{name}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{count[id] ? `${count[id]} ${count[id] === 1 ? 'cita' : 'citas'}` : 'Libre'}</p>
          </div>
        </div>
      ),
      onEmpty: id === UNASSIGNED ? undefined : (minute) => onEmptyClick?.(id, toHHMM(minute), date),
      blocks: layoutOverlaps((byCol[id] || []).map(({ booking, segment }) => ({
        booking, segment, start: minutesInTz(segment.start, tz), end: minutesInTz(segment.start, tz) + (new Date(segment.end) - new Date(segment.start)) / 60000,
      }))).map(({ booking, segment, start, end, col, cols }) => {
        const top = (start - startMin) * PX_PER_MIN;
        const height = Math.max(22, (end - start) * PX_PER_MIN);
        const w = 100 / cols;
        return {
          key: `${booking._id}-${segment._id}-${id}`,
          render: <BookingBlock booking={booking} segment={segment} tz={tz} top={top} height={height} color={colors[id] || '#9ca3af'}
            left={`calc(${col * w}% + 4px)`} width={`calc(${w}% - 8px)`} onClick={onBookingClick} />,
        };
      }),
    });
    const cols = staff.map((s) => make(s._id, s.name, s.photo));
    if (byCol[UNASSIGNED]) cols.push(make(UNASSIGNED, 'Sin profesional'));
    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, staff, startMin, tz, colors, bizWindows, staffSchedules, isToday, date]);

  if (!columns.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        Aún no hay profesionales. Añádelos en <span className="font-semibold">Configuración</span>.
      </div>
    );
  }
  // Phones: one or two people fit the screen; more scroll sideways
  const minColWidth = compact ? (columns.length <= 2 ? '0px' : '8.5rem') : '11rem';
  return <TimeGrid columns={columns} startMin={startMin} endMin={endMin} tz={tz} fill={fill} minColWidth={minColWidth} />;
}
