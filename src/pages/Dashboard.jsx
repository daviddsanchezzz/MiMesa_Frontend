import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: mon.toISOString().slice(0, 10),
    to:   sun.toISOString().slice(0, 10),
  };
}

function formatDayHeader(dateStr, today) {
  const d = new Date(dateStr + 'T12:00:00');
  const isToday = dateStr === today;
  const isTomorrow = dateStr === (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); })();
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
  const dayMonth = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const prefix = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return { prefix, dayMonth, isToday };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  pending:   { label: 'Pendiente',  badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',   dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', badge: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200', dot: 'bg-violet-500' },
  seated:    { label: 'Sentada',    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
  no_show:   { label: 'No show',    badge: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200',      dot: 'bg-rose-400' },
  cancelled: { label: 'Cancelada',  badge: 'bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200',     dot: 'bg-gray-300' },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  const COLORS = ['bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500'];
  const idx = (name?.charCodeAt(0) || 0) % COLORS.length;
  return (
    <div className={`w-9 h-9 rounded-full ${COLORS[idx]} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────
function QBtn({ onClick, children, variant = 'gray', loading }) {
  const cls = {
    gray:    'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-gray-200',
    green:   'text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-emerald-50/50',
    red:     'text-rose-600 hover:bg-rose-50 border-rose-200',
    violet:  'text-violet-700 hover:bg-violet-50 border-violet-200 bg-violet-50/50',
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

// ─── Reservation Card ─────────────────────────────────────────────────────────
function ReservationCard({ r, onStatusChange, onEdit }) {
  const [busy, setBusy] = useState(false);
  const st = STATUS[r.status] || STATUS.pending;

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      await api.put(`/reservations/${r._id}`, { status });
      onStatusChange();
    } finally {
      setBusy(false);
    }
  };

  const room = r.roomId?.name || r.tableId?.roomId?.name;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors group">
      <Avatar name={r.guestName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{r.guestName}</p>
          <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
            {st.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500 font-medium tabular-nums">{r.time}</span>
          <span className="text-gray-200 text-xs">·</span>
          <span className="text-xs text-gray-500">{r.people} {r.people === 1 ? 'persona' : 'personas'}</span>
          {r.tableId && (
            <>
              <span className="text-gray-200 text-xs">·</span>
              <span className="text-xs text-violet-600 font-medium">{r.tableId.name}</span>
            </>
          )}
          {room && !r.tableId && (
            <>
              <span className="text-gray-200 text-xs">·</span>
              <span className="text-xs text-gray-400">{room}</span>
            </>
          )}
          {r.notes && (
            <>
              <span className="text-gray-200 text-xs">·</span>
              <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{r.notes}</span>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {r.status === 'pending' && (
            <>
              <QBtn variant="green" onClick={() => changeStatus('confirmed')} loading={busy}>Confirmar</QBtn>
              <QBtn variant="red"   onClick={() => changeStatus('cancelled')} loading={busy}>Cancelar</QBtn>
            </>
          )}
          {r.status === 'confirmed' && (
            <>
              <QBtn variant="violet" onClick={() => changeStatus('seated')} loading={busy}>Sentar</QBtn>
              <QBtn variant="red"    onClick={() => changeStatus('cancelled')} loading={busy}>Cancelar</QBtn>
            </>
          )}
          {r.status === 'seated' && (
            <QBtn variant="gray" onClick={() => changeStatus('cancelled')} loading={busy}>Cancelar</QBtn>
          )}
          <QBtn variant="gray" onClick={() => onEdit(r)}>Editar</QBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Mini stat pill ────────────────────────────────────────────────────────────
function Pill({ label, value, color = 'gray' }) {
  const cls = {
    gray:   'bg-gray-100 text-gray-600',
    violet: 'bg-violet-50 text-violet-700',
    amber:  'bg-amber-50 text-amber-700',
    emerald:'bg-emerald-50 text-emerald-700',
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      <span className="text-sm font-bold tabular-nums">{value}</span>
      {label}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyDay({ onNew }) {
  return (
    <div className="py-10 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-300">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm text-gray-400">Sin reservas para este período</p>
      <button
        onClick={onNew}
        className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
      >
        + Crear la primera
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { business } = useAuth();
  const [view, setView] = useState('today'); // 'today' | 'week'
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editReservation, setEditReservation] = useState(null);

  const today = getToday();
  const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'today') {
        const r = await api.get(`/reservations?date=${today}`);
        setReservations(r.data);
      } else {
        const { from, to } = getWeekRange();
        const r = await api.get(`/reservations?from=${from}&to=${to}`);
        setReservations(r.data);
      }
    } finally {
      setLoading(false);
    }
  }, [view, today]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total     = reservations.length;
  const pending   = reservations.filter(r => r.status === 'pending').length;
  const confirmed = reservations.filter(r => r.status === 'confirmed').length;
  const seated    = reservations.filter(r => r.status === 'seated').length;
  const cancelled = reservations.filter(r => r.status === 'cancelled').length;

  // Week: group by date
  const byDate = reservations.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();

  // Week stats
  const todayCount    = reservations.filter(r => r.date === today).length;
  const tomorrow      = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const tomorrowCount = reservations.filter(r => r.date === tomorrow).length;

  const handleEdit = (r) => setEditReservation(r);
  const handleSaved = () => { setShowCreate(false); setEditReservation(null); load(); };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {business?.name}
          </h2>
          <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span className="hidden sm:inline">Nueva reserva</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* ── Period selector ── */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {[
          { key: 'today', label: 'Hoy' },
          { key: 'week',  label: 'Esta semana' },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              view === v.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Stats pills ── */}
      {!loading && total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'today' ? (
            <>
              <Pill value={total}     label="reservas"   color="gray" />
              {pending   > 0 && <Pill value={pending}   label="pendientes" color="amber" />}
              {confirmed > 0 && <Pill value={confirmed} label="confirmadas" color="violet" />}
              {seated    > 0 && <Pill value={seated}    label="sentadas"    color="emerald" />}
              {cancelled > 0 && <Pill value={cancelled} label="canceladas"  color="gray" />}
            </>
          ) : (
            <>
              <Pill value={total}         label="esta semana" color="gray" />
              {todayCount    > 0 && <Pill value={todayCount}    label="hoy"      color="violet" />}
              {tomorrowCount > 0 && <Pill value={tomorrowCount} label="mañana"   color="amber" />}
            </>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : view === 'today' ? (
        /* ── TODAY: flat list ordered by time ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {reservations.length === 0 ? (
            <EmptyDay onNew={() => setShowCreate(true)} />
          ) : (
            <div className="divide-y divide-gray-50">
              {reservations
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(r => (
                  <ReservationCard
                    key={r._id}
                    r={r}
                    onStatusChange={load}
                    onEdit={handleEdit}
                  />
                ))}
            </div>
          )}
        </div>
      ) : (
        /* ── WEEK: grouped by day ── */
        <div className="space-y-3">
          {sortedDates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <EmptyDay onNew={() => setShowCreate(true)} />
            </div>
          ) : (
            sortedDates.map(date => {
              const { prefix, dayMonth, isToday } = formatDayHeader(date, today);
              const rsvs = byDate[date] || [];
              return (
                <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Day header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 ${isToday ? 'bg-violet-50/60' : ''}`}>
                    <div className="flex items-center gap-2">
                      {isToday && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                      <span className={`text-sm font-bold ${isToday ? 'text-violet-700' : 'text-gray-800'}`}>
                        {prefix}
                      </span>
                      <span className="text-sm text-gray-400">{dayMonth}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 tabular-nums">
                      {rsvs.length} {rsvs.length === 1 ? 'reserva' : 'reservas'}
                    </span>
                  </div>
                  {/* Reservations */}
                  <div className="divide-y divide-gray-50">
                    {rsvs
                      .slice()
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map(r => (
                        <ReservationCard
                          key={r._id}
                          r={r}
                          onStatusChange={load}
                          onEdit={handleEdit}
                        />
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <Modal title="Nueva reserva" onClose={() => setShowCreate(false)}>
          <ReservationForm onSave={handleSaved} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
      {editReservation && (
        <Modal title="Editar reserva" onClose={() => setEditReservation(null)}>
          <ReservationForm
            reservation={editReservation}
            onSave={handleSaved}
            onCancel={() => setEditReservation(null)}
          />
        </Modal>
      )}
    </div>
  );
}
