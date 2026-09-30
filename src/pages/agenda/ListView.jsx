import StaffAvatar from './StaffAvatar';
import { absenceSpan, absenceText, timeInTz, toHHMM } from './utils';
import { LINE, lineFor, nextBookingId, LineLegend } from './lineColors';

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
export default function ListView({ tz, date, bookings, absences = [], staffById, colors, onBookingClick, onAbsenceClick, onNew, isToday }) {
  const now = Date.now();
  const sorted = [...bookings].sort((a, b) => new Date(a.start) - new Date(b.start));
  const away = absences
    .map((a) => ({ a, span: absenceSpan(a, date, tz) }))
    .filter((x) => x.span)
    .sort((x, y) => x.span[0] - y.span[0]);
  const awayRows = away.length > 0 && (
    <ul className="space-y-2">
      {away.map(({ a, span }) => {
        const person = staffById[a.resourceId];
        return (
          <li key={a._id}>
            <button type="button" onClick={() => onAbsenceClick?.(a)}
              className="w-full text-left rounded-2xl border border-gray-200 px-4 py-2.5 flex items-center gap-3 text-gray-600"
              style={{ backgroundColor: '#f9fafb', backgroundImage: 'repeating-linear-gradient(135deg, rgba(156,163,175,0.18) 0 6px, transparent 6px 12px)' }}>
              <div className="w-12 shrink-0 text-center text-xs font-semibold tabular-nums">
                {a.allDay ? 'Día' : toHHMM(span[0])}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-700 truncate">{person?.name || 'Profesional'} · ausente</p>
                <p className="text-xs text-gray-500 truncate">{absenceText(a)}{a.reason ? ` · ${a.reason}` : ''}</p>
              </div>
              {person && <StaffAvatar name={person.name} photo={person.photo} color={colors[a.resourceId]} size={30} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
  if (!sorted.length) {
    return (
      <div className="space-y-3">
        {awayRows}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No hay citas este día.</p>
          <button type="button" onClick={onNew} className="mt-3 text-sm font-semibold text-violet-600">+ Dar una cita</button>
        </div>
      </div>
    );
  }
  const nextId = nextBookingId(sorted, isToday, now);
  const shown = new Set(sorted.map((b) => lineFor(b, b._id === nextId)));
  return (
    <div className="space-y-3">
    {awayRows}
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
      <LineLegend kinds={shown} />
    </div>
  );
}
