import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import DayView from './agenda/DayView';
import NewBookingModal from './agenda/NewBookingModal';
import BookingDetailModal from './agenda/BookingDetailModal';
import SetupPanel from './agenda/SetupPanel';
import { DEFAULT_TZ, addDays, btnPrimary, btnSecondary, longDate, todayIn } from './agenda/utils';

/**
 * Generic agenda (bookings module): day view per professional, new bookings,
 * booking details, and the setup of professionals, services and hours.
 */
export default function Agenda() {
  const { business, hasRole } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const isManager = hasRole('manager');

  const [tab, setTab] = useState('agenda');
  const [date, setDate] = useState(() => todayIn(tz));
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(null);   // { resourceId, time } | null
  const [selected, setSelected] = useState(null);   // booking | null
  const [showCancelled, setShowCancelled] = useState(false);

  useSetMobileHeader({ title: 'Agenda' });

  const loadSetup = useCallback(async () => {
    const [r, s, sch] = await Promise.all([bookingsApi.resources(), bookingsApi.services(), bookingsApi.schedule()]);
    setResources(r);
    setServices(s);
    setSchedule(sch);
  }, []);

  const loadBookings = useCallback(async () => {
    setBookings(await bookingsApi.list({ from: date, to: date }));
  }, [date]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadSetup().catch((err) => setError(apiError(err))).finally(() => setLoading(false));
  }, [loadSetup]);

  useEffect(() => {
    loadBookings().catch((err) => setError(apiError(err)));
  }, [loadBookings]);

  const staff = useMemo(() => resources.filter((r) => r.kind === 'staff'), [resources]);
  const byId = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);
  const visible = useMemo(
    () => bookings.filter((b) => showCancelled || b.status !== 'cancelled'),
    [bookings, showCancelled],
  );
  const counts = useMemo(() => {
    const active = bookings.filter((b) => !['cancelled', 'no_show'].includes(b.status));
    return { total: active.length, revenue: active.reduce((s, b) => s + (b.totalPrice || 0), 0) };
  }, [bookings]);

  const today = todayIn(tz);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
          <p className="text-sm text-gray-400 mt-0.5">Citas por profesional, servicios y horarios.</p>
        </div>
        {isManager && (
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[['agenda', 'Agenda'], ['setup', 'Configuración']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : tab === 'setup' ? (
        <SetupPanel resources={resources} services={services} reload={() => loadSetup().then(loadBookings)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnSecondary} onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
            <button type="button" className={btnSecondary} onClick={() => setDate(today)} disabled={date === today}>Hoy</button>
            <button type="button" className={btnSecondary} onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">›</button>
            <input type="date" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <span className="text-sm font-semibold text-gray-800">{longDate(date)}</span>
            <span className="text-xs text-gray-400">{counts.total} {counts.total === 1 ? 'cita' : 'citas'}</span>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
              Ver canceladas
            </label>
            <button type="button" className={btnPrimary} onClick={() => setCreating({ resourceId: '', time: '' })}>Nueva cita</button>
          </div>

          <DayView
            date={date}
            tz={tz}
            staff={staff}
            bookings={visible}
            businessSchedule={schedule}
            isToday={date === today}
            onEmptyClick={(resourceId, time) => setCreating({ resourceId, time })}
            onBookingClick={setSelected}
          />
        </>
      )}

      {creating && (
        <NewBookingModal
          date={date}
          time={creating.time}
          resourceId={creating.resourceId}
          services={services}
          staff={staff}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); loadBookings(); }}
        />
      )}
      {selected && (
        <BookingDetailModal
          booking={selected}
          staffById={byId}
          tz={tz}
          onClose={() => setSelected(null)}
          onChanged={(updated) => { setSelected(updated); loadBookings(); }}
        />
      )}
    </div>
  );
}
