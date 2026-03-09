import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ReservationForm from '../components/ReservationForm';
import Modal from '../components/Modal';

const statusConfig = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-400',   bar: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', dot: 'bg-indigo-500',  bar: 'bg-indigo-500' },
  seated:    { label: 'Sentada',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  cancelled: { label: 'Cancelada',  cls: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',      dot: 'bg-gray-300',    bar: 'bg-gray-300' },
};

function Avatar({ name }) {
  const colors = ['bg-indigo-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500'];
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
    blue:   'text-indigo-600 hover:bg-indigo-50',
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

  const roomId = reservation.roomId?._id || reservation.roomId;
  const available = tables.filter(t => !roomId || t.roomId?._id === roomId || t.roomId === roomId);
  const assigned  = reservation.tableId;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          assigned
            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 font-medium'
            : 'border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50'
        }`}
      >
        {assigned ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />{assigned.name}</>
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
        className="text-xs border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-md min-w-[140px]"
      >
        <option value="">Sin mesa</option>
        {available.map(t => (
          <option key={t._id} value={t._id}>
            {t.name} ({t.capacity} px){t.roomId?.name ? ` · ${t.roomId.name}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Mobile row: ultra-compact, max density ──────────────────────────────────
function MobileRow({ r, tables, onEdit, onCancel, onDelete, onAssign, onQuickStatus }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusConfig[r.status];
  const isCancelled = r.status === 'cancelled';

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Main row — tap to expand */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        {/* Status bar left edge */}
        <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />

        {/* Time — BIG */}
        <div className="shrink-0 w-14 text-center">
          <p className="text-lg font-bold text-gray-900 leading-none">{r.time}</p>
          <p className={`text-[10px] font-semibold mt-1 ${
            r.status === 'confirmed' ? 'text-indigo-500' :
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
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-md">{r.tableId.name}</span>
            )}
            {!r.tableId && (
              <span className="text-xs text-gray-300">sin mesa</span>
            )}
            {(r.roomId?.name || r.tableId?.roomId?.name) && (
              <span className="text-xs text-gray-400 truncate">{r.roomId?.name || r.tableId?.roomId?.name}</span>
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
                <a href={`tel:${r.guestPhone}`} className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
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
            {r.status !== 'confirmed' && r.status !== 'cancelled' && (
              <button onClick={() => onQuickStatus(r._id, 'confirmed')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-indigo-600 text-white active:bg-indigo-700 transition-colors">
                Confirmar
              </button>
            )}
            {r.status !== 'seated' && r.status !== 'cancelled' && (
              <button onClick={() => onQuickStatus(r._id, 'seated')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-emerald-600 text-white active:bg-emerald-700 transition-colors">
                Sentar
              </button>
            )}
            <button onClick={onEdit}
              className="flex-1 text-xs font-semibold py-2 rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors">
              Editar
            </button>
            {r.status !== 'cancelled' && (
              <button onClick={onCancel}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 active:bg-rose-100 transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [tables,       setTables]       = useState([]);
  const [slots,        setSlots]        = useState([]);   // [{time, shiftName}]
  const [dateFilter,   setDateFilter]   = useState(new Date().toISOString().slice(0, 10));
  const [modal,        setModal]        = useState(null);

  const load = () => {
    const q = dateFilter ? `?date=${dateFilter}` : '';
    api.get(`/reservations${q}`).then(r => setReservations(r.data));
  };

  useEffect(() => {
    load();
    api.get(`/shifts/slots?date=${dateFilter}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]));
  }, [dateFilter]);
  useEffect(() => { api.get('/tables').then(r => setTables(r.data)); }, []);

  // Build time→shiftName map and ordered shift list from slots
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
    reservations.forEach(r => {
      const name = timeToShift[r.time];
      if (name) groups[name].push(r);
      else      groups['__otros__'].push(r);
    });
    // remove empty __otros__
    if (groups['__otros__'].length === 0) delete groups['__otros__'];
    return groups;
  };

  const quickStatus = async (id, status) => {
    await api.put(`/reservations/${id}`, { status }); load();
  };

  const assignTable = async (id, tableId) => {
    await api.put(`/reservations/${id}`, { tableId }); load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta reserva?')) return;
    await api.delete(`/reservations/${id}`); load();
  };

  const counts = {
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    seated:    reservations.filter(r => r.status === 'seated').length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  // Date nav: prev / next day
  const shiftDate = (days) => {
    const d = new Date(dateFilter + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDateFilter(d.toISOString().slice(0, 10));
  };

  const isToday = dateFilter === new Date().toISOString().slice(0, 10);
  const dateLabel = new Date(dateFilter + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      {/* ── MOBILE HEADER ──────────────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 active:bg-gray-100 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L6.81 8l2.97 2.72a.75.75 0 1 1-1.06 1.06L5.25 8.53a.75.75 0 0 1 0-1.06l3.47-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-gray-900 capitalize">{dateLabel}</p>
            {isToday && <p className="text-xs text-indigo-500 font-medium">Hoy</p>}
          </div>
          <button onClick={() => shiftDate(1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 active:bg-gray-100 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          <button onClick={() => setModal({ mode: 'create' })}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white active:bg-indigo-700 shrink-0 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
          </button>
        </div>

        {/* Stats strip */}
        {reservations.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[
              { label: 'Total',    count: reservations.length,  cls: 'bg-gray-50 text-gray-700 border-gray-200' },
              { label: 'Pend.',    count: counts.pending,       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Conf.',    count: counts.confirmed,     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { label: 'Sentadas', count: counts.seated,        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center py-2 rounded-xl border text-xs font-medium ${s.cls}`}>
                <span className="font-bold text-lg leading-none">{s.count}</span>
                <span className="mt-0.5 text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DESKTOP HEADER ─────────────────────────────────────────────── */}
      <div className="hidden sm:flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reservas</h2>
          <p className="text-sm text-gray-400 mt-0.5">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''} · {dateFilter}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button onClick={() => setModal({ mode: 'create' })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            Nueva reserva
          </button>
        </div>
      </div>

      {/* Desktop mini stats */}
      {reservations.length > 0 && (
        <div className="hidden sm:flex gap-2 flex-wrap">
          {[
            { label: 'Confirmadas', count: counts.confirmed, cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'Sentadas',    count: counts.seated,    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Canceladas',  count: counts.cancelled, cls: 'bg-gray-50 text-gray-700 border-gray-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${s.cls}`}>
              <span className="font-bold text-base leading-none">{s.count}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────── */}
      {reservations.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-6 h-6 text-gray-300">
              <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Sin reservas para este día</p>
          <button onClick={() => setModal({ mode: 'create' })} className="mt-4 text-sm text-indigo-600 hover:underline font-medium">
            Crear la primera reserva →
          </button>
        </div>
      )}

      {/* ── MOBILE LIST ────────────────────────────────────────────────── */}
      {reservations.length > 0 && (() => {
        const groups = groupedByShift();

        const renderRow = (r) => (
          <MobileRow
            key={r._id}
            r={r}
            tables={tables}
            onEdit={() => setModal({ mode: 'edit', reservation: r })}
            onCancel={() => quickStatus(r._id, 'cancelled')}
            onDelete={() => handleDelete(r._id)}
            onAssign={assignTable}
            onQuickStatus={quickStatus}
          />
        );

        // No shifts or single shift → flat list
        if (!groups) {
          return (
            <div className="sm:hidden bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {reservations.map(renderRow)}
            </div>
          );
        }

        // Multiple shifts → grouped sections
        return (
          <div className="sm:hidden space-y-3">
            {Object.entries(groups).map(([shiftName, rows]) => {
              if (rows.length === 0) return null;
              const active  = rows.filter(r => r.status !== 'cancelled').length;
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

      {/* ── DESKTOP TABLE ──────────────────────────────────────────────── */}
      {reservations.length > 0 && (
        <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
              <tbody>
                {reservations.map((r, i) => {
                  const s = statusConfig[r.status];
                  return (
                    <tr key={r._id}
                      className={`hover:bg-gray-50/60 transition-colors ${i < reservations.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.guestName} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-900 leading-tight">{r.guestName}</p>
                              {r.customerId && <span title="Cliente registrado" className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
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
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <TableCell reservation={r} tables={tables} onAssign={assignTable} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-0.5">
                          <ActionBtn onClick={() => setModal({ mode: 'edit', reservation: r })} color="blue">Editar</ActionBtn>
                          {r.status !== 'cancelled' && <ActionBtn onClick={() => quickStatus(r._id, 'cancelled')} color="red">Cancelar</ActionBtn>}
                          <ActionBtn onClick={() => handleDelete(r._id)} color="gray">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                            </svg>
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nueva reserva' : 'Editar reserva'}
          subtitle={modal.mode === 'create' ? 'Crea una nueva reserva' : 'Modifica los datos de la reserva'}
          onClose={() => setModal(null)}
        >
          <ReservationForm
            reservation={modal.reservation}
            onSave={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
