import { useState } from 'react';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { Empty, MoreMenu, RowAction, Section } from '../../ui/kit';
import { Avatar, List, ListRow } from '../../ui/list';
import { Notice, initialsOf } from './shared';
import OpenShiftModal from './OpenShiftModal';
import TimeOffModal from './TimeOffModal';
import { plural, timeOffLabel, timeOffWhen } from './timeOff';
import { confirmDialog } from '../../ui/confirm';

const dayText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

const PersonAvatar = ({ name }) => <Avatar round>{initialsOf(name)}</Avatar>;

/** Manager's inbox: days off to answer, shift swaps to approve, and what is coming up. */
export default function RequestsTab({ employees, shifts = [], positions = [], onChanged }) {
  const off = useData(['staff', 'time-off', 'manager'], () => api.get('/staff/time-off?status=all').then((r) => r.data.items));
  const swaps = useData(['staff', 'swaps', 'manager'], () => api.get('/staff/swaps').then((r) => r.data.items));
  const history = useData(['staff', 'swaps', 'history'], () => api.get('/staff/swaps?status=history').then((r) => r.data.items));
  const [modal, setModal] = useState(false);
  const [openShift, setOpenShift] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const refresh = async () => { await Promise.all([off.refetch(), swaps.refetch(), history.refetch()]); onChanged?.(); };
  const act = async (key, fn) => {
    setBusy(key);
    setError('');
    try { await fn(); await refresh(); } catch (err) { setError(err?.response?.data?.message || 'No se pudo completar'); } finally { setBusy(null); }
  };

  const pendingOff = (off.data || []).filter((t) => t.status === 'pending');
  const upcomingOff = (off.data || []).filter((t) => t.status === 'approved');
  const toApprove = (swaps.data || []).filter((s) => s.status === 'pending_manager');
  const waiting = (swaps.data || []).filter((s) => s.status === 'pending_peer');
  const loading = (off.isLoading || swaps.isLoading) && !off.data && !swaps.data;
  const nothing = !pendingOff.length && !upcomingOff.length && !toApprove.length && !waiting.length;

  return (
    <div className="space-y-6">
      <Notice>{error}</Notice>
      <div className="flex flex-wrap justify-end gap-2">
        {shifts.length > 0 && (
          <button type="button" onClick={() => setOpenShift(true)}
            className="h-9 px-4 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">+ Turno libre</button>
        )}
        <button type="button" onClick={() => setModal(true)}
          className="h-9 px-4 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">+ Añadir ausencia</button>
      </div>

      {loading && <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />}
      {!loading && nothing && <Empty>No hay solicitudes ni ausencias próximas. Cuando tu equipo pida un día libre o un cambio de turno, aparecerá aquí.</Empty>}

      {toApprove.length > 0 && (
        <Section title={`Cambios de turno por aprobar · ${toApprove.length}`}>
          <List>
            {toApprove.map((s) => (
              <li key={s.id} className="py-3.5">
                <p className="text-[15px] font-medium text-gray-900">
                  {s.type === 'open' ? <>{s.acceptedBy?.name} cubrirá un turno libre</> : <>{s.from?.name} <span className="text-gray-400">{s.type === 'exchange' ? '⇄' : '→'}</span> {s.acceptedBy?.name}</>}
                </p>
                <p className="text-[13px] text-gray-600 first-letter:uppercase">{dayText(s.date)} · {s.start}–{s.end}{s.shiftName ? ` · ${s.shiftName}` : ''}{s.roleLabel ? ` · ${s.roleLabel}` : ''}</p>
                {s.counter && <p className="text-[13px] text-gray-600">A cambio: <span className="first-letter:uppercase">{dayText(s.counter.date)}</span> · {s.counter.start}–{s.counter.end}{s.counter.shiftName ? ` · ${s.counter.shiftName}` : ''}</p>}
                {s.note && <p className="mt-0.5 text-[13px] text-gray-500">“{s.note}”</p>}
                {s.review?.warnings?.length > 0 && (
                  <ul className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900 space-y-0.5">
                    {s.review.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
                  </ul>
                )}
                {s.review && s.review.cost.delta !== 0 && (
                  <p className="mt-1.5 text-[13px] text-gray-600">Coste: {s.review.cost.before.toLocaleString('es-ES')} € → {s.review.cost.after.toLocaleString('es-ES')} € <span className={s.review.cost.delta > 0 ? 'text-rose-700' : 'text-emerald-700'}>({s.review.cost.delta > 0 ? '+' : ''}{s.review.cost.delta.toLocaleString('es-ES')} €)</span></p>
                )}
                <div className="mt-3 flex gap-2">
                  <RowAction tone="primary" disabled={busy === s.id} onClick={() => act(s.id, () => api.patch(`/staff/swaps/${s.id}/decision`, { status: 'approved' }))}>Aprobar</RowAction>
                  <RowAction disabled={busy === s.id} onClick={() => act(s.id, () => api.patch(`/staff/swaps/${s.id}/decision`, { status: 'rejected' }))}>{s.type === 'open' ? 'Elegir a otra persona' : 'Rechazar'}</RowAction>
                </div>
              </li>
            ))}
          </List>
        </Section>
      )}

      {pendingOff.length > 0 && (
        <Section title={`Ausencias por responder · ${pendingOff.length}`}>
          <List>
            {pendingOff.map((t) => (
              <li key={t.id} className="py-3.5">
                <div className="flex items-center gap-3">
                  <PersonAvatar name={t.employeeName} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-gray-900 truncate">{t.employeeName}</p>
                    <p className="text-[13px] text-gray-600">{timeOffLabel(t.type)} · {timeOffWhen(t)}</p>
                  </div>
                </div>
                {t.note && <p className="mt-2 text-[13px] text-gray-500">“{t.note}”</p>}
                {t.shiftsAffected > 0 && (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    Tiene {plural(t.shiftsAffected, 'turno asignado', 'turnos asignados')} en esas fechas. Si lo apruebas, tendrás que cubrirlo.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <RowAction tone="primary" disabled={busy === t.id} onClick={() => act(t.id, () => api.patch(`/staff/time-off/${t.id}/decision`, { status: 'approved' }))}>Aprobar</RowAction>
                  <RowAction disabled={busy === t.id} onClick={() => act(t.id, () => api.patch(`/staff/time-off/${t.id}/decision`, { status: 'rejected' }))}>Rechazar</RowAction>
                </div>
              </li>
            ))}
          </List>
        </Section>
      )}

      {waiting.length > 0 && (
        <Section title="Esperando respuesta">
          <List>
            {waiting.map((s) => (
              <ListRow key={s.id}
                title={s.type === 'open' ? `Turno libre${s.roleLabel ? ` · ${s.roleLabel}` : ''}` : s.type === 'exchange' ? `${s.from?.name} propone cambiar a ${s.to?.name}` : `${s.from?.name} busca quien cubra su turno`}
                subtitle={<span className="block first-letter:uppercase">{dayText(s.date)} · {s.start}–{s.end}{s.type === 'give' ? ` · ${s.to ? `se lo ha pedido a ${s.to.name}` : 'abierto a todos'}` : ''}</span>}
                trailing={
                  <button type="button" disabled={busy === s.id} onClick={async () => await confirmDialog('¿Cerrar esta solicitud?') && act(s.id, () => api.delete(`/staff/swaps/${s.id}`))}
                    className="text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cerrar</button>
                } />
            ))}
          </List>
        </Section>
      )}

      {upcomingOff.length > 0 && (
        <Section title="Próximas ausencias">
          <List>
            {upcomingOff.map((t) => (
              <ListRow key={t.id}
                leading={<PersonAvatar name={t.employeeName} />}
                title={t.employeeName}
                subtitle={`${timeOffLabel(t.type)} · ${timeOffWhen(t)}`}
                status={t.shiftsAffected > 0 ? <span className="text-[12px] text-amber-700">{plural(t.shiftsAffected, 'turno asignado', 'turnos asignados')} esos días</span> : undefined}
                trailing={<MoreMenu items={[{ label: 'Quitar ausencia', onClick: async () => await confirmDialog('¿Quitar esta ausencia?') && act(t.id, () => api.delete(`/staff/time-off/${t.id}`)) }]} />} />
            ))}
          </List>
        </Section>
      )}

      {(history.data || []).length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="text-[13px] font-semibold text-gray-500 hover:text-gray-800">
            {showHistory ? 'Ocultar historial' : 'Ver historial de cambios'}
          </button>
          {showHistory && (
            <List className="mt-2">
              {history.data.map((s) => (
                <ListRow key={s.id}
                  title={s.type === 'open' ? `Turno libre → ${s.acceptedBy?.name || '—'}` : `${s.from?.name} ${s.type === 'exchange' ? '⇄' : '→'} ${s.acceptedBy?.name || s.to?.name || 'nadie'}`}
                  subtitle={<span className="block first-letter:uppercase">
                    {dayText(s.date)} · {s.start}–{s.end} · <span className={s.status === 'approved' ? 'text-emerald-700' : 'text-gray-500'}>{{ approved: 'Aprobado', rejected: 'Rechazado', declined: 'Lo rechazó el compañero', cancelled: 'Cancelado' }[s.status]}</span>
                  </span>} />
              ))}
            </List>
          )}
        </div>
      )}

      {openShift && <OpenShiftModal shifts={shifts} positions={positions} onClose={() => setOpenShift(false)} onSaved={refresh} />}
      {modal && <TimeOffModal employees={employees} onClose={() => setModal(false)} onSaved={refresh} />}
    </div>
  );
}
