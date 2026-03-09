import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ReservationForm from '../components/ReservationForm';
import Modal from '../components/Modal';

const statusConfig = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  confirmed: { label: 'Confirmada', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  seated:    { label: 'Sentada',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  cancelled: { label: 'Cancelada',  cls: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
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
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            {assigned.name}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            Asignar
          </>
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

// Mobile card for a single reservation
function ReservationCard({ r, tables, onEdit, onCancel, onDelete, onAssign }) {
  const s = statusConfig[r.status];
  const colors = ['bg-indigo-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500'];
  const idx = (r.guestName?.charCodeAt(0) || 0) % colors.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      {/* Top row: avatar + name + status */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${colors[idx]} flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5`}>
          {r.guestName?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 leading-tight">{r.guestName}</p>
            {r.customerId && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
            <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{r.guestPhone || r.guestEmail || '—'}</p>
        </div>
      </div>

      {/* Details row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
            <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
          </svg>
          {r.time}
        </span>
        <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
          </svg>
          {r.people} {r.people === 1 ? 'persona' : 'personas'}
        </span>
        {(r.roomId || r.tableId?.roomId) && (
          <span className="inline-flex items-center text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-600">
            {r.roomId?.name || r.tableId?.roomId?.name}
          </span>
        )}
        <TableCell reservation={r} tables={tables} onAssign={onAssign} />
      </div>

      {/* Action row */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1">
        <button
          onClick={onEdit}
          className="flex-1 text-center text-xs font-medium px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          Editar
        </button>
        {r.status !== 'cancelled' && (
          <button
            onClick={onCancel}
            className="flex-1 text-center text-xs font-medium px-3 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={onDelete}
          className="text-xs font-medium px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [tables,       setTables]       = useState([]);
  const [dateFilter,   setDateFilter]   = useState(new Date().toISOString().slice(0, 10));
  const [modal,        setModal]        = useState(null);

  const load = () => {
    const q = dateFilter ? `?date=${dateFilter}` : '';
    api.get(`/reservations${q}`).then(r => setReservations(r.data));
  };

  useEffect(() => { load(); }, [dateFilter]);
  useEffect(() => { api.get('/tables').then(r => setTables(r.data)); }, []);

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
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reservas</h2>
          <p className="text-sm text-gray-400 mt-0.5">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''} · {dateFilter}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input type="date" value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            <span className="hidden sm:inline">Nueva reserva</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* Mini stats */}
      {reservations.length > 0 && (
        <div className="flex gap-2 flex-wrap">
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

      {/* Empty state */}
      {reservations.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
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

      {/* Mobile card list */}
      {reservations.length > 0 && (
        <div className="space-y-3 sm:hidden">
          {reservations.map((r) => (
            <ReservationCard
              key={r._id}
              r={r}
              tables={tables}
              onEdit={() => setModal({ mode: 'edit', reservation: r })}
              onCancel={() => quickStatus(r._id, 'cancelled')}
              onDelete={() => handleDelete(r._id)}
              onAssign={assignTable}
            />
          ))}
        </div>
      )}

      {/* Desktop table */}
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
                              {r.customerId && (
                                <span title="Cliente registrado" className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{r.guestPhone || r.guestEmail || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-800">{r.time}</span>
                      </td>
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
