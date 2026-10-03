import { useMemo } from 'react';
import TimeGrid, { AbsenceBlock, BookingBlock, PX_PER_MIN } from './TimeGrid';
import StaffAvatar from './StaffAvatar';
import { lineFor, nextBookingId } from './lineColors';
import { euros, minutesInTz, toHHMM, windowsForDate, intersectWindows, layoutOverlaps, absenceSpan } from './utils';

const UNASSIGNED = '__none__';
const MIN_BLOCK_PX = 30;

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
export default function DayView({ date, tz, staff, bookings, absences = [], onAbsenceClick, businessSchedule, staffSchedules = {}, colors, isToday, onEmptyClick, onBookingClick, fill = false, compact = false, showRevenue = false }) {
  const ppm = compact ? 1.9 : PX_PER_MIN;
  const bizWindows = useMemo(() => windowsForDate(businessSchedule, date), [businessSchedule, date]);
  const windowsFor = (id) => (staffSchedules[id] ? intersectWindows(windowsForDate(staffSchedules[id], date), bizWindows) : bizWindows);
  const [startMin, endMin] = useMemo(() => visibleRange([bizWindows], bookings, tz), [bizWindows, bookings, tz]);

  // Same colour rule as the list: the colour tells the state, the column tells who
  const nextId = nextBookingId(bookings, isToday);

  const columns = useMemo(() => {
    const staffIds = new Set(staff.map((s) => s._id));
    const byCol = {};
    const count = {};
    const revenue = {};
    for (const b of bookings) {
      const seen = new Set();
      for (const seg of b.segments || []) {
        const cols = (seg.resourceIds || []).filter((id) => staffIds.has(id));
        if (!cols.length) cols.push(UNASSIGNED);
        for (const col of cols) {
          if (!seen.has(col) && !['cancelled', 'no_show'].includes(b.status)) {
            count[col] = (count[col] || 0) + 1;
            revenue[col] = (revenue[col] || 0) + (b.totalPrice || 0);
            seen.add(col);
          }
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
        <div className={`flex items-center min-w-0 ${compact ? 'gap-1.5' : 'gap-2'}`}>
          {id !== UNASSIGNED && <StaffAvatar name={name} photo={photo} color={colors[id]} size={compact ? 24 : 30} />}
          <div className={`min-w-0 text-left ${compact ? 'flex items-baseline gap-1 text-[12px] whitespace-nowrap' : ''}`}>
            <p className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold text-gray-900 truncate leading-tight`}>{name}</p>
            {compact && <span className="text-gray-300" aria-hidden="true">·</span>}
            <p className={`${compact ? 'truncate' : 'text-[11px]'} text-gray-500 leading-tight`}>
              {(awayBy[id] || []).some((x) => x.full)
                ? 'Ausente'
                : count[id]
                  ? <>{count[id]} {count[id] === 1 ? 'cita' : 'citas'}{showRevenue && <> · {euros(revenue[id])}</>}</>
                  : 'Libre'}
            </p>
          </div>
        </div>
      ),
      onEmpty: id === UNASSIGNED ? undefined : (minute) => onEmptyClick?.(id, toHHMM(minute), date),
      blocks: [...(awayBy[id] || []).filter((x) => x.e > x.s).map(({ a, s: as, e: ae }) => ({
        key: `away-${a._id}`,
        render: <AbsenceBlock absence={a} top={(as - startMin) * ppm} height={Math.max(22, (ae - as) * ppm)} onClick={onAbsenceClick} />,
      })), ...layoutOverlaps((byCol[id] || []).map(({ booking, segment }) => {
        const start = minutesInTz(segment.start, tz);
        const realEnd = start + (new Date(segment.end) - new Date(segment.start)) / 60000;
        // A very short appointment is drawn taller than its time so it can be read;
        // lay it out with that height so it sits beside the next one instead of under it.
        return { booking, segment, start, realEnd, end: Math.max(realEnd, start + MIN_BLOCK_PX / ppm) };
      })).map(({ booking, segment, start, realEnd, col, cols }) => {
        const top = (start - startMin) * ppm + 1;
        const height = Math.max(MIN_BLOCK_PX, (realEnd - start) * ppm) - 3;
        const w = 100 / cols;
        return {
          key: `${booking._id}-${segment._id}-${id}`,
          render: <BookingBlock booking={booking} segment={segment} tz={tz} top={top} height={height} color={colors[id] || '#9ca3af'} kind={lineFor(booking)} isNext={booking._id === nextId}
            left={`calc(${col * w}% + ${compact ? 2 : 4}px)`} width={`calc(${w}% - ${compact ? 4 : 8}px)`} onClick={onBookingClick} />,
        };
      })],
    });
    const cols = staff.map((s) => make(s._id, s.name, s.photo));
    if (byCol[UNASSIGNED]) cols.push(make(UNASSIGNED, 'Sin profesional'));
    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, absences, staff, startMin, endMin, tz, colors, bizWindows, staffSchedules, isToday, date, nextId, ppm, showRevenue]);

  if (!columns.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        Aún no hay profesionales. Añádelos en <span className="font-semibold">Configuración</span>.
      </div>
    );
  }
  // Phones: TimeGrid measures the available width and snaps to one full person.
  const minColWidth = compact ? (columns.length === 1 ? '0px' : 'calc(100vw - 6.75rem)') : '11rem';
  return (
    <div className={fill ? 'h-full flex flex-col gap-2' : 'space-y-2'}>
      <div className={fill ? 'flex-1 min-h-0' : ''}>
        <TimeGrid columns={compact && columns.length > 1
          // The last person fills the screen too, so sliding to her leaves no sliver of the previous one.
          ? columns.map((c, i) => (i === columns.length - 1 ? { ...c, fillView: true } : c))
          : columns} startMin={startMin} endMin={endMin} tz={tz} fill={fill} minColWidth={minColWidth}
          pxPerMin={ppm} snapX={compact && columns.length > 1} labelWidth={compact ? 'w-10' : 'w-14'}
          headerHeight={compact ? 'h-11' : 'h-14'} />
      </div>
    </div>
  );
}
