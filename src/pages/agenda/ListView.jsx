import StaffAvatar from './StaffAvatar';
import { timeInTz } from './utils';

const CHIP = {
  pending:    ['Pendiente', 'bg-amber-100 text-amber-800'],
  checked_in: ['Ha llegado', 'bg-sky-100 text-sky-800'],
  completed:  ['Atendida', 'bg-emerald-100 text-emerald-800'],
  cancelled:  ['Cancelada', 'bg-gray-100 text-gray-500'],
  no_show:    ['No vino', 'bg-rose-100 text-rose-700'],
};

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
  return (
    <ul className="space-y-2">
      {sorted.map((b) => {
        const staffIds = [...new Set(b.segments.flatMap((s) => s.resourceIds || []))].filter((id) => staffById[id]?.kind === 'staff');
        const person = staffById[staffIds[0]];
        const color = colors[staffIds[0]] || '#9ca3af';
        const past = new Date(b.end) <= now;
        const muted = ['cancelled', 'no_show'].includes(b.status);
        const chip = CHIP[b.status];
        return (
          <li key={b._id}>
            <button type="button" onClick={() => onBookingClick(b)}
              className={`w-full text-left bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 active:bg-gray-50 ${b._id === nextId ? 'border-violet-300 ring-2 ring-violet-100' : 'border-gray-200'} ${past && !muted ? 'opacity-70' : ''}`}>
              <div className="w-12 shrink-0 text-center">
                <p className={`text-base font-bold tabular-nums ${muted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{timeInTz(b.start, tz)}</p>
                <p className="text-[11px] text-gray-400 tabular-nums">{timeInTz(b.end, tz)}</p>
              </div>
              <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: muted ? '#e5e7eb' : color }} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{b.guestName}</p>
                <p className="text-xs text-gray-500 truncate">{b.segments.map((s) => s.serviceName).join(' + ')}</p>
                <div className="flex items-center gap-2 mt-1">
                  {b._id === nextId && <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-violet-100 text-violet-700">Siguiente</span>}
                  {chip && <span className={`text-[10px] font-semibold px-1.5 py-px rounded ${chip[1]}`}>{chip[0]}</span>}
                </div>
              </div>
              {person && <StaffAvatar name={person.name} photo={person.photo} color={color} size={30} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
