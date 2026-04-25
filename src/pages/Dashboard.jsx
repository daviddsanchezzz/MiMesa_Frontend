import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';
import { ReservationCard, TableCell, Avatar, statusConfig } from '../components/ReservationCard';
import { toast } from 'sonner';

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

// ─── Active shift detection ───────────────────────────────────────────────────
// Returns { name, isCurrent } for the current shift, or the next upcoming one.
// Returns null if no shifts are configured or all shifts have already ended.
function getActiveShiftInfo(slots, shiftOrder) {
  if (!shiftOrder.length) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const shiftRanges = {};
  slots.forEach(s => {
    const [h, m] = s.time.split(':').map(Number);
    const minutes = h * 60 + m;
    if (!shiftRanges[s.shiftName]) {
      shiftRanges[s.shiftName] = { min: minutes, max: minutes };
    } else {
      shiftRanges[s.shiftName].min = Math.min(shiftRanges[s.shiftName].min, minutes);
      shiftRanges[s.shiftName].max = Math.max(shiftRanges[s.shiftName].max, minutes);
    }
  });

  // Current shift: now is within its slot range (with 30-min buffer after last slot)
  for (const name of shiftOrder) {
    const range = shiftRanges[name];
    if (!range) continue;
    if (nowMinutes >= range.min && nowMinutes <= range.max + 30) {
      return { name, isCurrent: true };
    }
  }

  // Next upcoming shift
  let nextShift = null;
  let nextStart = Infinity;
  for (const name of shiftOrder) {
    const range = shiftRanges[name];
    if (!range) continue;
    if (range.min > nowMinutes && range.min < nextStart) {
      nextStart = range.min;
      nextShift = name;
    }
  }

  return nextShift ? { name: nextShift, isCurrent: false } : null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { business, hasRole } = useAuth();
  const canModeratePending = hasRole('manager');
  const canMarkNoShow      = hasRole('manager');

  const [view, setView]               = useState('today');
  const [reservations, setReservations] = useState([]);
  const [tables, setTables]           = useState([]);
  const [slots, setSlots]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // null | { reservation }
  const [expandedDesktopId, setExpandedDesktopId] = useState(null);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [pendingEnabled, setPendingEnabled] = useState(canModeratePending);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [pendingProposalSlots, setPendingProposalSlots] = useState([]);
  const [pendingProposalSaving, setPendingProposalSaving] = useState(false);

  const today      = getToday();
  const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const tomorrow   = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const loadPendingReservations = useCallback(() => {
    if (!canModeratePending) {
      setPendingEnabled(false);
      setPendingReservations([]);
      return Promise.resolve();
    }
    setPendingLoading(true);
    return api.get('/reservations/pending')
      .then((r) => {
        setPendingEnabled(true);
        setPendingReservations(Array.isArray(r.data) ? r.data : []);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setPendingEnabled(false);
          setPendingReservations([]);
        }
      })
      .finally(() => setPendingLoading(false));
  }, [canModeratePending]);

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
  useEffect(() => { loadPendingReservations(); }, [loadPendingReservations]);
  useEffect(() => { api.get('/tables').then(r => setTables(r.data)); }, []);
  useEffect(() => {
    if (view !== 'today') { setSlots([]); return; }
    api.get(`/shifts/slots?date=${today}`).then(r => setSlots(r.data)).catch(() => setSlots([]));
  }, [view, today]);
  useEffect(() => {
    const handler = () => { loadReservations(); loadPendingReservations(); };
    window.addEventListener('reservation:created', handler);
    return () => window.removeEventListener('reservation:created', handler);
  }, [loadReservations, loadPendingReservations]);

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
  const handleChargeNoShow = async (id) => {
    if (!window.confirm('¿Cobrar el no-show a la tarjeta guardada?')) return;
    await api.post(`/reservations/${id}/charge-noshow`);
    loadReservations();
  };
  const handleRefundDeposit = async (id) => {
    if (!window.confirm('¿Reembolsar el depósito al cliente?')) return;
    await api.post(`/reservations/${id}/refund`);
    loadReservations();
  };

  // ── Pending handlers ──
  const handlePendingAccept = async (id) => {
    try {
      await api.put(`/reservations/${id}/accept`);
      await Promise.all([loadReservations(), loadPendingReservations()]);
    } catch (err) {
      console.error('Error accepting reservation:', err);
    }
  };
  const handlePendingReject = async (id) => {
    if (!window.confirm('Esta reserva pasará a cancelada.')) return;
    try {
      await api.put(`/reservations/${id}/reject`);
      await Promise.all([loadReservations(), loadPendingReservations()]);
    } catch (err) {
      console.error('Error rejecting reservation:', err);
    }
  };
  const openPendingProposalModal = (r) => {
    setPendingProposal({ reservationId: r._id, guestName: r.guestName, date: r.date, selectedTime: null, customTime: '', message: '' });
    setPendingProposalSlots([]);
    api.get(`/shifts/slots?date=${r.date}`)
      .then((res) => {
        const all = res.data || [];
        const shift = all.find((s) => s.time === r.time)?.shiftName;
        setPendingProposalSlots(shift ? all.filter((s) => s.shiftName === shift) : all);
      })
      .catch(() => setPendingProposalSlots([]));
  };
  const submitPendingProposal = async (e) => {
    e.preventDefault();
    const resolvedTime = pendingProposal.selectedTime === '__other__' ? pendingProposal.customTime : pendingProposal.selectedTime;
    if (!pendingProposal?.reservationId || !resolvedTime) return;
    const payload = { date: pendingProposal.date, time: resolvedTime };
    if (pendingProposal.message?.trim()) payload.message = pendingProposal.message.trim();
    setPendingProposalSaving(true);
    try {
      await api.put(`/reservations/${pendingProposal.reservationId}/propose-alternative`, payload);
      await loadPendingReservations();
      setPendingProposal(null);
    } catch (err) {
      console.error('Error sending proposal:', err);
    } finally {
      setPendingProposalSaving(false);
    }
  };

  // ── Stats (calculated after shift filter — see below) ──
  const todayCount    = reservations.filter(r => r.date === today).length;
  const tomorrowCount = reservations.filter(r => r.date === tomorrow).length;

  // ── Week grouping (también excluye canceladas) ──
  const byDate = reservations.filter(r => r.status !== 'cancelled').reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();

  const sorted = (list) => [...list].sort((a, b) => a.time.localeCompare(b.time));

  // Dashboard no muestra canceladas
  const visibleReservations = reservations.filter(r => r.status !== 'cancelled');

  // ── Shift grouping (for "today" view) ──
  const timeToShift = {};
  const shiftOrder  = [];
  slots.forEach(s => {
    timeToShift[s.time] = s.shiftName;
    if (!shiftOrder.includes(s.shiftName)) shiftOrder.push(s.shiftName);
  });
  const groupedByShift = () => {
    if (shiftOrder.length <= 1) return null;
    const groups = {};
    shiftOrder.forEach(n => { groups[n] = []; });
    groups['__otros__'] = [];
    sorted(visibleReservations).forEach(r => {
      const name = timeToShift[r.time];
      if (name) groups[name].push(r);
      else      groups['__otros__'].push(r);
    });
    if (groups['__otros__'].length === 0) delete groups['__otros__'];
    return groups;
  };

  // ── Active-shift filter (today view only) ──
  const activeShiftInfo = view === 'today' && slots.length > 0
    ? getActiveShiftInfo(slots, shiftOrder)
    : null;

  const filteredReservations = activeShiftInfo
    ? visibleReservations.filter(r => timeToShift[r.time] === activeShiftInfo.name)
    : visibleReservations;

  // ── Stats: scoped to active shift when one is shown, otherwise full day ──
  const statBase = view === 'today' && activeShiftInfo
    ? reservations.filter(r => timeToShift[r.time] === activeShiftInfo.name)
    : reservations;
  const total     = statBase.length;
  const pending   = statBase.filter(r => r.status === 'pending').length;
  const confirmed = statBase.filter(r => r.status === 'confirmed').length;
  const seated    = statBase.filter(r => r.status === 'seated').length;
  const cancelled = statBase.filter(r => r.status === 'cancelled').length;

  const cardProps = (r) => ({
    r,
    tables,
    onQuickStatus: handleQuickStatus,
    onNoShow: handleNoShow,
    onCancel: () => handleCancel(r._id),
    onDelete: () => handleDelete(r._id),
    onAssign: handleAssign,
    onEdit: () => setModal({ mode: 'edit', reservation: r }),
    onChargeNoShow: handleChargeNoShow,
    onRefundDeposit: handleRefundDeposit,
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
                {r.payment?.mode === 'deposit' && r.payment?.status === 'captured' && (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">Dep. {Math.round(r.payment.amount / 100)}€</span>
                )}
                {r.payment?.mode === 'deposit' && r.payment?.status === 'refunded' && (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">Dep. reembolsado</span>
                )}
                {r.payment?.mode === 'card_guarantee' && r.payment?.stripePaymentMethodId && r.payment?.status !== 'captured' && (
                  <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">Tarjeta guardada</span>
                )}
                {r.payment?.mode === 'card_guarantee' && r.payment?.status === 'captured' && (
                  <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">No-show cobrado</span>
                )}
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
                {canMarkNoShow && r.payment?.mode === 'card_guarantee' && r.payment?.stripePaymentMethodId && r.payment?.status !== 'captured' && (
                  <button onClick={() => handleChargeNoShow(r._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                    Cobrar no-show
                  </button>
                )}
                {canMarkNoShow && r.payment?.mode === 'deposit' && r.payment?.status === 'captured' && (
                  <button onClick={() => handleRefundDeposit(r._id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors">
                    Reembolsar depósito
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
        {canModeratePending && (
          <button
            type="button"
            onClick={() => navigate('/exceptions')}
            className="inline-flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border-0 sm:border sm:border-gray-200 text-sm font-semibold text-gray-700 hover:bg-transparent sm:hover:bg-gray-50 transition-colors"
            title="Gestionar excepciones"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5 sm:w-4 sm:h-4 text-violet-600">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-9.75a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM8 12a.875.875 0 1 0 0-1.75A.875.875 0 0 0 8 12Z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Excepciones</span>
          </button>
        )}
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

      {/* Pending reservations banner */}
      {pendingEnabled && canModeratePending && pendingReservations.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Reservas pendientes</h3>
              <p className="text-xs text-amber-700 mt-0.5">Acepta, rechaza o propone otro horario</p>
            </div>
            <span className="text-xs font-semibold bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
              {pendingReservations.length}
            </span>
          </div>
          {pendingLoading ? (
            <div className="px-4 sm:px-5 py-4 text-sm text-gray-500">Cargando pendientes...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingReservations.slice(0, 8).map((r) => (
                <div key={r._id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.guestName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.date} · {r.time} · {r.people} pax
                      {r.pendingReason === 'large_group' ? ' · Grupo grande' : ''}
                      {r.pendingReason === 'slot_capacity' ? ' · Capacidad del slot' : ''}
                    </p>
                    {r.proposedAlternative?.date && r.proposedAlternative?.time && (
                      <p className="text-xs text-violet-600 mt-0.5">
                        Propuesta: {r.proposedAlternative.date} · {r.proposedAlternative.time}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handlePendingAccept(r._id)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => openPendingProposalModal(r)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                    >
                      Proponer hora
                    </button>
                    <button
                      onClick={() => handlePendingReject(r._id)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats pills */}
      {!loading && total > 0 && view !== 'today' && (
        <div className="flex items-center gap-2 flex-wrap">
          {false ? (
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

      {/* Active shift indicator */}
      {false && view === 'today' && !loading && activeShiftInfo && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            activeShiftInfo.isCurrent
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeShiftInfo.isCurrent ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {activeShiftInfo.isCurrent ? 'Turno actual' : 'Próximo turno'}: {activeShiftInfo.name}
          </span>
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
          {filteredReservations.length === 0 ? (
            <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><EmptyDay /></div>
          ) : (() => {
            const groups = groupedByShift();
            if (!groups) return (
              <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {sorted(filteredReservations).map(r => <ReservationCard key={r._id} {...cardProps(r)} />)}
              </div>
            );
            return (
              <div className="lg:hidden space-y-3">
                {Object.entries(groups).map(([shiftName, rows]) => {
                  const visibleRows = activeShiftInfo ? rows.filter(r => timeToShift[r.time] === activeShiftInfo.name) : rows;
                  if (visibleRows.length === 0) return null;
                  const label = shiftName === '__otros__' ? 'Sin turno' : shiftName;
                  const activeRows = visibleRows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show');
                  const activeReservations = activeRows.length;
                  const activePeople = activeRows.reduce((sum, r) => sum + (Number(r.people) || 0), 0);
                  return (
                    <div key={shiftName}>
                      <div className="flex items-center gap-2 px-1 mb-1.5">
                        <div className="h-px flex-1 bg-gray-200" />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {activeReservations}R {activePeople}P
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {visibleRows.map(r => <ReservationCard key={r._id} {...cardProps(r)} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Desktop */}
          {filteredReservations.length === 0 ? (
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"><EmptyDay /></div>
          ) : (() => {
            const groups = groupedByShift();
            if (!groups) return (
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    {thead}
                    <tbody>{sorted(filteredReservations).map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                  </table>
                </div>
              </div>
            );
            return (
              <div className="hidden lg:block space-y-4">
                {Object.entries(groups).map(([shiftName, rows]) => {
                  const visibleRows = activeShiftInfo ? rows.filter(r => timeToShift[r.time] === activeShiftInfo.name) : rows;
                  if (visibleRows.length === 0) return null;
                  const label = shiftName === '__otros__' ? 'Sin turno' : shiftName;
                  const activeRows = visibleRows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show');
                  const activeReservations = activeRows.length;
                  const activePeople = activeRows.reduce((sum, r) => sum + (Number(r.people) || 0), 0);
                  return (
                    <div key={shiftName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700">{label}</h3>
                        <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          {activeReservations}R {activePeople}P
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-sm">
                          {thead}
                          <tbody>{visibleRows.map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* Mobile */}
          <div className="lg:hidden space-y-3">
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
          <div className="hidden lg:block space-y-4">
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
            onSave={({ mode } = {}) => {
              setModal(null);
              loadReservations();
              toast.success(mode === 'create' ? 'Reserva creada' : 'Reserva actualizada');
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {pendingProposal && (
        <Modal
          title="Proponer horario"
          subtitle={`Reserva de ${pendingProposal.guestName}`}
          onClose={() => !pendingProposalSaving && setPendingProposal(null)}
          size="md"
        >
          <form onSubmit={submitPendingProposal} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Selecciona un horario para el {pendingProposal.date}</p>
              {pendingProposalSlots.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Cargando horarios...</p>
              ) : (() => {
                const grouped = {};
                pendingProposalSlots.forEach((s) => {
                  if (!grouped[s.shiftName]) grouped[s.shiftName] = [];
                  grouped[s.shiftName].push(s.time);
                });
                return (
                  <div className="space-y-3">
                    {Object.entries(grouped).map(([shiftName, times]) => (
                      <div key={shiftName}>

                        <div className="flex flex-wrap gap-1.5">
                          {times.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setPendingProposal((p) => ({ ...p, selectedTime: t }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                pendingProposal.selectedTime === t
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:text-violet-700'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPendingProposal((p) => ({ ...p, selectedTime: '__other__' }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              pendingProposal.selectedTime === '__other__'
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:text-violet-700'
                            }`}
                          >
                            Otra
                          </button>
                        </div>
                        {pendingProposal.selectedTime === '__other__' && (
                          <input
                            type="time"
                            value={pendingProposal.customTime}
                            onChange={(e) => setPendingProposal((p) => ({ ...p, customTime: e.target.value }))}
                            className="mt-2 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                            autoFocus
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mensaje para el cliente (opcional)</label>
              <textarea
                rows={3}
                value={pendingProposal.message}
                onChange={(e) => setPendingProposal((p) => ({ ...p, message: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none"
                placeholder="Ej: Estamos completos a esa hora, te ofrecemos esta alternativa."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingProposal(null)}
                disabled={pendingProposalSaving}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={pendingProposalSaving || !pendingProposal.selectedTime || (pendingProposal.selectedTime === '__other__' && !pendingProposal.customTime)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
              >
                {pendingProposalSaving ? 'Enviando...' : 'Enviar propuesta'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
