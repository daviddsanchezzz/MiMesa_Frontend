const statusConfig = {
  free:     { label: 'Libre',     border: 'border-t-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400' },
  reserved: { label: 'Reservada', border: 'border-t-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     dot: 'bg-amber-400' },
  occupied: { label: 'Ocupada',   border: 'border-t-rose-400',    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',        dot: 'bg-rose-400' },
};

const nextStates = {
  free:     [{ s: 'reserved', label: 'Marcar reservada' }, { s: 'occupied', label: 'Marcar ocupada' }],
  reserved: [{ s: 'occupied', label: 'Sentar' },           { s: 'free',     label: 'Liberar' }],
  occupied: [{ s: 'free',     label: 'Liberar' }],
};

export default function TableCard({ table, onEdit, onDelete, onStatusChange }) {
  const cfg = statusConfig[table.status];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${cfg.border} shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col`}>
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{table.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3">
                  <path d="M7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM10.95 12.25a.75.75 0 0 0 .55-1.386A6.507 6.507 0 0 0 7 9.5a6.507 6.507 0 0 0-4.505 1.364.75.75 0 0 0 .55 1.386A5.007 5.007 0 0 1 7 11a5.007 5.007 0 0 1 3.95 1.25Z" />
                </svg>
                {table.capacity}
              </span>
              {table.roomId && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">
                  {table.roomId.name}
                </span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {(nextStates[table.status] || []).map(({ s, label }) => (
            <button
              key={s}
              onClick={() => onStatusChange(table._id, s)}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium transition-colors border border-gray-200"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onEdit(table)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 font-medium transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(table._id)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
