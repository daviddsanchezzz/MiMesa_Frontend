import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';
import { ReservationCard, TableCell, Avatar, statusConfig } from '../components/ReservationCard';

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
function EmptyDay() {
  return (
    <div className="py-12 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-300">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm text-gray-400">Sin reservas para este período</p>
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
  const [modal, setModal]             = useState(null); // null | { reservation }
  const [expandedDesktopId, setExpandedDesktopId] = useState(null);

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

  const thead = (
    <>
      <colgroup>
        <col style={{ width: '27%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '11%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '22%' }} />
      </colgroup>
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
          <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hora</th>
          <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pax</th>
          <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sala</th>
          <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mesa</th>
          <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
          <th className="px-4 py-3.5"></th>
        </tr>
      </thead>
    </>
  );

  const renderDesktopRow = (r, i, arr) => {
    const s = statusConfig[r.status];
    const isExpanded = expandedDesktopId === r._id;
    return (
      <>
        <tr key={`${r._id}-main`}
          className={`hover:bg-gray-50/60 transition-colors ${i < arr.length - 1 && !isExpanded ? 'border-b border-gray-50' : ''}`}
        >
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={r.guestName} />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 leading-tight">{r.guestName}</p>
                  {r.customerId && <span title="Cliente registrado" className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{r.guestPhone || r.guestEmail || '—'}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3.5"><span className="font-semibold text-gray-800">{r.time}</span></td>
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-1 text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
              </svg>
              {r.people}
            </div>
          </td>
          <td className="px-4 py-3.5">
            {r.roomId ? (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{r.roomId.name}</span>
            ) : r.tableId?.roomId ? (
              <span className="text-xs text-gray-400">{r.tableId.roomId.name}</span>
            ) : (
              <span className="text-gray-300 text-xs">-</span>
            )}
          </td>
          <td className="px-4 py-3.5">
            <TableCell reservation={r} tables={tables} onAssign={handleAssign} />
          </td>
          <td className="px-4 py-3.5">
            <span className={`inline-flex items-center justify-center min-w-[96px] px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
              {s.label}
            </span>
          </td>
          <td className="px-4 py-3.5">
            <div className="flex justify-end">
              <button
                onClick={() => setExpandedDesktopId(isExpanded ? null : r._id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? 'Ocultar' : 'Acciones'}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M3.22 5.22a.75.75 0 0 1 1.06 0L8 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr key={`${r._id}-actions`} className={`${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <td colSpan={7} className="px-5 py-3 bg-gray-50/80">
              <div className="flex items-center justify-end gap-2 flex-wrap">
                {canModeratePending && r.status === 'pending' && (
                  <button onClick={() => handleQuickStatus(r._id, 'confirmed')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                    Confirmar
                  </button>
                )}
                {r.status === 'confirmed' && (
                  <button onClick={() => handleQuickStatus(r._id, 'seated')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                    Pasar a sentada
                  </button>
                )}
                {canMarkNoShow && (r.status === 'confirmed' || r.status === 'seated') && (
                  <button onClick={() => handleNoShow(r._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                    Marcar no-show
                  </button>
                )}
                {r.status !== 'cancelled' && r.status !== 'no_show' && (
                  <button onClick={() => handleCancel(r._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                    Cancelar
                  </button>
                )}
                <button onClick={() => setModal({ mode: 'edit', reservation: r })}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  Editar
                </button>
                <button onClick={() => handleDelete(r._id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{business?.name}</h2>
          <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
        </div>
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
        <>
          {/* Mobile */}
          <div className="sm:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {reservations.length === 0
              ? <EmptyDay />
              : sorted(reservations).map(r => <ReservationCard key={r._id} {...cardProps(r)} />)
            }
          </div>
          {/* Desktop */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {reservations.length === 0
              ? <EmptyDay />
              : <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    {thead}
                    <tbody>{sorted(reservations).map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                  </table>
                </div>
            }
          </div>
        </>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {sortedDates.length === 0
              ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <EmptyDay />
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
          {/* Desktop */}
          <div className="hidden sm:block space-y-4">
            {sortedDates.length === 0
              ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <EmptyDay />
                </div>
              )
              : sortedDates.map(date => {
                  const { prefix, dayMonth, isToday } = formatDayHeader(date, today);
                  const rsvs = byDate[date] || [];
                  const active = rsvs.filter(r => r.status !== 'cancelled' && r.status !== 'no_show').length;
                  return (
                    <div key={date} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 ${isToday ? 'bg-violet-50/60' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          {isToday && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                          <h3 className={`text-sm font-bold capitalize ${isToday ? 'text-violet-700' : 'text-gray-700'}`}>{prefix} {dayMonth}</h3>
                        </div>
                        <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          {active} reserva{active !== 1 ? 's' : ''} activa{active !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-sm">
                          {thead}
                          <tbody>{sorted(rsvs).map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </>
      )}

      {/* Modals */}
      {modal && (
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
