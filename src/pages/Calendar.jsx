import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlanGate from '../components/PlanGate';
import { statusConfig, Avatar } from '../components/ReservationCard';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';
import ToastStack from '../components/ToastStack';
import useTransientToasts from '../hooks/useTransientToasts';

// ─── Constants ────────────────────────────────────────────────────────────────
const PX_PER_MIN  = 3;
const TABLE_COL_W = 80;
const ROW_H       = 52;
const HEADER_H    = 36;
const ROOM_H      = 28;
const SLOT_EVERY  = 15;

const BLOCK = {
  pending:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  confirmed: { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
  seated:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  no_show:   { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  cancelled: { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToLabel(m) {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
}
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// ─── NavButton ────────────────────────────────────────────────────────────────
function NavButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
      {children}
    </button>
  );
}

// ─── Config warnings ──────────────────────────────────────────────────────────
function ConfigWarning({ icon, title, desc, linkTo, linkLabel }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">{icon}</div>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-500 max-w-xs">{desc}</p>
      {linkTo && <a href={linkTo} className="text-xs font-semibold text-violet-600 hover:text-violet-700">{linkLabel} →</a>}
    </div>
  );
}

// ─── Upgrade prompt ───────────────────────────────────────────────────────────
function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-violet-500">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">Vista de calendario</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">Disponible en el plan Basic. Activa tu prueba gratuita de 14 días para acceder.</p>
      </div>
      <a href="/configuracion?tab=suscripcion" className="text-sm font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
        Ver planes
      </a>
    </div>
  );
}

