import { MoreMenu } from '../../ui/kit';
import { Avatar, Chip, DataTable, StatusDot } from '../../ui/list';
import { compLabel, compTypeLabel, initialsOf } from './shared';

/** A coloured dot and the state in words. */
export function StateText({ active }) {
  return <StatusDot tone={active ? 'green' : 'gray'}>{active ? 'Activo' : 'Inactivo'}</StatusDot>;
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  );
}

const stop = (e) => e.stopPropagation();

/**
 * The employees: a list on the phone (name, puestos and pay below), a table
 * from md up. Tap opens the edit sheet; the menu holds the rest.
 */
export function EmployeeTable({ employees, onEdit, onPago, onToggle, onAccess }) {
  const nameOf = (e) => `${e.firstName} ${e.lastName || ''}`.trim();
  const menu = (e) => (
    <MoreMenu items={[
      { label: 'Editar', onClick: () => onEdit(e) },
      { label: e.activeCompensation ? 'Cambiar cómo cobra' : 'Definir cómo cobra', onClick: () => onPago(e) },
      onAccess && { label: e.member ? 'Acceso a Vetra' : e.pendingInvitation ? 'Invitación pendiente' : 'Dar acceso a Vetra', onClick: () => onAccess(e) },
      { label: e.status === 'active' ? 'Desactivar' : 'Activar', onClick: () => onToggle(e) },
    ]} />
  );
  const columns = [
    { label: 'Empleado', span: 4, render: (e) => {
      const active = e.status === 'active';
      return (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar round color={active ? { bg: e.positions?.[0]?.color || '#94a3b8', fg: '#fff' } : undefined} className="text-gray-500">{initialsOf(nameOf(e))}</Avatar>
          <div className="min-w-0">
            <p className={`text-[15px] font-medium truncate ${active ? 'text-gray-900' : 'text-gray-500'}`}>{nameOf(e)}</p>
            <p className="text-[13px] text-gray-500 truncate">{e.email || e.phone || 'Sin contacto'}</p>
            {e.notes && <p className="text-[13px] text-gray-400 truncate">“{e.notes}”</p>}
          </div>
        </div>
      );
    } },
    { label: 'Puestos', span: 3, render: (e) => {
      const positions = e.positions || [];
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
          {positions.length === 0 && <span className="text-sm text-gray-300">—</span>}
          {positions.map((position) => (
            <span key={position._id} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
              {position.name}
            </span>
          ))}
        </div>
      );
    } },
    { label: 'Cómo cobra', span: 2, render: (e) => {
      const comp = e.activeCompensation;
      return comp ? (
        <>
          <p className="text-sm tabular-nums text-gray-900">{compLabel(comp)}</p>
          <p className="text-[11px] text-gray-500">{compTypeLabel(comp.paymentType)}</p>
        </>
      ) : (
        <button type="button" onClick={(ev) => { ev.stopPropagation(); onPago(e); }} className="text-[11px] font-semibold px-1.5 py-px rounded bg-amber-50 text-amber-800 hover:bg-amber-100">Sin definir</button>
      );
    } },
    { label: 'Estado', span: 2, render: (e) => (
      <>
        <StateText active={e.status === 'active'} />
        {e.member && <p className="text-[11px] text-emerald-700">Con acceso a Vetra</p>}
        {!e.member && e.pendingInvitation && <p className="text-[11px] text-amber-700">Invitado</p>}
      </>
    ) },
    { label: '', span: 1, align: 'right', render: (e) => <div className="flex justify-end" onClick={stop}>{menu(e)}</div> },
  ];
  const mobile = (e) => {
    const active = e.status === 'active';
    const comp = e.activeCompensation;
    const positions = e.positions || [];
    return {
      leading: <Avatar round color={active ? { bg: e.positions?.[0]?.color || '#94a3b8', fg: '#fff' } : undefined} className="text-gray-500">{initialsOf(nameOf(e))}</Avatar>,
      title: (
        <>
          {nameOf(e)}
          {e.member && <Chip tone="green" className="ml-2 align-middle !text-[10px]">Con acceso</Chip>}
          {!e.member && e.pendingInvitation && <Chip tone="amber" className="ml-2 align-middle !text-[10px]">Invitado</Chip>}
        </>
      ),
      muted: !active,
      subtitle: (
        <>
          {positions.length > 0 && `${positions.map((p) => p.name).join(', ')} · `}
          {comp ? compLabel(comp) : <span className="text-amber-700">Sin condiciones de pago</span>}
          {!active && ' · Inactivo'}
        </>
      ),
      trailing: <span onClick={stop}>{menu(e)}</span>,
    };
  };
  return <DataTable columns={columns} rows={employees} rowKey={(e) => e._id} mobile={mobile} onRowClick={onEdit} />;
}
