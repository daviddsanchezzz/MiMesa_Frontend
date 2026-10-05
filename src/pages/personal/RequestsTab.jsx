import { useState } from 'react';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { Empty, MenuButton, RowAction, Section } from '../../ui/kit';
import { MoreIcon } from './MobileEmployeeRow';
import { Notice, initialsOf } from './shared';
import TimeOffModal from './TimeOffModal';
import { plural, timeOffLabel, timeOffWhen } from './timeOff';

const card = 'rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100';
const dayText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

const Avatar = ({ name }) => (
  <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">{initialsOf(name)}</span>
);

/** Manager's inbox: days off to answer, shift swaps to approve, and what is coming up. */
export default function RequestsTab({ employees, onChanged }) {
  const off = useData(['staff', 'time-off', 'manager'], () => api.get('/staff/time-off?status=all').then((r) => r.data.items));
  const swaps = useData(['staff', 'swaps', 'manager'], () => api.get('/staff/swaps').then((r) => r.data.items));
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const refresh = async () => { await Promise.all([off.refetch(), swaps.refetch()]); onChanged?.(); };
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
      <div className="flex justify-end">
        <button type="button" onClick={() => setModal(true)}
          className="h-9 px-4 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">+ Añadir ausencia</button>
      </div>

      {loading && <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />}
      {!loading && nothing && <Empty>No hay solicitudes ni ausencias próximas. Cuando tu equipo pida un día libre o un cambio de turno, aparecerá aquí.</Empty>}

      {toApprove.length > 0 && (
        <Section title={`Cambios de turno por aprobar · ${toApprove.length}`}>
          <ul className={card}>
            {toApprove.map((s) => (
              <li key={s.id} className="px-4 py-3.5">
                <p className="text-[15px] font-medium text-gray-900">{s.from.name} <span className="text-gray-400">→</span> {s.acceptedBy?.name}</p>
                <p className="text-[13px] text-gray-600">{dayText(s.date)} · {s.start}–{s.end}{s.shiftName ? ` · ${s.shiftName}` : ''}</p>
                {s.note && <p className="mt-0.5 text-[13px] text-gray-500">“{s.note}”</p>}
                <div className="mt-3 flex gap-2">
                  <RowAction tone="primary" disabled={busy === s.id} onClick={() => act(s.id, () => api.patch(`/staff/swaps/${s.id}/decision`, { status: 'approved' }))}>Aprobar</RowAction>
                  <RowAction disabled={busy === s.id} onClick={() => act(s.id, () => api.patch(`/staff/swaps/${s.id}/decision`, { status: 'rejected' }))}>Rechazar</RowAction>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pendingOff.length > 0 && (
        <Section title={`Ausencias por responder · ${pendingOff.length}`}>
          <ul className={card}>
            {pendingOff.map((t) => (
              <li key={t.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={t.employeeName} />
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
          </ul>
        </Section>
      )}

      {waiting.length > 0 && (
        <Section title="Esperando a un compañero">
          <ul className={card}>
            {waiting.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <p className="text-[15px] text-gray-900">{s.from.name} busca quien cubra su turno</p>
                <p className="text-[13px] text-gray-500">{dayText(s.date)} · {s.start}–{s.end} · {s.to ? `se lo ha pedido a ${s.to.name}` : 'abierto a todos'}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {upcomingOff.length > 0 && (
        <Section title="Próximas ausencias">
          <ul className={card}>
            {upcomingOff.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={t.employeeName} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{t.employeeName}</p>
                  <p className="text-[13px] text-gray-600">{timeOffLabel(t.type)} · {timeOffWhen(t)}</p>
                  {t.shiftsAffected > 0 && <p className="text-[12px] text-amber-700">{plural(t.shiftsAffected, 'turno asignado', 'turnos asignados')} esos días</p>}
                </div>
                <MenuButton ariaLabel="Más opciones" className="w-9 h-9 justify-center text-gray-500"
                  items={[{ label: 'Quitar ausencia', onClick: () => window.confirm('¿Quitar esta ausencia?') && act(t.id, () => api.delete(`/staff/time-off/${t.id}`)) }]}>
                  <MoreIcon />
                </MenuButton>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {modal && <TimeOffModal employees={employees} onClose={() => setModal(false)} onSaved={refresh} />}
    </div>
  );
}
