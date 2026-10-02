import { useMemo } from 'react';
import TimeGrid, { AbsenceBlock, BookingBlock, PX_PER_MIN } from './TimeGrid';
import StaffAvatar from './StaffAvatar';
import { lineFor, nextBookingId, LineLegend } from './lineColors';
import { minutesInTz, toHHMM, windowsForDate, intersectWindows, layoutOverlaps, absenceSpan } from './utils';

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
 * hours (inside the business hours) and their appointments, coloured by state
 * like the list (lila next, green charged, amber unpaid, red cancelled, grey rest).
 */
export default function DayView({ date, tz, staff, bookings, absences = [], onAbsenceClick, businessSchedule, staffSchedules = {}, colors, isToday, onEmptyClick, onBookingClick, fill = false, compact = false }) {
  const ppm = compact ? 1.9 : PX_PER_MIN;
  const bizWindows = useMemo(() => windowsForDate(businessSchedule, date), [businessSchedule, date]);
  const windowsFor = (id) => (staffSchedules[id] ? intersectWindows(windowsForDate(staffSchedules[id], date), bizWindows) : bizWindows);
  const [startMin, endMin] = useMemo(() => visibleRange([bizWindows], bookings, tz), [bizWindows, bookings, tz]);

  // Same colour rule as the list: the colour tells the state, the column tells who
  const nextId = nextBookingId(bookings, isToday);
  const kinds = new Set(bookings.map((b) => lineFor(b, b._id === nextId)));

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
    // Absences per professional for this day, clipped to what is on screen.
    const awayBy = {};
    for (const a of absences) {
      const span = absenceSpan(a, date, tz);
      if (span) (awayBy[a.resourceId] ||= []).push({ a, s: Math.max(span[0], startMin), e: Math.min(span[1], endMin), full: span[0] <= startMin && span[1] >= endMin });
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
            <p className="text-[11px] text-gray-500 leading-tight">
              {(awayBy[id] || []).some((x) => x.full) ? 'Ausente' : count[id] ? `${count[id]} ${count[id] === 1 ? 'cita' : 'citas'}` : 'Libre'}
            </p>
          </div>
        </div>
      ),
      onEmpty: id === UNASSIGNED ? undefined : (minute) => onEmptyClick?.(id, toHHMM(minute), date),
      blocks: [...(awayBy[id] || []).filter((x) => x.e > x.s).map(({ a, s: as, e: ae }) => ({
        key: `away-${a._id}`,
        render: <AbsenceBlock absence={a} top={(as - startMin) * ppm} height={Math.max(22, (ae - as) * ppm)} onClick={onAbsenceClick} />,
      })), ...layoutOverlaps((byCol[id] || []).map(({ booking, segment }) => ({
        booking, segment, start: minutesInTz(segment.start, tz), end: minutesInTz(segment.start, tz) + (new Date(segment.end) - new Date(segment.start)) / 60000,
      }))).map(({ booking, segment, start, end, col, cols }) => {
        const top = (start - startMin) * ppm;
        const height = Math.max(26, (end - start) * ppm);
        const w = 100 / cols;
        return {
          key: `${booking._id}-${segment._id}-${id}`,
          render: <BookingBlock booking={booking} segment={segment} tz={tz} top={top} height={height} color={colors[id] || '#9ca3af'} kind={lineFor(booking)} isNext={booking._id === nextId}
            left={`calc(${col * w}% + 4px)`} width={`calc(${w}% - 8px)`} onClick={onBookingClick} />,
        };
      })],
    });
    const cols = staff.map((s) => make(s._id, s.name, s.photo));
    if (byCol[UNASSIGNED]) cols.push(make(UNASSIGNED, 'Sin profesional'));
    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, absences, staff, startMin, endMin, tz, colors, bizWindows, staffSchedules, isToday, date, nextId, ppm]);

  if (!columns.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        Aún no hay profesionales. Añádelos en <span className="font-semibold">Configuración</span>.
      </div>
    );
  }
  // Phones: one person per screen (the next one peeks in), slide sideways to the others.
  const minColWidth = compact ? (columns.length === 1 ? '0px' : 'calc(100vw - 6.75rem)') : '11rem';
  return (
    <div className={fill ? 'h-full flex flex-col gap-2' : 'space-y-2'}>
      <div className={fill ? 'flex-1 min-h-0' : ''}>
        <TimeGrid columns={columns} startMin={startMin} endMin={endMin} tz={tz} fill={fill} minColWidth={minColWidth}
          pxPerMin={ppm} snapX={compact && columns.length > 1} labelWidth={compact ? 'w-11' : 'w-14'} />
      </div>
      <div className="shrink-0"><LineLegend kinds={kinds} /></div>
    </div>
  );
}
