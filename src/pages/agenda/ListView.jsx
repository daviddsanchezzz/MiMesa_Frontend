import StaffAvatar from './StaffAvatar';
import { absenceSpan, absenceText, timeInTz, toHHMM, minutesInTz } from './utils';
import { lineFor, nextBookingId, LineLegend } from './lineColors';
import { TimeRow } from '../../ui/kit';

const PARTS = [
  { key: 'morning', label: 'Mañana', test: (m) => m < 14 * 60 + 30 },
  { key: 'afternoon', label: 'Tarde', test: (m) => m >= 14 * 60 + 30 },
];

/**
 * The day as a list (what a phone needs): grouped in Mañana / Tarde, time big
 * on the left, absences in their place in the day (not on top) and only once.
 */
export default function ListView({ tz, date, bookings, absences = [], staffById, colors, onBookingClick, onAbsenceClick, onNew, isToday }) {
  const now = Date.now();
  const sorted = [...bookings].sort((a, b) => new Date(a.start) - new Date(b.start));
  // The same absence can come twice (e.g. created twice): show it once.
  const seen = new Set();
  const away = absences
    .map((a) => ({ a, span: absenceSpan(a, date, tz) }))
    .filter((x) => x.span)
    .filter(({ a, span }) => {
      const key = `${a.resourceId}|${span[0]}|${span[1]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const items = [
    ...sorted.map((b) => ({ kind: 'booking', at: minutesInTz(b.start, tz), b })),
    ...away.map(({ a, span }) => ({ kind: 'away', at: a.allDay ? -1 : span[0], a, span })),
  ].sort((x, y) => x.at - y.at);

  if (!sorted.length && !away.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500">No hay citas este día.</p>
        <button type="button" onClick={onNew} className="mt-3 text-sm font-semibold text-violet-700">+ Dar una cita</button>
      </div>
    );
  }

  const nextId = nextBookingId(sorted, isToday, now);
  const shown = new Set(sorted.map((b) => lineFor(b)));

  const row = (it) => {
    if (it.kind === 'away') {
      const person = staffById[it.a.resourceId];
      return (
        <li key={`a-${it.a._id}`}>
          <button type="button" onClick={() => onAbsenceClick?.(it.a)}
            className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl text-left hover:bg-gray-50"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(156,163,175,0.13) 0 6px, transparent 6px 12px)' }}>
            <span className="w-12 shrink-0 text-right text-[13px] font-semibold text-gray-500 tabular-nums">{it.a.allDay ? 'Día' : toHHMM(it.span[0])}</span>
            <span className="w-[3px] self-stretch rounded-full bg-gray-300 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-600 truncate">{person?.name || 'Profesional'} no está</span>
              <span className="block text-xs text-gray-500 truncate">{absenceText(it.a)}{it.a.reason ? ` · ${it.a.reason}` : ''}</span>
            </span>
            {person && <StaffAvatar name={person.name} photo={person.photo} color={colors[it.a.resourceId]} size={26} />}
          </button>
        </li>
      );
    }
    const b = it.b;
    const staffIds = [...new Set(b.segments.flatMap((s) => s.resourceIds || []))].filter((id) => staffById[id]?.kind === 'staff');
    const person = staffById[staffIds[0]];
    return (
      <TimeRow key={b._id}
        time={timeInTz(b.start, tz)} end={timeInTz(b.end, tz)}
        tone={lineFor(b)}
        highlight={b._id === nextId}
        muted={['cancelled', 'no_show'].includes(b.status) || undefined}
        title={b.guestName}
        subtitle={b.segments.map((s) => s.serviceName).join(' + ')}
        trailing={person && <StaffAvatar name={person.name} photo={person.photo} color={colors[staffIds[0]] || '#9ca3af'} size={28} />}
        onClick={() => onBookingClick(b)}
      />
    );
  };

  const groups = PARTS.map((p) => ({ ...p, items: items.filter((it) => p.test(Math.max(0, it.at))) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="flex items-baseline justify-between border-b border-gray-200 pb-1.5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{g.label}</h3>
            <span className="text-xs text-gray-400">{g.items.filter((it) => it.kind === 'booking' && !['cancelled', 'no_show'].includes(it.b.status)).length} citas</span>
          </div>
          <ul className="divide-y divide-gray-100">{g.items.map(row)}</ul>
        </section>
      ))}
      <LineLegend kinds={shown} />
    </div>
  );
}
