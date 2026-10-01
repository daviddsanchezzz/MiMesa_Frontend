import { TONES, bookingTone, toneLabel } from '../../lib/status';

/**
 * The colour of an appointment tells its state, the same in the list, the
 * day view and in the restaurant (see lib/status): amber dashed = to confirm,
 * violet = confirmed, green = has arrived, orange = attended but not charged,
 * slate = charged, red = no-show, light grey = cancelled.
 */
export const LINE = Object.fromEntries(Object.entries(TONES).map(([k, t]) => [k, { ...t, label: toneLabel(k) }]));

// isNext is kept for callers; the next appointment is marked with a ring, not a colour.
export function lineFor(b) {
  return bookingTone(b);
}

/** Today's first appointment that hasn't finished (and isn't cancelled). */
export function nextBookingId(bookings, isToday, now = new Date()) {
  if (!isToday) return null;
  return [...bookings]
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .find((b) => new Date(b.end) > now && !['cancelled', 'no_show'].includes(b.status))?._id || null;
}

/** Only the colours that appear. */
export function LineLegend({ kinds }) {
  const shown = Object.entries(LINE).filter(([k]) => kinds.has(k));
  if (shown.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] text-gray-500">
      {shown.map(([k, l]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={l.dashed ? { border: `2px dashed ${l.color}` } : { backgroundColor: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  );
}
