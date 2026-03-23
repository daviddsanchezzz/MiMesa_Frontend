import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ReservationForm from '../components/ReservationForm';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-400',   bar: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', dot: 'bg-violet-500',  bar: 'bg-violet-500' },
  seated:    { label: 'Sentada',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  no_show:   { label: 'No show',    cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-400', bar: 'bg-rose-400' },
  cancelled: { label: 'Cancelada',  cls: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',      dot: 'bg-gray-300',    bar: 'bg-gray-300' },
};

function Avatar({ name }) {
  const colors = ['bg-violet-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full ${colors[idx]} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function ActionBtn({ onClick, children, color = 'gray' }) {
  const cls = {
    gray:   'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    green:  'text-emerald-600 hover:bg-emerald-50',
    purple: 'text-violet-600 hover:bg-violet-50',
    red:    'text-rose-600 hover:bg-rose-50',
    blue:   'text-violet-600 hover:bg-violet-50',
  }[color];
  return (
    <button onClick={onClick} className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${cls}`}>
      {children}
    </button>
  );
}

// Inline table picker cell
function TableCell({ reservation, tables, onAssign }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const roomId    = reservation.roomId?._id || reservation.roomId;
  const available = tables
    .filter(t => !roomId || t.roomId?._id === roomId || t.roomId === roomId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const assigned  = reservation.tableId;

  // Group by room for optgroup display
  const grouped = available.reduce((acc, t) => {
    const key = t.roomId?.name || 'Sin sala';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const hasGroups = Object.keys(grouped).length > 1 || !Object.keys(grouped)[0]?.match(/^Sin sala$/);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          assigned
            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 font-medium'
            : 'border-dashed border-gray-300 text-gray-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50'
        }`}
      >
        {assigned ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{assigned.name}</>
        ) : (
          <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>Asignar</>
        )}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <select
        autoFocus
        defaultValue={assigned?._id || ''}
        onChange={e => { onAssign(reservation._id, e.target.value || null); setOpen(false); }}
        onBlur={() => setOpen(false)}
        className="text-xs border border-violet-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white shadow-md min-w-[140px]"
      >
        <option value="">Sin mesa</option>
        {hasGroups
          ? Object.entries(grouped).map(([roomName, roomTables]) => (
              <optgroup key={roomName} label={roomName}>
                {roomTables.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </optgroup>
            ))
          : available.map(t => <option key={t._id} value={t._id}>{t.name}</option>)
        }
      </select>
    </div>
  );
}

// â”€â”€ Mobile row: ultra-compact, max density â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MobileRow({ r, tables, onEdit, onCancel, onDelete, onAssign, onQuickStatus, onNoShow, canMarkNoShow, canModeratePending }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusConfig[r.status];
  const isCancelled = r.status === 'cancelled';

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Main row â€” tap to expand */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        {/* Status bar left edge */}
        <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />

        {/* Time â€” BIG */}
        <div className="shrink-0 w-14 text-center">
          <p className="text-lg font-bold text-gray-900 leading-none">{r.time}</p>
          <p className={`text-[10px] font-semibold mt-1 ${
            r.status === 'confirmed' ? 'text-violet-500' :
            r.status === 'seated'    ? 'text-emerald-500' :
            r.status === 'pending'   ? 'text-amber-500' : 'text-gray-400'
          }`}>{s.label}</p>
        </div>

        {/* Name + details */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{r.guestName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-gray-400">
                <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.75 11a.75.75 0 0 0 .75-.75 4.5 4.5 0 0 0-9 0c0 .414.336.75.75.75h7.5Z" />
              </svg>
              {r.people} pax
            </span>
            {r.tableId && (
              <span className="text-xs text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-md">{r.tableId.name}</span>
            )}
            {!r.tableId && (
              <span className="text-xs text-gray-300">sin mesa</span>
            )}
            {(r.roomId?.name || r.tableId?.roomId?.name) && (
              <span className="text-xs text-gray-400 truncate">{r.roomId?.name || r.tableId?.roomId?.name}</span>
            )}
            {r.promoCode && (
              <span className="text-xs text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md">{r.promoCode}</span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
          className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-4 pb-3 bg-gray-50/80 border-t border-gray-100 space-y-3">
          {/* Contact + notes */}
          {(r.guestPhone || r.guestEmail || r.notes) && (
            <div className="pt-2 space-y-1">
              {r.guestPhone && (
                <a href={`tel:${r.guestPhone}`} className="flex items-center gap-2 text-sm text-violet-600 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V5c0 1.149.15 2.263.43 3.326a13.022 13.022 0 0 0 8.244 8.243c1.063.28 2.177.431 3.326.431h1.5a1.5 1.5 0 0 0 1.5-1.5V13.5a1.5 1.5 0 0 0-1.5-1.5h-2.042a1.5 1.5 0 0 0-1.066.44l-.44.44a11.516 11.516 0 0 1-5.332-5.332l.44-.44A1.5 1.5 0 0 0 7.5 5.542V3.5A1.5 1.5 0 0 0 6 2H3.5Z" clipRule="evenodd" />
                  </svg>
                  {r.guestPhone}
                </a>
              )}
              {r.guestEmail && (
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400">
                    <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 5.854v6.396c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.854L8.68 9.965a.5.5 0 0 1-.36 0L1.5 5.854Zm13-1.97-6.5 3.542L1.5 3.884V3.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v.135Z" />
                  </svg>
                  {r.guestEmail}
                </p>
              )}
              {r.notes && (
                <p className="text-xs text-gray-500 italic bg-white rounded-lg px-2.5 py-1.5 border border-gray-200">"{r.notes}"</p>
              )}
            </div>
          )}

          {/* Mesa assignment */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Mesa:</span>
            <TableCell reservation={r} tables={tables} onAssign={onAssign} />
          </div>

          {/* Quick status buttons */}
          <div className="flex gap-2 flex-wrap">
            {canModeratePending && r.status === 'pending' && (
              <button onClick={() => onQuickStatus(r._id, 'confirmed')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-violet-600 text-white active:bg-violet-700 transition-colors">
                Confirmar
              </button>
            )}
            {canModeratePending && r.status === 'pending' && (
              <button onClick={() => onQuickStatus(r._id, 'seated')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-emerald-600 text-white active:bg-emerald-700 transition-colors">
                Sentar directo
              </button>
            )}
            {r.status === 'confirmed' && (
              <button onClick={() => onQuickStatus(r._id, 'seated')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-emerald-600 text-white active:bg-emerald-700 transition-colors">
                Pasar a sentada
              </button>
            )}
            {canMarkNoShow && (r.status === 'confirmed' || r.status === 'seated') && (
              <button onClick={() => onNoShow(r._id)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 active:bg-amber-100 transition-colors">
                No show
              </button>
            )}
            <button onClick={onEdit}
              className="flex-1 text-xs font-semibold py-2 rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors">
              Editar
            </button>
            {r.status !== 'cancelled' && r.status !== 'no_show' && (
              <button onClick={onCancel}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 active:bg-rose-100 transition-colors">
                Cancelar
              </button>
            )}
            <button
              onClick={onDelete}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reservations() {
  const { hasRole } = useAuth();
  const canModeratePending = hasRole('manager');
  const [reservations, setReservations] = useState([]);
  const [tables,       setTables]       = useState([]);
  const [slots,        setSlots]        = useState([]);   // [{time, shiftName}]
  const [pendingReservations, setPendingReservations] = useState([]);
  const [pendingEnabled, setPendingEnabled] = useState(canModeratePending);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [pendingProposalSaving, setPendingProposalSaving] = useState(false);
  const [filterMode,   setFilterMode]   = useState('today'); // today | week | upcoming | day | pending
  const [dateFilter,   setDateFilter]   = useState(new Date().toISOString().slice(0, 10));
  const [modal,        setModal]        = useState(null);
  const [expandedDesktopId, setExpandedDesktopId] = useState(null);
  const [toasts,       setToasts]       = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [openingCreateModal, setOpeningCreateModal] = useState(false);
  const [createModalError, setCreateModalError] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);

  const resolveCreateDate = () => (filterMode === 'day' ? dateFilter : todayStr);

  const pushToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const requestConfirm = ({ title, message, confirmLabel = 'Confirmar', intent = 'danger', onConfirm }) => {
    setConfirmDialog({ title, message, confirmLabel, intent, onConfirm });
  };

  const executeConfirm = async () => {
    if (!confirmDialog?.onConfirm) return;
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo completar la acción', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const openCreateModal = async () => {
    const targetDate = resolveCreateDate();
    setCreateModalError('');
    setOpeningCreateModal(true);
    try {
      const [roomsRes, slotsRes, vacRes] = await Promise.all([
        api.get('/rooms'),
        api.get(`/shifts/slots?date=${targetDate}`),
        api.get(`/vacations/check?date=${targetDate}`),
      ]);
      const vacation = vacRes.data.closed ? vacRes.data : false;
      const availableSlots = vacation ? [] : slotsRes.data;

      setModal({
        mode: 'create',
        preloaded: {
          date: targetDate,
          rooms: roomsRes.data,
          slots: availableSlots,
          vacation,
        },
      });
    } catch {
      setCreateModalError('No se pudo preparar el formulario. Reintenta.');
    } finally {
      setOpeningCreateModal(false);
    }
  };

  const load = () => {
    if (filterMode === 'pending') {
      if (!canModeratePending) {
        setReservations([]);
        return Promise.resolve();
      }
      return api.get('/reservations/pending')
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : [];
          setPendingEnabled(true);
          setPendingReservations(list);
          setReservations(list);
        })
        .catch((err) => {
          if (err?.response?.status === 403) {
            setPendingEnabled(false);
            setPendingReservations([]);
            setReservations([]);
            return;
          }
          throw err;
        });
    }
    if (filterMode === 'today') {
      return api.get(`/reservations?date=${todayStr}`).then(r => setReservations(r.data));
    }
    if (filterMode === 'day') {
      return api.get(`/reservations?date=${dateFilter}`).then(r => setReservations(r.data));
    }

    return api.get('/reservations').then(r => {
      const now = new Date();
      const startOfToday = new Date(`${todayStr}T00:00:00`);
      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      let list = [...r.data];
      if (filterMode === 'week') {
        list = list.filter((res) => {
          const d = new Date(`${res.date}T12:00:00`);
          return d >= startOfToday && d <= endOfWeek;
        });
      } else if (filterMode === 'upcoming') {
        list = list.filter((res) => new Date(`${res.date}T${res.time || '00:00'}:00`) >= now);
        list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        list = list.slice(0, 20);
      }
      setReservations(list);
    });
  };

  const loadPendingReservations = () => {
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
          return;
        }
        console.error('Error loading pending reservations:', err);
      })
      .finally(() => setPendingLoading(false));
  };

  useEffect(() => {
    load().catch((err) => {
      pushToast(err?.response?.data?.message || 'No se pudieron cargar las reservas', 'error');
    });
  }, [filterMode, dateFilter]);

  useEffect(() => {
    loadPendingReservations();
  }, [canModeratePending]);

  useEffect(() => {
    if (filterMode !== 'today' && filterMode !== 'day') {
      setSlots([]);
      return;
    }
    const targetDate = filterMode === 'today' ? todayStr : dateFilter;
    api.get(`/shifts/slots?date=${targetDate}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]));
  }, [filterMode, dateFilter, todayStr]);
  useEffect(() => { api.get('/tables').then(r => setTables(r.data)); }, []);

  // Build timeâ†’shiftName map and ordered shift list from slots
  const isSingleDayFilter = filterMode === 'today' || filterMode === 'day';
  const sortByTime = (a, b) => (a.time || '').localeCompare(b.time || '');
  const sortByDateTime = (a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`);
  const displayReservations = [...reservations].sort(isSingleDayFilter ? sortByTime : sortByDateTime);
  const uniqueDates = [...new Set(displayReservations.map(r => r.date))];
  const shouldGroupByDay = !isSingleDayFilter && uniqueDates.length > 1;

  const timeToShift = {};
  const shiftOrder  = [];  // preserves slot order
  slots.forEach(s => {
    timeToShift[s.time] = s.shiftName;
    if (!shiftOrder.includes(s.shiftName)) shiftOrder.push(s.shiftName);
  });

  // Group reservations by shift; unmatched times go to last group "Otros"
  const groupedByShift = () => {
    if (shiftOrder.length <= 1) return null;   // no need to group for 1 or 0 shifts
    const groups = {};
    shiftOrder.forEach(n => { groups[n] = []; });
    groups['__otros__'] = [];
    displayReservations.forEach(r => {
      const name = timeToShift[r.time];
      if (name) groups[name].push(r);
      else      groups['__otros__'].push(r);
    });
    // remove empty __otros__
    if (groups['__otros__'].length === 0) delete groups['__otros__'];
    return groups;
  };

  const groupedByDate = () => {
    const groups = {};
    displayReservations.forEach((r) => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return groups;
  };

  const quickStatus = async (id, status) => {
    try {
      await api.put(`/reservations/${id}`, { status });
      await Promise.all([load(), loadPendingReservations()]);
      if (status === 'confirmed') pushToast('Reserva confirmada');
      if (status === 'seated') pushToast('Reserva pasada a sentada');
      if (status === 'cancelled') pushToast('Reserva cancelada');
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo actualizar la reserva', 'error');
    }
  };

  const handlePendingAccept = async (id) => {
    try {
      await api.put(`/reservations/${id}/accept`);
      await Promise.all([load(), loadPendingReservations()]);
      pushToast('Reserva pendiente aceptada');
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo aceptar la reserva', 'error');
    }
  };

  const handlePendingReject = async (id) => {
    requestConfirm({
      title: 'Rechazar reserva pendiente',
      message: 'Esta reserva pasará a cancelada.',
      confirmLabel: 'Rechazar',
      intent: 'danger',
      onConfirm: async () => {
        await api.put(`/reservations/${id}/reject`);
        await Promise.all([load(), loadPendingReservations()]);
        pushToast('Reserva pendiente rechazada');
      },
    });
  };

  const openPendingProposalModal = (reservation) => {
    setPendingProposal({
      reservationId: reservation._id,
      guestName: reservation.guestName,
      date: reservation.proposedAlternative?.date || '',
      time: reservation.proposedAlternative?.time || '',
      message: reservation.proposedAlternative?.message || '',
    });
  };

  const submitPendingProposal = async (e) => {
    e.preventDefault();
    if (!pendingProposal?.reservationId) return;

    const payload = {};
    if (pendingProposal.message?.trim()) payload.message = pendingProposal.message.trim();
    if (pendingProposal.date && pendingProposal.time) {
      payload.date = pendingProposal.date;
      payload.time = pendingProposal.time;
    }

    setPendingProposalSaving(true);
    try {
      await api.put(`/reservations/${pendingProposal.reservationId}/propose-alternative`, payload);
      await loadPendingReservations();
      setPendingProposal(null);
      pushToast('Propuesta enviada al cliente');
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo enviar la propuesta', 'error');
    } finally {
      setPendingProposalSaving(false);
    }
  };

  const handleNoShow = async (id) => {
    requestConfirm({
      title: 'Marcar como no-show',
      message: 'Se marcará que el cliente no asistió.',
      confirmLabel: 'Marcar no-show',
      intent: 'warning',
      onConfirm: async () => {
        await api.put(`/reservations/${id}/no-show`);
        await Promise.all([load(), loadPendingReservations()]);
        pushToast('Reserva marcada como no-show');
      },
    });
  };

  const handleCancel = async (id) => {
    requestConfirm({
      title: 'Cancelar reserva',
      message: 'El cliente recibirá la notificación de cancelación si aplica.',
      confirmLabel: 'Cancelar reserva',
      intent: 'danger',
      onConfirm: async () => {
        await quickStatus(id, 'cancelled');
      },
    });
  };

  const assignTable = async (id, tableId) => {
    try {
      await api.put(`/reservations/${id}`, { tableId });
      await Promise.all([load(), loadPendingReservations()]);
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo asignar la mesa', 'error');
    }
  };

  const handleDelete = async (id) => {
    requestConfirm({
      title: 'Eliminar reserva',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      intent: 'danger',
      onConfirm: async () => {
        await api.delete(`/reservations/${id}`);
        await Promise.all([load(), loadPendingReservations()]);
        pushToast('Reserva eliminada');
      },
    });
  };

  const counts = {
    confirmed: displayReservations.filter(r => r.status === 'confirmed').length,
    seated:    displayReservations.filter(r => r.status === 'seated').length,
    pending:   displayReservations.filter(r => r.status === 'pending').length,
    noShow:    displayReservations.filter(r => r.status === 'no_show').length,
    cancelled: displayReservations.filter(r => r.status === 'cancelled').length,
  };

  const labelDate = filterMode === 'today' ? todayStr : dateFilter;
  const isToday = labelDate === todayStr;
  const dateLabel = new Date(labelDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayHeaderLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      {/* â”€â”€ MOBILE HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}      <div className="sm:hidden">
        <div className="flex items-center gap-2 flex-wrap justify-end max-w-full">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-center [text-align-last:center] focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="upcoming">Todas (proximas 20)</option>
            {canModeratePending && <option value="pending">Pendientes</option>}
            <option value="day">Dia concreto</option>
          </select>
          <button
            onClick={openCreateModal}
            disabled={openingCreateModal}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white active:bg-violet-700 shrink-0 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {openingCreateModal ? (
              <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
            )}
          </button>
        </div>

        {filterMode === 'day' && (
          <div className="mt-2 w-full overflow-hidden">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="block w-full max-w-full min-w-0 box-border border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          </div>
        )}

        {(filterMode === 'today' || filterMode === 'day') && (
          <div className="mt-2 text-center">
            <p className="text-sm font-bold text-gray-900 capitalize">{dateLabel}</p>
            {isToday && <p className="text-xs text-violet-500 font-medium">Hoy</p>}
          </div>
        )}

        {/* Stats strip */}
        {reservations.length > 0 && (
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {[
              { label: 'Total',    count: reservations.length,  cls: 'bg-gray-50 text-gray-700 border-gray-200' },
              { label: 'Pend.',    count: counts.pending,       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Conf.',    count: counts.confirmed,     cls: 'bg-violet-50 text-violet-700 border-violet-200' },
              { label: 'Sentadas', count: counts.seated,        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'No show',  count: counts.noShow,        cls: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center py-2 rounded-xl border text-xs font-medium ${s.cls}`}>
                <span className="font-bold text-lg leading-none">{s.count}</span>
                <span className="mt-0.5 text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ DESKTOP HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}      <div className="hidden sm:flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reservas</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {reservations.length} reserva{reservations.length !== 1 ? 's' : ''}
            {(filterMode === 'today' || filterMode === 'day') ? `  ${labelDate}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-center [text-align-last:center] focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="upcoming">Todas (proximas 20)</option>
            {canModeratePending && <option value="pending">Pendientes</option>}
            <option value="day">Dia concreto</option>
          </select>
          {filterMode === 'day' && (
            <input type="date" value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="block w-44 max-w-full min-w-0 box-border border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          )}
          <button
            onClick={openCreateModal}
            disabled={openingCreateModal}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {openingCreateModal ? (
              <>
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                </svg>
                Nueva reserva
              </>
            )}
          </button>
        </div>
      </div>

      {/* Desktop mini stats */}
      {createModalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-2.5">
          {createModalError}
        </div>
      )}

      {pendingEnabled && canModeratePending && filterMode !== 'pending' && pendingReservations.length > 0 && (
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
                      {r.date} Â· {r.time} Â· {r.people} pax
                      {r.pendingReason === 'large_group' ? ' Â· Grupo grande' : ''}
                      {r.pendingReason === 'slot_capacity' ? ' Â· Capacidad del slot' : ''}
                    </p>
                    {r.proposedAlternative?.date && r.proposedAlternative?.time && (
                      <p className="text-xs text-violet-600 mt-0.5">
                        Propuesta: {r.proposedAlternative.date} Â· {r.proposedAlternative.time}
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

      {reservations.length > 0 && (
        <div className="hidden sm:flex gap-2 flex-wrap">
          {[
            { label: 'Confirmadas', count: counts.confirmed, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
            { label: 'Sentadas',    count: counts.seated,    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'No show',     count: counts.noShow,    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
            { label: 'Canceladas',  count: counts.cancelled, cls: 'bg-gray-50 text-gray-700 border-gray-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${s.cls}`}>
              <span className="font-bold text-base leading-none">{s.count}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ EMPTY STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {reservations.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-6 h-6 text-gray-300">
              <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">
            {filterMode === 'pending' ? 'Sin reservas pendientes' : 'Sin reservas para este día'}
          </p>
          <button onClick={openCreateModal} className="mt-4 text-sm text-violet-600 hover:underline font-medium">
            Crear la primera reserva â†’
          </button>
        </div>
      )}

      {/* â”€â”€ MOBILE LIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {reservations.length > 0 && (() => {
        const groups = groupedByShift();
        const dateGroups = groupedByDate();

        const renderRow = (r) => (
          <MobileRow
            key={r._id}
            r={r}
            tables={tables}
            onEdit={() => setModal({ mode: 'edit', reservation: r })}
            onCancel={() => handleCancel(r._id)}
            onDelete={() => handleDelete(r._id)}
            onAssign={assignTable}
            onQuickStatus={quickStatus}
            onNoShow={handleNoShow}
            canMarkNoShow={canModeratePending}
            canModeratePending={canModeratePending}
          />
        );

        // No shifts or single shift â†’ flat list
        if (shouldGroupByDay) {
          return (
            <div className="sm:hidden space-y-3">
              {Object.entries(dateGroups).map(([date, rows]) => (
                <div key={date}>
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{dayHeaderLabel(date)}</span>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {rows.length} reserva{rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                    {rows.map(renderRow)}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (!groups) {
          return (
            <div className="sm:hidden bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {displayReservations.map(renderRow)}
            </div>
          );
        }

        // Multiple shifts â†’ grouped sections
        return (
          <div className="sm:hidden space-y-3">
            {Object.entries(groups).map(([shiftName, rows]) => {
              if (rows.length === 0) return null;
              const active  = rows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show').length;
              const label   = shiftName === '__otros__' ? 'Sin turno' : shiftName;
              return (
                <div key={shiftName}>
                  {/* Shift header */}
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {active} activa{active !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  {/* Rows */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                    {rows.map(renderRow)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* â”€â”€ DESKTOP TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {reservations.length > 0 && (() => {
        const groups  = groupedByShift();
        const dateGroups = groupedByDate();
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
                    <p className="text-xs text-gray-400 mt-0.5">{r.guestPhone || r.guestEmail || 'â€”'}</p>
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
                  <span className="text-gray-300 text-xs">â€”</span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <TableCell reservation={r} tables={tables} onAssign={assignTable} />
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
                    {r.status === 'pending' && (
                      <button
                        onClick={() => quickStatus(r._id, 'confirmed')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      >
                        Confirmar
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <button
                        onClick={() => quickStatus(r._id, 'seated')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        Pasar a sentada
                      </button>
                    )}
                    {canModeratePending && (r.status === 'confirmed' || r.status === 'seated') && (
                      <button
                        onClick={() => handleNoShow(r._id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        Marcar no-show
                      </button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'no_show' && (
                      <button
                        onClick={() => handleCancel(r._id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => setModal({ mode: 'edit', reservation: r })}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            )}
            </>
          );
        };

        // Single / no shift â†’ one table
        if (shouldGroupByDay) {
          return (
            <div className="hidden sm:block space-y-4">
              {Object.entries(dateGroups).map(([date, rows]) => {
                const active = rows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show').length;
                return (
                  <div key={date} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 capitalize">{dayHeaderLabel(date)}</h3>
                      <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        {active} reserva{active !== 1 ? 's' : ''} activa{active !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-sm">
                        {thead}
                        <tbody>{rows.map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (!groups) {
          return (
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  {thead}
                  <tbody>{displayReservations.map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                </table>
              </div>
            </div>
          );
        }

        // Multiple shifts â†’ one table per shift with a header row
        return (
          <div className="hidden sm:block space-y-4">
            {Object.entries(groups).map(([shiftName, rows]) => {
              if (rows.length === 0) return null;
              const active = rows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show').length;
              const label  = shiftName === '__otros__' ? 'Sin turno' : shiftName;
              const totalPax = rows.filter(r => r.status !== 'cancelled' && r.status !== 'no_show').reduce((s, r) => s + (r.people || 0), 0);
              return (
                <div key={shiftName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Shift header bar */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-gray-700">{label}</h3>
                      <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        {active} reserva{active !== 1 ? 's' : ''} activa{active !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                        </svg>
                        {totalPax} pax
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                      {thead}
                      <tbody>{rows.map((r, i, a) => renderDesktopRow(r, i, a))}</tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {pendingProposal && (
        <Modal
          title="Proponer horario"
          subtitle={`Reserva de ${pendingProposal.guestName}`}
          onClose={() => !pendingProposalSaving && setPendingProposal(null)}
          size="md"
        >
          <form onSubmit={submitPendingProposal} className="space-y-4">
            <p className="text-xs text-gray-500">
              Si dejas fecha y hora vacÃ­as, Tableo buscarÃ¡ una alternativa automÃ¡tica.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha propuesta</label>
                <input
                  type="date"
                  value={pendingProposal.date}
                  onChange={(e) => setPendingProposal((p) => ({ ...p, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hora propuesta</label>
                <input
                  type="time"
                  value={pendingProposal.time}
                  onChange={(e) => setPendingProposal((p) => ({ ...p, time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>
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
            <div className="flex items-center justify-end gap-2 pt-1">
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
                disabled={pendingProposalSaving}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
              >
                {pendingProposalSaving ? 'Enviando...' : 'Enviar propuesta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nueva reserva' : 'Editar reserva'}
          subtitle={modal.mode === 'create' ? 'Crea una nueva reserva' : 'Modifica los datos de la reserva'}
          onClose={() => setModal(null)}
        >
          <ReservationForm
            reservation={modal.reservation}
            initialContext={modal.preloaded || null}
            onSave={() => { setModal(null); Promise.all([load(), loadPendingReservations()]); }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {confirmDialog && (
        <Modal
          title={confirmDialog.title}
          subtitle={confirmDialog.message}
          onClose={() => !confirmLoading && setConfirmDialog(null)}
          size="sm"
        >
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              disabled={confirmLoading}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={executeConfirm}
              disabled={confirmLoading}
              className={`px-3 py-2 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                confirmDialog.intent === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {confirmLoading ? 'Procesando...' : confirmDialog.confirmLabel}
            </button>
          </div>
        </Modal>
      )}

      {toasts.length > 0 && (
        <div className="fixed z-[70] right-3 left-3 sm:left-auto sm:right-5 bottom-4 sm:bottom-5 flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl px-3 py-2 text-xs font-medium shadow-lg border ${
                toast.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






