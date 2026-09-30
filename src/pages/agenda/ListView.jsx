import StaffAvatar from './StaffAvatar';
import { timeInTz } from './utils';

// The colored line tells the state; no badges.
const LINE = {
  next:     { color: '#7c3aed', label: 'Siguiente / en curso' },
  paid:     { color: '#10b981', label: 'Cobrada' },
  unpaid:   { color: '#f59e0b', label: 'Atendida sin cobrar' },
  lost:     { color: '#f43f5e', label: 'No vino o cancelada' },
  pending:  { color: '#d1d5db', label: 'Por confirmar', dashed: true },
  other:    { color: '#d1d5db', label: 'Resto' },
};

function lineFor(b, isNext) {
  if (['cancelled', 'no_show'].includes(b.status)) return 'lost';
  if (b.status === 'completed' || b.payment) return b.payment ? 'paid' : 'unpaid';
  if (isNext || b.status === 'checked_in') return 'next';
  if (b.status === 'pending') return 'pending';
  return 'other';
}

function Line({ kind }) {
  const l = LINE[kind];
  return (
    <span className="w-1 self-stretch rounded-full shrink-0" aria-hidden="true"
      style={l.dashed
        ? { backgroundImage: `repeating-linear-gradient(to bottom, ${l.color} 0 5px, transparent 5px 9px)` }
        : { backgroundColor: l.color }} />
  );
}

/** The day as a list: what a phone needs (big touch targets, no tiny grid). */
export default function ListView({ tz, bookings, staffById, colors, onBookingClick, onNew, isToday }) {
  const now = Date.now();
  const sorted = [...bookings].sort((a, b) => new Date(a.start) - new Date(b.start));
  if (!sorted.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No hay citas este día.</p>
        <button type="button" onClick={onNew} className="mt-3 text-sm font-semibold text-violet-600">+ Dar una cita</button>
      </div>
    );
  }
  const nextId = isToday ? sorted.find((b) => new Date(b.end) > now && !['cancelled', 'no_show'].includes(b.status))?._id : null;
  const shown = new Set(sorted.map((b) => lineFor(b, b._id === nextId)));
  return (
    <div className="space-y-3">
    <ul className="space-y-2">
      {sorted.map((b) => {
        const staffIds = [...new Set(b.segments.flatMap((s) => s.resourceIds || []))].filter((id) => staffById[id]?.kind === 'staff');
        const person = staffById[staffIds[0]];
        const color = colors[staffIds[0]] || '#9ca3af';
        const past = new Date(b.end) <= now;
        const muted = ['cancelled', 'no_show'].includes(b.status);
        const kind = lineFor(b, b._id === nextId);
        return (
          <li key={b._id}>
            <button type="button" onClick={() => onBookingClick(b)}
              className={`w-full text-left bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 active:bg-gray-50 ${b._id === nextId ? 'border-violet-300 ring-2 ring-violet-100' : 'border-gray-200'}`}>
              <div className="w-12 shrink-0 text-center">
                <p className={`text-base font-bold tabular-nums ${muted ? 'text-gray-400 line-through' : past ? 'text-gray-500' : 'text-gray-900'}`}>{timeInTz(b.start, tz)}</p>
                <p className="text-[11px] text-gray-400 tabular-nums">{timeInTz(b.end, tz)}</p>
              </div>
              <Line kind={kind} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${muted ? 'text-gray-400' : past ? 'text-gray-600' : 'text-gray-900'}`}>{b.guestName}</p>
                <p className="text-xs text-gray-500 truncate">{b.segments.map((s) => s.serviceName).join(' + ')}</p>
                <span className="sr-only">{LINE[kind].label}</span>
              </div>
              {person && <StaffAvatar name={person.name} photo={person.photo} color={color} size={30} />}
            </button>
          </li>
        );
      })}
    </ul>
      {/* Legend: only the colors that appear today */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] text-gray-500">
        {Object.entries(LINE).filter(([k]) => k !== 'other' && shown.has(k)).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={l.dashed ? { border: `2px dashed ${l.color}` } : { backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
