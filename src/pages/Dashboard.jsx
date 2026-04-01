import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';
import { ReservationCard } from '../components/ReservationCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getNextSevenDays() {
  const from = new Date();
  const to   = new Date();
  to.setDate(from.getDate() + 6);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

function formatDayHeader(dateStr, today) {
  const d = new Date(dateStr + 'T12:00:00');
  const tomorrow = (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); })();
  const weekday  = d.toLocaleDateString('es-ES', { weekday: 'long' });
  const dayMonth = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const isToday    = dateStr === today;
  const isTomorrow = dateStr === tomorrow;
  const prefix = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return { prefix, dayMonth, isToday };
}

// ─── Mini stat pill ───────────────────────────────────────────────────────────
function Pill({ label, value, color = 'gray' }) {
  const cls = {
    gray:    'bg-gray-100 text-gray-600',
    violet:  'bg-violet-50 text-violet-700',
    amber:   'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
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
    <div className="py-12 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-300">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm text-gray-400">Sin reservas para este período</p>
      <button onClick={onNew} className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
        + Crear la primera
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { business, hasRole } = useAuth();
  const canModeratePending = hasRole('manager');
  const canMarkNoShow      = hasRole('manager');

  const [view, setView]               = useState('today');
  const [reservations, setReservations] = useState([]);
  const [tables, setTables]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // null | { mode: 'create' | 'edit', reservation? }

  const today      = getToday();
  const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const tomorrow   = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'today') {
        const r = await api.get(`/reservations?date=${today}`);
        setReservations(r.data);
      } else {
        const { from, to } = getNextSevenDays();
        const r = await api.get(`/reservations?from=${from}&to=${to}`);
        setReservations(r.data);
      }
    } finally {
      setLoading(false);
    }
  }, [view, today]);

  useEffect(() => { loadReservations(); }, [loadReservations]);
  useEffect(() => { api.get('/tables').then(r => setTables(r.data)); }, []);

  // ── Callbacks ──
  const handleQuickStatus = async (id, status) => {
    await api.put(`/reservations/${id}`, { status });
    loadReservations();
  };
  const handleNoShow = async (id) => {
    await api.put(`/reservations/${id}/no-show`);
    loadReservations();
  };
  const handleCancel = async (id) => {
    await api.put(`/reservations/${id}`, { status: 'cancelled' });
    loadReservations();
  };
  const handleDelete = async (id) => {
    await api.delete(`/reservations/${id}`);
    loadReservations();
  };
  const handleAssign = async (id, tableIds) => {
    await api.put(`/reservations/${id}`, { tableIds: tableIds || [] });
    loadReservations();
  };

  // ── Stats ──
  const total     = reservations.length;
  const pending   = reservations.filter(r => r.status === 'pending').length;
  const confirmed = reservations.filter(r => r.status === 'confirmed').length;
  const seated    = reservations.filter(r => r.status === 'seated').length;
  const cancelled = reservations.filter(r => r.status === 'cancelled').length;
  const todayCount    = reservations.filter(r => r.date === today).length;
  const tomorrowCount = reservations.filter(r => r.date === tomorrow).length;

  // ── Week grouping ──
  const byDate = reservations.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();

  const sorted = (list) => [...list].sort((a, b) => a.time.localeCompare(b.time));

  const cardProps = (r) => ({
    r,
    tables,
    onQuickStatus: handleQuickStatus,
    onNoShow: handleNoShow,
    onCancel: () => handleCancel(r._id),
    onDelete: () => handleDelete(r._id),
    onAssign: handleAssign,
    onEdit: () => setModal({ mode: 'edit', reservation: r }),
    canModeratePending,
    canMarkNoShow,
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{business?.name}</h2>
          <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span className="hidden sm:inline">Nueva reserva</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {[{ key: 'today', label: 'Hoy' }, { key: 'week', label: 'Próximos 7 días' }].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              view === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stats pills */}
      {!loading && total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'today' ? (
            <>
              <Pill value={total}     label="reservas"   color="gray" />
              {pending   > 0 && <Pill value={pending}   label="pendientes"  color="amber" />}
              {confirmed > 0 && <Pill value={confirmed} label="confirmadas" color="violet" />}
              {seated    > 0 && <Pill value={seated}    label="sentadas"    color="emerald" />}
              {cancelled > 0 && <Pill value={cancelled} label="canceladas"  color="gray" />}
            </>
          ) : (
            <>
              <Pill value={total}         label="próximos 7d"  color="gray" />
              {todayCount    > 0 && <Pill value={todayCount}    label="hoy"     color="violet" />}
              {tomorrowCount > 0 && <Pill value={tomorrowCount} label="mañana"  color="amber" />}
            </>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-1 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="w-14 space-y-1.5">
                <div className="h-5 bg-gray-100 rounded w-full" />
                <div className="h-2.5 bg-gray-100 rounded w-2/3 mx-auto" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : view === 'today' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {reservations.length === 0
            ? <EmptyDay onNew={() => setModal({ mode: 'create' })} />
            : sorted(reservations).map(r => <ReservationCard key={r._id} {...cardProps(r)} />)
          }
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.length === 0
            ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <EmptyDay onNew={() => setModal({ mode: 'create' })} />
              </div>
            )
            : sortedDates.map(date => {
                const { prefix, dayMonth, isToday } = formatDayHeader(date, today);
                const rsvs = byDate[date] || [];
                return (
                  <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 ${isToday ? 'bg-violet-50/60' : ''}`}>
                      <div className="flex items-center gap-2">
                        {isToday && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                        <span className={`text-sm font-bold ${isToday ? 'text-violet-700' : 'text-gray-800'}`}>{prefix}</span>
                        <span className="text-sm text-gray-400">{dayMonth}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 tabular-nums">
                        {rsvs.length} {rsvs.length === 1 ? 'reserva' : 'reservas'}
                      </span>
                    </div>
                    {sorted(rsvs).map(r => <ReservationCard key={r._id} {...cardProps(r)} />)}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Modals */}
      {modal?.mode === 'create' && (
        <Modal title="Nueva reserva" onClose={() => setModal(null)}>
          <ReservationForm
            onSave={() => { setModal(null); loadReservations(); }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.mode === 'edit' && (
        <Modal title="Editar reserva" onClose={() => setModal(null)}>
          <ReservationForm
            reservation={modal.reservation}
            onSave={() => { setModal(null); loadReservations(); }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
