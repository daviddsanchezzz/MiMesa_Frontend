/**
 * The colour of an appointment tells its state, the same in the list and in
 * the day view: lila = next / in progress, green = charged, amber = attended
 * but not charged, red = cancelled or no-show, dashed grey = to confirm,
 * grey = the rest.
 */
export const LINE = {
  next:     { color: '#7c3aed', label: 'Siguiente / en curso' },
  paid:     { color: '#10b981', label: 'Cobrada' },
  unpaid:   { color: '#f59e0b', label: 'Atendida sin cobrar' },
  lost:     { color: '#f43f5e', label: 'No vino o cancelada' },
  pending:  { color: '#9ca3af', label: 'Por confirmar', dashed: true },
  other:    { color: '#d1d5db', label: 'Resto' },
};

export function lineFor(b, isNext) {
  if (['cancelled', 'no_show'].includes(b.status)) return 'lost';
  if (b.status === 'completed' || b.payment) return b.payment ? 'paid' : 'unpaid';
  if (isNext || b.status === 'checked_in') return 'next';
  if (b.status === 'pending') return 'pending';
  return 'other';
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
  const shown = Object.entries(LINE).filter(([k]) => k !== 'other' && kinds.has(k));
  if (!shown.length) return null;
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