// ─── Reservation Drawer ───────────────────────────────────────────────────────
function ReservationDrawer({ reservation, onClose, onAction, onEdit }) {
  const s = statusConfig[reservation.status] || statusConfig.confirmed;

  const assignedTables = (() => {
    if (Array.isArray(reservation.tableIds) && reservation.tableIds.length > 0)
      return reservation.tableIds.filter(Boolean);
    if (reservation.tableId) return [reservation.tableId];
    return [];
  })();

  const isActive = reservation.status !== 'cancelled' && reservation.status !== 'no_show';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, side panel on desktop */}
      <div className="fixed z-50 bg-white shadow-2xl flex flex-col
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[88vh]
        sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-96 sm:max-h-[90vh] sm:rounded-2xl sm:overflow-y-auto">

        {/* Handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={reservation.guestName} />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 leading-tight truncate">{reservation.guestName}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
                {s.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-2 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hora</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{reservation.time}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Personas</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{reservation.people} pax</p>
            </div>
            {(reservation.roomId?.name || reservation.tableId?.roomId?.name) && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sala</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {reservation.roomId?.name || reservation.tableId?.roomId?.name}
                </p>
              </div>
            )}
            {assignedTables.length > 0 && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mesa{assignedTables.length > 1 ? 's' : ''}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {assignedTables.map(t => t.name).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Contact */}
          {(reservation.guestPhone || reservation.guestEmail) && (
            <div className="space-y-2">
              {reservation.guestPhone && (
                <a href={`tel:${reservation.guestPhone}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V5c0 1.149.15 2.263.43 3.326a13.022 13.022 0 0 0 8.244 8.243c1.063.28 2.177.431 3.326.431h1.5a1.5 1.5 0 0 0 1.5-1.5V13.5a1.5 1.5 0 0 0-1.5-1.5h-2.042a1.5 1.5 0 0 0-1.066.44l-.44.44a11.516 11.516 0 0 1-5.332-5.332l.44-.44A1.5 1.5 0 0 0 7.5 5.542V3.5A1.5 1.5 0 0 0 6 2H3.5Z" clipRule="evenodd" />
                  </svg>
                  {reservation.guestPhone}
                </a>
              )}
              {reservation.guestEmail && (
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400">
                    <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 5.854v6.396c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.854L8.68 9.965a.5.5 0 0 1-.36 0L1.5 5.854Zm13-1.97-6.5 3.542L1.5 3.884V3.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v.135Z" />
                  </svg>
                  {reservation.guestEmail}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {reservation.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-sm text-amber-900 italic">"{reservation.notes}"</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {reservation.status === 'pending' && (
              <button onClick={() => onAction('confirmed')}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                Confirmar
              </button>
            )}
            {reservation.status === 'confirmed' && (
              <button onClick={() => onAction('seated')}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Pasar a sentada
              </button>
            )}
            {(reservation.status === 'confirmed' || reservation.status === 'seated') && (
              <button onClick={() => onAction('no_show')}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                No show
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit}
              className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Editar
            </button>
            {isActive && (
              <button onClick={() => onAction('cancelled')}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Calendar() {
  const { business } = useAuth();
  const reservationDuration = business?.reservationDuration;
  const { toasts, pushToast } = useTransientToasts();

  const today = getToday();
  const [date, setDate]                 = useState(today);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables]             = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [shifts, setShifts]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedRsv, setSelectedRsv]   = useState(null);  // drawer
  const [editRsv, setEditRsv]           = useState(null);   // edit modal
  const [dragState, setDragState]       = useState(null);   // { rsvId, targetTableId }
  const [dragError, setDragError]       = useState(null);   // conflict message
  const dragRef                         = useRef(null);
  const [nowMinutes, setNowMinutes]     = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });

  useEffect(() => {
    Promise.all([api.get('/tables'), api.get('/rooms'), api.get('/shifts')])
      .then(([t, r, s]) => { setTables(t.data); setRooms(r.data); setShifts(s.data); });
  }, []);

  const loadReservations = () => {
    setLoading(true);
    api.get(`/reservations?date=${date}`)
      .then(r => setReservations(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReservations(); }, [date]);
  useEffect(() => {
    const handler = () => loadReservations();
    window.addEventListener('reservation:created', handler);
    return () => window.removeEventListener('reservation:created', handler);
  }, [date]);

  useEffect(() => {
    if (date !== today) return;
    const tick = () => { const n = new Date(); setNowMinutes(n.getHours() * 60 + n.getMinutes()); };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [date, today]);

  // ── Handlers ──
  const handleAction = async (rsv, action) => {
    try {
      if (action === 'no_show') {
        await api.put(`/reservations/${rsv._id}/no-show`);
      } else {
        await api.put(`/reservations/${rsv._id}`, { status: action });
      }
      setSelectedRsv(null);
      loadReservations();
    } catch (err) {
      pushToast(err?.response?.data?.message || 'No se pudo actualizar la reserva', 'error');
    }
  };

  const handleEdit = (rsv) => {
    setSelectedRsv(null);
    setEditRsv(rsv);
  };

  const afterSave = ({ mode } = {}) => {
    setEditRsv(null);
    loadReservations();
    pushToast(mode === 'create' ? 'Reserva creada' : 'Reserva actualizada');
  };

  // ── Drag to reassign table ──
  const startDrag = (e, r, fromTableId) => {
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      rsv: r, fromTableId,
      startX: clientX, startY: clientY,
      moved: false,
      activated: !isTouch, // mouse → active immediately; touch → needs long press
      targetTableId: null,
      longPressTimer: null,
    };

    const cleanup = () => {
      clearTimeout(dragRef.current?.longPressTimer);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDragHandler);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', endDragHandler);
    };

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dy = Math.abs(cy - dragRef.current.startY);
      const dx = Math.abs(cx - dragRef.current.startX);

      // Touch: if finger moves before long-press fires → it's a scroll, cancel
      if (!dragRef.current.activated) {
        if (dx > 8 || dy > 8) {
          cleanup();
          dragRef.current = null;
          setDragState(null);
        }
        return;
      }

      // Activated — first real movement initialises drag
      if (!dragRef.current.moved) {
        if (isTouch) {
          // Long press already confirmed, any movement starts dragging
          dragRef.current.moved = true;
        } else {
          // Mouse: require intentional vertical movement
          if (dy < 8) return;
          if (dx > dy) { endDrag(false); return; }
          dragRef.current.moved = true;
          setDragState({ rsvId: r._id, targetTableId: fromTableId });
        }
      }

      if (ev.cancelable) ev.preventDefault();

      const els = document.elementsFromPoint(cx, cy);
      const rowEl = els.find(el => el.dataset.tableId);
      if (rowEl) {
        dragRef.current.targetTableId = rowEl.dataset.tableId;
        setDragState({ rsvId: r._id, targetTableId: rowEl.dataset.tableId });
      }
    };

    const endDrag = async (commit = true) => {
      cleanup();

      const { moved, activated, targetTableId, rsv } = dragRef.current || {};
      dragRef.current = null;
      setDragState(null);

      // Not activated (long press never fired) or no movement → treat as tap/click
      if (!activated || !moved || !commit) {
        if (!moved) setSelectedRsv(rsv);
        return;
      }
      if (!targetTableId || targetTableId === fromTableId) return;

      // Conflict check
      const draggedStart = timeToMinutes(rsv.time);
      const draggedEnd   = draggedStart + (reservationDuration || 90);
      const conflict = (rsvsByTable[targetTableId] || []).some(existing => {
        if (existing._id === rsv._id) return false;
        const s = timeToMinutes(existing.time);
        const e = s + (reservationDuration || 90);
        return draggedStart < e && s < draggedEnd;
      });

      if (conflict) {
        setDragError('Mesa ocupada en ese horario');
        setTimeout(() => setDragError(null), 3000);
        return;
      }

      // Optimistic update — swap only fromTableId → targetTableId, keep the rest
      const targetTable = tables.find(t => t._id?.toString() === targetTableId);
      setReservations(prev => prev.map(r => {
        if (r._id !== rsv._id) return r;
        const kept = (r.tableIds || []).filter(t => (t._id?.toString() || t.toString()) !== fromTableId);
        return { ...r, tableIds: [...kept, targetTable].filter(Boolean), tableId: null };
      }));

      const newIds = getTableIds(rsv)
        .filter(id => id !== fromTableId)
        .concat(targetTableId);
      api.put(`/reservations/${rsv._id}`, { tableIds: newIds }).catch(() => {
        loadReservations(); // revert on error
      });
    };

    const endDragHandler = () => endDrag(true);

    // Touch: activate drag only after long press (450ms)
    if (isTouch) {
      dragRef.current.longPressTimer = setTimeout(() => {
        if (!dragRef.current) return;
        dragRef.current.activated = true;
        dragRef.current.moved = true; // consider it "dragging" from now
        setDragState({ rsvId: r._id, targetTableId: fromTableId });
        if (navigator.vibrate) navigator.vibrate(40); // haptic feedback
      }, 450);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDragHandler);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', endDragHandler);
  };

  // ── Time range ──
  const shiftStart = shifts.length ? Math.min(...shifts.map(s => timeToMinutes(s.startTime))) : 12 * 60;
  const shiftEnd   = shifts.length ? Math.max(...shifts.map(s => timeToMinutes(s.endTime)))   : 23 * 60;

  const assignedRsvs = reservations.filter(r => {
    if (!r.time) return false;
    return (Array.isArray(r.tableIds) && r.tableIds.length > 0) || r.tableId;
  });

  const rsvMinutes     = assignedRsvs.map(r => timeToMinutes(r.time));
  const effectiveStart = rsvMinutes.length ? Math.min(shiftStart, ...rsvMinutes) : shiftStart;
  const effectiveEnd   = reservationDuration && rsvMinutes.length
    ? Math.max(shiftEnd, ...rsvMinutes.map(m => m + reservationDuration))
    : shiftEnd;

  const totalMinutes  = Math.max(effectiveEnd - effectiveStart, 60);
  const timelineWidth = totalMinutes * PX_PER_MIN;

  const slots = [];
  for (let m = effectiveStart; m <= effectiveEnd; m += SLOT_EVERY) slots.push(m);

  // ── Room/table grouping ──
  const tablesByRoom = rooms
    .map(room => ({
      room,
      tables: tables
        .filter(t => (t.roomId?._id || t.roomId) === (room._id || room))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    }))
    .filter(g => g.tables.length > 0);

  const unassigned = tables.filter(t => !t.roomId);
  if (unassigned.length > 0) tablesByRoom.push({ room: { _id: '__none__', name: 'Sin sala' }, tables: unassigned });

  const getTableIds = (r) => {
    if (Array.isArray(r.tableIds) && r.tableIds.length > 0)
      return r.tableIds.map(t => t?._id?.toString() || t?.toString()).filter(Boolean);
    if (r.tableId) return [r.tableId._id?.toString() || r.tableId.toString()];
    return [];
  };

  const rsvsByTable = assignedRsvs.reduce((acc, r) => {
    getTableIds(r).forEach(id => { if (!acc[id]) acc[id] = []; acc[id].push(r); });
    return acc;
  }, {});

  // ── Date navigation ──
  const shiftDate = (days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const isToday = date === today;

  return (
    <PlanGate paid fallback={<div className="flex flex-col h-full"><UpgradePrompt /></div>}>
      <div className="flex flex-col h-full bg-white">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 border-b border-gray-200 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <NavButton onClick={() => shiftDate(-1)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </NavButton>
            <div className="text-center min-w-[160px]">
              <p className="text-sm font-bold text-gray-900 capitalize">{dateLabel}</p>
              {!isToday && (
                <button onClick={() => setDate(today)} className="text-[11px] text-violet-600 hover:text-violet-700 font-medium transition-colors">
                  Volver a hoy
                </button>
              )}
            </div>
            <NavButton onClick={() => shiftDate(1)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </NavButton>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={e => e.target.value && setDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* ── Guards ── */}
        {shifts.length === 0 && !loading && (
          <ConfigWarning icon="⏰" title="Sin turnos configurados"
            desc="Configura al menos un turno para que el calendario sepa qué rango horario mostrar."
            linkTo="/configuracion?tab=turnos" linkLabel="Ir a Turnos" />
        )}
        {shifts.length > 0 && !reservationDuration && !loading && (
          <ConfigWarning icon="⏱️" title="Duración por mesa no configurada"
            desc="El calendario necesita saber cuánto dura cada reserva. Configúralo en Límites."
            linkTo="/configuracion?tab=limites" linkLabel="Ir a Límites" />
        )}

        {/* ── Timeline ── */}
        {shifts.length > 0 && reservationDuration && (
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              </div>
            )}

            {!loading && (
              <div style={{ minWidth: TABLE_COL_W + timelineWidth + 32, position: 'relative' }}>

                {/* Time header */}
                <div className="sticky top-0 z-20 flex bg-white border-b border-gray-200" style={{ height: HEADER_H }}>
                  <div className="sticky left-0 z-30 shrink-0 bg-white border-r border-gray-100" style={{ width: TABLE_COL_W }} />
                  <div className="relative flex-1" style={{ width: timelineWidth }}>
                    {slots.map(m => {
                      const minute = m % 60;
                      const isHour = minute === 0;
                      const isHalf = minute === 30;
                      const isQuarter = minute === 15 || minute === 45;
                      return (
                        <div key={m} className="absolute flex flex-col items-start"
                          style={{ left: (m - effectiveStart) * PX_PER_MIN, top: 0, bottom: 0 }}>
                          {isHour && (
                            <span className="text-[11px] text-gray-400 font-medium pt-1 pl-1 leading-none">
                              {minutesToLabel(m)}
                            </span>
                          )}
                          <div
                            className={`mt-auto w-px ${
                              isHour
                                ? 'bg-gray-300 h-3'
                                : isHalf
                                ? 'bg-gray-300/80 h-2.5'
                                : isQuarter
                                ? 'bg-gray-300/65 h-2'
                                : 'bg-gray-200 h-1.5'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Room groups */}
                {tablesByRoom.map(({ room, tables: roomTables }) => (
                  <div key={room._id}>
                    <div className="flex items-center border-b border-gray-200 bg-gray-50" style={{ height: ROOM_H }}>
                      <div className="sticky left-0 z-10 flex items-center px-3 bg-gray-50 shrink-0" style={{ width: TABLE_COL_W }}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{room.name}</span>
                      </div>
                      <div className="flex-1 h-full" style={{ width: timelineWidth }} />
                    </div>

                    {roomTables.map((table) => {
                      const tableId    = table._id?.toString();
                      const tableRsvs  = rsvsByTable[tableId] || [];
                      const isDragTarget = dragState?.targetTableId === tableId && dragRef.current?.fromTableId !== tableId;
                      return (
                        <div
                          key={table._id}
                          data-table-id={tableId}
                          data-table-name={table.name}
                          className={`flex border-b border-gray-100 transition-colors ${isDragTarget ? 'bg-violet-50' : 'hover:bg-gray-50/40'}`}
                          style={{ height: ROW_H }}
                        >
                          <div className="sticky left-0 z-10 flex items-center px-3 bg-white border-r border-gray-100 shrink-0" style={{ width: TABLE_COL_W }}>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{table.name}</p>
                              {table.capacity && <p className="text-[10px] text-gray-400">{table.capacity} pax</p>}
                            </div>
                          </div>

                          <div className="relative" style={{ width: timelineWidth, height: ROW_H }}>
                            {slots.map(m => {
                              const minute = m % 60;
                              const isHour = minute === 0;
                              const isHalf = minute === 30;
                              const isQuarter = minute === 15 || minute === 45;
                              return (
                                <div
                                  key={m}
                                  className={`absolute top-0 bottom-0 w-px ${
                                    isHour ? 'bg-gray-200' : isHalf ? 'bg-gray-200/90' : isQuarter ? 'bg-gray-200/70' : 'bg-gray-100'
                                  }`}
                                  style={{ left: (m - effectiveStart) * PX_PER_MIN }}
                                />
                              );
                            })}

                            {tableRsvs.map(r => {
                              const rMin    = timeToMinutes(r.time);
                              const left    = (rMin - effectiveStart) * PX_PER_MIN;
                              const width   = Math.max(reservationDuration * PX_PER_MIN - 3, 20);
                              const colors  = BLOCK[r.status] || BLOCK.confirmed;
                              const isDragging = dragState?.rsvId === r._id;
                              return (
                                <div key={r._id}
                                  title={`${r.guestName} · ${r.people} pax · ${r.time}`}
                                  onMouseDown={(e) => { e.preventDefault(); startDrag(e, r, tableId); }}
                                  onTouchStart={(e) => startDrag(e, r, tableId)}
                                  className="absolute top-1.5 bottom-1.5 rounded-lg px-2 flex flex-col justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none transition-all"
                                  style={{ left, width, backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}`, color: colors.text, opacity: isDragging ? 0.45 : 1 }}
                                >
                                  <p className="text-[11px] font-semibold leading-tight truncate">{r.guestName}</p>
                                  <p className="text-[10px] leading-tight opacity-70">{r.time} · {r.people} pax</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {tablesByRoom.length === 0 && (
                  <div className="flex items-center justify-center py-16 text-sm text-gray-400">Sin mesas configuradas</div>
                )}

                {/* Current time indicator */}
                {date === today && nowMinutes >= effectiveStart && nowMinutes <= effectiveEnd && (
                  <div style={{
                    position: 'absolute',
                    left: TABLE_COL_W + (nowMinutes - effectiveStart) * PX_PER_MIN,
                    top: HEADER_H,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#ef4444',
                    opacity: 0.35,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', marginLeft: -3, marginTop: -4 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Drag conflict toast ── */}
        {dragError && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl shadow-lg pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-4a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5A.75.75 0 0 1 8 11Zm0 2.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" clipRule="evenodd" />
            </svg>
            {dragError}
          </div>
        )}

        {/* ── Reservation drawer ── */}
        {selectedRsv && (
          <ReservationDrawer
            reservation={selectedRsv}
            onClose={() => setSelectedRsv(null)}
            onAction={(action) => handleAction(selectedRsv, action)}
            onEdit={() => handleEdit(selectedRsv)}
          />
        )}

        {/* ── Edit modal ── */}
        {editRsv && (
          <Modal title="Editar reserva" onClose={() => setEditRsv(null)}>
            <ReservationForm
              reservation={editRsv}
              onSave={afterSave}
              onCancel={() => setEditRsv(null)}
            />
          </Modal>
        )}
        <ToastStack toasts={toasts} />
      </div>
    </PlanGate>
  );
}
