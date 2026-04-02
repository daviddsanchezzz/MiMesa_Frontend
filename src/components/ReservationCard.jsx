import { useState, useEffect, useRef } from 'react';

export const statusConfig = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',      dot: 'bg-amber-400',  bar: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',   dot: 'bg-violet-500', bar: 'bg-violet-500' },
  seated:    { label: 'Sentada',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500',bar: 'bg-emerald-500' },
  no_show:   { label: 'No show',    cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',         dot: 'bg-rose-400',   bar: 'bg-rose-400' },
  cancelled: { label: 'Cancelada',  cls: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',        dot: 'bg-gray-300',   bar: 'bg-gray-300' },
};

export function Avatar({ name }) {
  const colors = ['bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full ${colors[idx]} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export function TableCell({ reservation, tables, onAssign }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const panelRef = useRef(null);


  // Resolve currently assigned IDs — prefer tableIds array, fallback to tableId
  const assignedIds = (() => {
    if (Array.isArray(reservation.tableIds) && reservation.tableIds.length > 0)
      return reservation.tableIds.map(t => t?._id?.toString() || t?.toString()).filter(Boolean);
    if (reservation.tableId)
      return [reservation.tableId._id?.toString() || reservation.tableId.toString()];
    return [];
  })();

  const [selected, setSelected] = useState(assignedIds);

  // Reset selection when reservation changes
  useEffect(() => { setSelected(assignedIds); }, [reservation._id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const roomId = reservation.roomId?._id || reservation.roomId;
  const available = tables
    .filter(t => !roomId || t.roomId?._id === roomId || t.roomId === roomId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const grouped = available.reduce((acc, t) => {
    const key = t.roomId?.name || 'Sin sala';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Assigned table objects for display
  const assignedTables = assignedIds
    .map(id => tables.find(t => (t._id?.toString() || t.toString()) === id))
    .filter(Boolean);

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const save = () => {
    onAssign(reservation._id, selected);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setSelected(assignedIds); setOpen(true); }}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          assignedTables.length > 0
            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 font-medium'
            : 'border-dashed border-gray-300 text-gray-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50'
        }`}
      >
        {assignedTables.length > 0 ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            {assignedTables.map(t => t.name).join(', ')}
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
    <div ref={ref}>
      <div ref={panelRef} className="fixed top-4 left-4 right-4 z-50 bg-white border border-violet-200 rounded-xl shadow-xl p-3 max-h-[80vh] overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Seleccionar mesas</p>

        {/* None option */}
        <label className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            className="accent-violet-600 w-3.5 h-3.5"
            checked={selected.length === 0}
            onChange={() => setSelected([])}
          />
          <span className="text-xs text-gray-500">Sin mesa</span>
        </label>

        {/* Tables grouped by room */}
        {Object.entries(grouped).map(([roomName, roomTables]) => (
          <div key={roomName}>
            {Object.keys(grouped).length > 1 && (
              <p className="text-[10px] text-gray-400 font-medium mt-2 mb-1 px-1">{roomName}</p>
            )}
            {roomTables.map(t => {
              const id = t._id?.toString();
              return (
                <label key={id} className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-violet-600 w-3.5 h-3.5"
                    checked={selected.includes(id)}
                    onChange={() => toggle(id)}
                  />
                  <span className="text-xs text-gray-700 font-medium">{t.name}</span>
                  {t.capacity && <span className="text-[10px] text-gray-400 ml-auto">{t.capacity} pax</span>}
                </label>
              );
            })}
          </div>
        ))}

        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={save}
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            Guardar
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// Main expandable card — same as MobileRow in Reservations
export function ReservationCard({
  r,
  tables = [],
  onEdit,
  onCancel,
  onDelete,
  onAssign,
  onQuickStatus,
  onNoShow,
  canMarkNoShow = false,
  canModeratePending = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const s = statusConfig[r.status] || statusConfig.pending;
  const isCancelled = r.status === 'cancelled';

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Collapsed row — tap to expand */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />

        <div className="shrink-0 w-14 text-center">
          <p className="text-lg font-bold text-gray-900 leading-none">{r.time}</p>
          <p className={`text-[10px] font-semibold mt-1 ${
            r.status === 'confirmed' ? 'text-violet-500' :
            r.status === 'seated'    ? 'text-emerald-500' :
            r.status === 'pending'   ? 'text-amber-500' : 'text-gray-400'
          }`}>{s.label}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{r.guestName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-gray-400">
                <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.75 11a.75.75 0 0 0 .75-.75 4.5 4.5 0 0 0-9 0c0 .414.336.75.75.75h7.5Z" />
              </svg>
              {r.people} pax
            </span>
            {(r.tableIds?.length > 0 || r.tableId) ? (
              (r.tableIds?.length > 0 ? r.tableIds : [r.tableId]).map(t => (
                <span key={t._id || t} className="text-xs text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-md">{t.name}</span>
              ))
            ) : (
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

        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
          className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-3 bg-gray-50/80 border-t border-gray-100 space-y-3">
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Mesa:</span>
            <TableCell reservation={r} tables={tables} onAssign={onAssign} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {canModeratePending && r.status === 'pending' && (
              <button onClick={() => onQuickStatus(r._id, 'confirmed')}
                className="flex-1 text-xs font-semibold py-2 rounded-xl bg-violet-600 text-white active:bg-violet-700 transition-colors">
                Confirmar
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
            <button onClick={onDelete}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
