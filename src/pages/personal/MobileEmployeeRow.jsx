import { useState } from 'react';
import { compLabel, compTypeLabel } from './shared';

export function MobileEmployeeRow({ employee, onEdit, onPago, onToggle }) {
  const [open, setOpen] = useState(false);
  const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();
  const comp = employee.activeCompensation;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {employee.email || employee.phone || 'Sin contacto'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(employee.positions || []).slice(0, 3).map((pos) => (
            <span key={pos._id} className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: pos.color || '#64748B' }} title={pos.name} />
          ))}
          <span className={`text-[11px] border px-2 py-0.5 rounded-full font-semibold ${
            employee.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {employee.status === 'active' ? 'Activo' : 'Inact.'}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 bg-gray-50/80 border-t border-gray-100 space-y-2">
          {(employee.positions || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(employee.positions || []).map((pos) => (
                <span key={pos._id} className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 border border-gray-200 bg-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pos.color || '#64748B' }} />
                  {pos.name}
                </span>
              ))}
            </div>
          )}
          {comp ? (
            <p className="text-xs text-gray-600 font-medium">{compLabel(comp)} · {compTypeLabel(comp.paymentType)}</p>
          ) : (
            <p className="text-xs text-amber-600">Sin condiciones de pago</p>
          )}
          {employee.notes && (
            <p className="text-xs text-gray-500 italic bg-white border border-gray-200 rounded-lg px-2.5 py-2">
              "{employee.notes}"
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onPago} className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-violet-50 text-violet-700 active:bg-violet-100 transition-colors">
              Pago
            </button>
            <button onClick={onEdit} className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors">
              Editar
            </button>
            <button onClick={onToggle} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              employee.status === 'active' ? 'bg-rose-50 text-rose-600 active:bg-rose-100' : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100'
            }`}>
              {employee.status === 'active' ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
