import { MenuButton } from '../../ui/kit';
import { compLabel, compTypeLabel, initialsOf } from './shared';

/** A coloured dot and the state in words. */
export function StateText({ active, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-700' : 'text-gray-500'} ${className}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  );
}

/**
 * One employee: a row on the phone (name, puestos and pay below), a line of
 * the table from md up. Tap opens the edit sheet; ⋯ holds the rest.
 */
export function EmployeeRow({ employee, onEdit, onPago, onToggle, onAccess }) {
  const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();
  const comp = employee.activeCompensation;
  const positions = employee.positions || [];
  const active = employee.status === 'active';
  const color = positions[0]?.color || '#94a3b8';

  return (
    <li>
      <div role="button" tabIndex={0} onClick={onEdit}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
        className="flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 px-2 py-3 rounded-xl cursor-pointer hover:bg-gray-50 active:bg-gray-100">
        <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${active ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
            style={active ? { backgroundColor: color } : undefined}>
            {initialsOf(fullName)}
          </span>
          <div className="min-w-0">
            <p className={`text-[15px] font-medium truncate ${active ? 'text-gray-900' : 'text-gray-500'}`}>{fullName}</p>
            <p className="text-[13px] text-gray-500 truncate">{employee.email || employee.phone || 'Sin contacto'}</p>
            <p className="md:hidden text-[13px] truncate">
              {positions.length > 0 && <span className="text-gray-500">{positions.map((p) => p.name).join(', ')} · </span>}
              {comp ? <span className="text-gray-500">{compLabel(comp)}</span> : <span className="text-amber-700">Sin condiciones de pago</span>}
              {employee.member && <span className="text-emerald-700"> · Con acceso</span>}
              {!employee.member && employee.pendingInvitation && <span className="text-amber-700"> · Invitado</span>}
              {!active && <span className="text-gray-400"> · Inactivo</span>}
            </p>
          </div>
        </div>
        <div className="hidden md:flex md:col-span-3 flex-wrap gap-x-3 gap-y-1 min-w-0">
          {positions.length === 0 && <span className="text-sm text-gray-300">—</span>}
          {positions.map((position) => (
            <span key={position._id} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
              {position.name}
            </span>
          ))}
        </div>
        <div className="hidden md:block md:col-span-2 min-w-0">
          {comp ? (
            <>
              <p className="text-sm tabular-nums text-gray-900">{compLabel(comp)}</p>
              <p className="text-[11px] text-gray-500">{compTypeLabel(comp.paymentType)}</p>
            </>
          ) : (
            <button type="button" onClick={(e) => { e.stopPropagation(); onPago(); }} className="text-[11px] font-semibold px-1.5 py-px rounded bg-amber-50 text-amber-800 hover:bg-amber-100">Sin definir</button>
          )}
        </div>
        <div className="hidden md:block md:col-span-2">
          <StateText active={active} />
          {employee.member && <p className="text-[11px] text-emerald-700">Con acceso a Vetra</p>}
          {!employee.member && employee.pendingInvitation && <p className="text-[11px] text-amber-700">Invitado</p>}
        </div>
        <div className="md:col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <MenuButton ariaLabel="Más opciones" className="w-9 h-9 justify-center text-gray-500"
            items={[
              { label: 'Editar', onClick: onEdit },
              { label: comp ? 'Cambiar cómo cobra' : 'Definir cómo cobra', onClick: onPago },
              onAccess && { label: employee.member ? 'Acceso a Vetra' : employee.pendingInvitation ? 'Invitación pendiente' : 'Dar acceso a Vetra', onClick: onAccess },
              { label: active ? 'Desactivar' : 'Activar', onClick: onToggle },
            ]}>
            <MoreIcon />
          </MenuButton>
        </div>
      </div>
      {employee.notes && (
        <p className="-mt-1.5 pb-3 pl-[60px] pr-2 text-[13px] text-gray-500 truncate">“{employee.notes}”</p>
      )}
    </li>
  );
}

export const MobileEmployeeRow = EmployeeRow;
