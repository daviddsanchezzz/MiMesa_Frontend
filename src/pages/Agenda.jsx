import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { bookingsApi, apiError } from '../services/bookingsApi';
import DayView from './agenda/DayView';
import WeekView from './agenda/WeekView';
import ListView from './agenda/ListView';
import DayStrip from './agenda/DayStrip';
import StaffAvatar from './agenda/StaffAvatar';
import NewBookingModal from './agenda/NewBookingModal';
import BookingDetailModal from './agenda/BookingDetailModal';
import AbsenceModal, { AbsenceDetailModal } from './agenda/AbsenceModal';
import {
  DEFAULT_TZ, addDays, btnPrimary, btnSecondary, dateInTz, euros, longDate, staffColors, todayIn, weekStart,
  windowsForDate, pluralize,
} from './agenda/utils';

const VIEW_KEY = 'vetra.agenda.view';
const SCOPE_KEY = 'vetra.agenda.scope';
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

function useIsMobile() {
  const query = '(max-width: 639px)';
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMobile(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return mobile;
}

function readView() {
  try { return localStorage.getItem(VIEW_KEY); } catch { return null; }
}

/**
 * Generic agenda (bookings module). Day view per professional, week view and,
 * on phones, a list. Tap an empty slot to book it; professionals, services
 * and hours are set up in Configuración.
 */
export default function Agenda() {
  const { business, hasRole, role } = useAuth();
  const tz = business?.timezone || DEFAULT_TZ;
  const isManager = hasRole('manager');
  const isMobile = useIsMobile();
  const today = todayIn(tz);
  const [searchParams, setSearchParams] = useSearchParams();

  const [date, setDate] = useState(() => (isDate(searchParams.get('date')) ? searchParams.get('date') : today));
  const [view, setView] = useState(() => readView() || (window.matchMedia('(max-width: 639px)').matches ? 'list' : 'day'));
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [staffSchedules, setStaffSchedules] = useState({});
  const [bookings, setBookings] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [blocking, setBlocking] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(null);   // { resourceId, time, date } | null
  const [selected, setSelected] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

  // Phones get the list instead of the grid; desktop keeps day/week.
  const activeView = isMobile ? (view === 'day' ? 'day' : 'list') : (view === 'list' ? 'day' : view);
  const chooseView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };

  // Links from the dashboard / sidebar: ?date=…, ?new=1&date=…&time=…&staff=…
  useEffect(() => {
    const d = searchParams.get('date');
    if (isDate(d)) setDate(d);
    if (searchParams.get('new')) {
      setCreating({
        resourceId: searchParams.get('staff') || '', time: searchParams.get('time') || '', date: isDate(d) ? d : null,
        guest: { guestName: searchParams.get('name') || '', guestPhone: searchParams.get('phone') || '', guestEmail: searchParams.get('email') || '' },
      });
    }
    if (d || searchParams.get('new')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useSetMobileHeader({ title: 'Agenda', action: { label: 'Cita', onClick: () => openNew('', '', date) } });

  const loadSetup = useCallback(async () => {
    const [r, s, sch] = await Promise.all([bookingsApi.resources(), bookingsApi.services(), bookingsApi.schedule()]);
    setResources(r);
    setServices(s);
    setSchedule(sch);
    const staff = r.filter((x) => x.kind === 'staff');
    const own = await Promise.all(staff.map((x) => bookingsApi.schedule({ ownerType: 'resource', ownerId: x._id }).catch(() => null)));
    setStaffSchedules(Object.fromEntries(staff.map((x, i) => [x._id, own[i]?._id ? own[i] : null]).filter(([, v]) => v)));
  }, []);

  const from = weekStart(date);
  const to = addDays(from, 6);
  const loadBookings = useCallback(async () => {
    const [b, a] = await Promise.all([bookingsApi.list({ from, to }), bookingsApi.absences(from, to).catch(() => [])]);
    setBookings(b);
    setAbsences(a);
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadSetup().catch((err) => setError(apiError(err))).finally(() => setLoading(false));
  }, [loadSetup]);

  useEffect(() => {
    loadBookings().catch((err) => setError(apiError(err)));
    const t = setInterval(() => loadBookings().catch(() => {}), 2 * 60000);
    return () => clearInterval(t);
  }, [loadBookings]);

  const staff = useMemo(() => resources.filter((r) => r.kind === 'staff'), [resources]);
  // "Mi agenda": the professional linked to the logged-in user
  const me = useMemo(() => staff.find((r) => r.userId && r.userId === business?.userId) || null, [staff, business?.userId]);
  const [scope, setScopeRaw] = useState(() => { try { return localStorage.getItem(SCOPE_KEY) || ''; } catch { return ''; } });
  const setScope = (v) => { setScopeRaw(v); try { localStorage.setItem(SCOPE_KEY, v); } catch { /* ignore */ } };
  // Default: staff members start on their own agenda, managers on the whole team
  const scopeId = scope === 'all' ? null
    : scope && staff.some((r) => r._id === scope) ? scope
      : (!scope && me && role === 'staff') ? me._id : null;
  const shownStaff = useMemo(() => (scopeId ? staff.filter((r) => r._id === scopeId) : staff), [staff, scopeId]);
  const inScope = useCallback((b) => !scopeId || (b.segments || []).some((seg) => (seg.resourceIds || []).includes(scopeId)), [scopeId]);
  const byId = useMemo(() => Object.fromEntries(resources.map((r) => [r._id, r])), [resources]);
  const shownAbsences = useMemo(() => absences.filter((a) => !scopeId || a.resourceId === scopeId), [absences, scopeId]);
  // Anyone linked to a professional can block their own time; managers anybody's.
  const canBlock = isManager || !!me;
  const colors = useMemo(() => staffColors(resources), [resources]);
  const visibleWeek = useMemo(() => bookings.filter((b) => (showCancelled || b.status !== 'cancelled') && inScope(b)), [bookings, showCancelled, inScope]);
  const dayBookings = useMemo(() => visibleWeek.filter((b) => dateInTz(b.start, tz) === date), [visibleWeek, date, tz]);
  const counts = useMemo(() => {
    const out = {};
    for (const b of bookings) {
      if (['cancelled', 'no_show'].includes(b.status)) continue;
      const d = dateInTz(b.start, tz);
      out[d] = (out[d] || 0) + 1;
    }
    return out;
  }, [bookings, tz]);
  const closedDays = useMemo(() => new Set(
    Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter((d) => !windowsForDate(schedule, d).length),
  ), [from, schedule]);
  const dayTotal = useMemo(() => {
    const live = dayBookings.filter((b) => !['cancelled', 'no_show'].includes(b.status));
    return { n: live.length, revenue: live.reduce((s, b) => s + (b.totalPrice || 0), 0) };
  }, [dayBookings]);

  const openNew = (resourceId = '', time = '', d = null) => setCreating({ resourceId, time, date: d });

  const views = isMobile ? [['list', 'Lista'], ['day', 'Día']] : [['day', 'Día'], ['week', 'Semana']];

  // Day/week: the page fits the screen and only the grid scrolls.
  const ready = !loading && staff.length > 0 && services.length > 0;
  const fill = ready && activeView !== 'list';
  const rootRef = useRef(null);
  const [fitHeight, setFitHeight] = useState(null);
  useLayoutEffect(() => {
    if (!fill) { setFitHeight(null); return undefined; }
    const measure = () => {
      const main = rootRef.current?.closest('main');
      if (!main) return;
      const cs = getComputedStyle(main);
      setFitHeight(Math.max(420, main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [fill]);

  return (
    <div ref={rootRef} className={fill ? 'flex flex-col gap-3' : 'space-y-4'} style={fill && fitHeight ? { height: fitHeight } : undefined}>
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="hidden xl:block text-xl font-bold text-gray-900">Agenda</h2>
          <p className="text-[13px] sm:text-sm leading-snug text-gray-500 sm:mt-0.5">
            {activeView === 'week' ? `Semana del ${Number(from.slice(8))} al ${Number(to.slice(8))}` : longDate(date)}
            {activeView !== 'week' && dayTotal.n > 0 && <> · {pluralize(dayTotal.n, 'cita', 'citas')} · {euros(dayTotal.revenue)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-gray-100" role="tablist" aria-label="Vista">
            {views.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={activeView === key} onClick={() => chooseView(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeView === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={`${btnPrimary} hidden xl:inline-flex`} onClick={() => openNew('', '', date)}>Nueva cita</button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (!staff.length || !services.length) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-base font-semibold text-gray-900">Prepara tu agenda</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Para empezar a dar citas necesitas {!staff.length ? 'añadir al menos un profesional' : ''}
            {!staff.length && !services.length ? ' y ' : ''}{!services.length ? 'crear al menos un servicio' : ''}.
            Revisa también tu horario de apertura.
          </p>
          {isManager ? (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {!staff.length && <Link to="/configuracion?tab=profesionales" className={btnPrimary}>Añadir profesionales</Link>}
              {!services.length && <Link to="/configuracion?tab=servicios" className={staff.length ? btnPrimary : btnSecondary}>Crear servicios</Link>}
              <Link to="/configuracion?tab=horario" className={btnSecondary}>Horario</Link>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Pide a un encargado que lo configure.</p>
          )}
        </div>
      ) : (
        <>
          {(staff.length > 1 || canBlock) && (
            <div className="shrink-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" role="tablist" aria-label="Qué agenda ver">
              {staff.length > 1 && [{ id: 'all', label: 'Todo el equipo' }, ...(me ? [{ id: me._id, label: 'Mi agenda', person: me }] : []),
                ...staff.filter((r) => r._id !== me?._id).map((r) => ({ id: r._id, label: r.name, person: r }))].map((o) => {
                const active = (o.id === 'all' && !scopeId) || o.id === scopeId;
                return (
                  <button key={o.id} type="button" role="tab" aria-selected={active} onClick={() => setScope(o.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'} ${o.person ? '' : 'pl-3'}`}>
                    {o.person && <StaffAvatar name={o.person.name} photo={o.person.photo} color={colors[o.person._id]} size={20} />}
                    {o.label}
                  </button>
                );
              })}
              {canBlock && (
                <button type="button" onClick={() => setBlocking(true)}
                  className="shrink-0 ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800">
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="7" /><path d="M5 15 15 5" strokeLinecap="round" /></svg>
                  Ausencia
                </button>
              )}
            </div>
          )}
          <div className="shrink-0">
            <DayStrip date={date} today={today} counts={counts} closedDays={closedDays} onChange={setDate}
              extra={(
                <label className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                  <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
                  Canceladas
                </label>
              )} />
          </div>
          {activeView === 'list' && (
            <label className="md:hidden flex items-center justify-end gap-1.5 text-xs text-gray-500">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
              Ver canceladas
            </label>
          )}

          {activeView === 'week' && (
            <div className="flex-1 min-h-0"><WeekView fill from={from} today={today} tz={tz} staff={shownStaff} bookings={visibleWeek} absences={shownAbsences} onAbsenceClick={setSelectedAbsence} businessSchedule={schedule}
              colors={colors} onBookingClick={setSelected}
              onEmptyClick={(resourceId, time, d) => openNew(resourceId, time, d)}
              onDayClick={(d) => { setDate(d); chooseView('day'); }} /></div>
          )}
          {activeView === 'day' && (
            <div className="flex-1 min-h-0"><DayView fill compact={isMobile} date={date} tz={tz} staff={shownStaff} bookings={dayBookings} absences={shownAbsences} onAbsenceClick={setSelectedAbsence} businessSchedule={schedule}
              staffSchedules={staffSchedules} colors={colors} isToday={date === today}
              onEmptyClick={(resourceId, time) => openNew(resourceId, time, date)} onBookingClick={setSelected} /></div>
          )}
          {activeView === 'list' && (
            <ListView tz={tz} date={date} bookings={dayBookings} absences={shownAbsences} onAbsenceClick={setSelectedAbsence} staffById={byId} colors={colors} isToday={date === today}
              onBookingClick={setSelected} onNew={() => openNew('', '', date)} />
          )}
        </>
      )}

      {creating && !loading && (
        <NewBookingModal
          date={creating.date || date}
          time={creating.time}
          resourceId={creating.resourceId}
          guest={creating.guest}
          services={services}
          staff={staff}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); loadBookings(); }}
        />
      )}
      {blocking && (
        <AbsenceModal staff={staff} me={me} isManager={isManager} date={date} tz={tz} colors={colors}
          onClose={() => setBlocking(false)}
          onChanged={() => loadBookings().catch(() => {})}
          onSaved={() => { setBlocking(false); loadBookings().catch(() => {}); }} />
      )}
      {selectedAbsence && (
        <AbsenceDetailModal absence={selectedAbsence} person={byId[selectedAbsence.resourceId]}
          canRemove={isManager || (me && me._id === selectedAbsence.resourceId)}
          onClose={() => setSelectedAbsence(null)}
          onRemoved={() => { setSelectedAbsence(null); loadBookings().catch(() => {}); }} />
      )}
      {selected && (
        <BookingDetailModal
          booking={selected}
          staffById={byId}
          colors={colors}
          tz={tz}
          onClose={() => setSelected(null)}
          onChanged={(updated) => { setSelected(updated); loadBookings(); }}
        />
      )}
    </div>
  );
}
