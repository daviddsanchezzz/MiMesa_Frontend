import { useState } from 'react';
import api from '../../services/api';
import { RowAction, Section } from '../../ui/kit';
import { List, ListRow } from '../../ui/list';
import { Notice } from './shared';
import { STATUS_TEXT, timeOffLabel, timeOffWhen } from './timeOff';
import { confirmDialog } from '../../ui/confirm';

const dayText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const SWAP_STATUS = { pending_peer: 'Esperando a tu compañero', pending_manager: 'Falta que lo apruebe tu encargado', approved: 'Aprobado', rejected: 'No aprobado', declined: 'Tu compañero no puede', cancelled: 'Cancelado' };

/** What is going on with my requests: colleagues asking me, mine waiting, and my days off. */
/** part: 'top' = what needs my answer; 'bottom' = the state of my own requests. */
export default function MyRequests({ part = 'top', incoming = [], mine = [], timeOff = [], onChanged }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const act = async (key, fn) => {
    setBusy(key);
    setError('');
    try { await fn(); await onChanged?.(); } catch (err) { setError(err?.response?.data?.message || 'No se pudo completar'); } finally { setBusy(null); }
  };
  const openMine = mine.filter((s) => ['pending_peer', 'pending_manager'].includes(s.status));
  const decided = mine.filter((s) => ['approved', 'rejected', 'declined'].includes(s.status)).slice(0, 3);
  const top = part === 'top';
  if (top ? !incoming.length : (!openMine.length && !decided.length && !timeOff.length)) return null;

  return (
    <div className="space-y-5">
      <Notice>{error}</Notice>

      {top && incoming.length > 0 && (
        <Section title={`Te piden cubrir un turno · ${incoming.length}`}>
          <List>
            {incoming.map((s) => (
              <li key={s.id} className="py-3.5">
                <p className="text-[15px] font-semibold text-gray-900">
                  {s.type === 'open' ? `Hace falta alguien${s.roleLabel ? ` en ${s.roleLabel}` : ''}` : s.type === 'exchange' ? `${s.from.name} te propone cambiar` : `${s.from.name} no puede venir`}
                </p>
                {s.type === 'exchange' ? (
                  <>
                    <p className="text-[13px] text-gray-700">Tú harías: <span className="first-letter:uppercase">{dayText(s.date)}</span> · {s.start}–{s.end}</p>
                    <p className="text-[13px] text-gray-700">Él haría: <span className="first-letter:uppercase">{dayText(s.counter.date)}</span> · {s.counter.start}–{s.counter.end}</p>
                  </>
                ) : (
                  <p className="text-[13px] text-gray-700 first-letter:uppercase">{dayText(s.date)} · {s.start}–{s.end}{s.shiftName ? ` · ${s.shiftName}` : ''}</p>
                )}
                {s.note && <p className="text-[13px] text-gray-500">“{s.note}”</p>}
                {s.blockedReason && <p className="mt-1 text-[13px] text-amber-800">{s.blockedReason}</p>}
                {!s.blockedReason && s.warnings?.length > 0 && <p className="mt-1 text-[13px] text-amber-800">{s.warnings.join(' · ')}</p>}
                <div className="mt-3 flex gap-2">
                  <RowAction tone="primary" disabled={busy === s.id || Boolean(s.blockedReason)} onClick={() => act(s.id, () => api.post(`/staff/me/swaps/${s.id}/accept`))}>
                    {s.type === 'exchange' ? 'Aceptar cambio' : 'Cubrirlo yo'}
                  </RowAction>
                  {s.to && <RowAction disabled={busy === s.id} onClick={() => act(s.id, () => api.post(`/staff/me/swaps/${s.id}/decline`))}>No puedo</RowAction>}
                </div>
              </li>
            ))}
          </List>
        </Section>
      )}

      {!top && (openMine.length > 0 || decided.length > 0) && (
        <Section title="Tus cambios de turno">
          <List>
            {[...openMine, ...decided].map((s) => (
              <ListRow key={s.id}
                title={<span className="block first-letter:uppercase">{dayText(s.date)} · {s.start}–{s.end}{s.counter ? ` ⇄ ${dayText(s.counter.date).split(',')[0]} ${s.counter.start}` : ''}</span>}
                subtitle={`${s.to ? `Para ${s.to.name}` : 'Para cualquiera'}${s.acceptedBy && !s.to ? ` · acepta ${s.acceptedBy.name}` : ''} · ${SWAP_STATUS[s.status]}`}
                trailing={['pending_peer', 'pending_manager'].includes(s.status) ? (
                  <button type="button" disabled={busy === s.id} onClick={() => act(s.id, () => api.delete(`/staff/me/swaps/${s.id}`))}
                    className="text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cancelar</button>
                ) : undefined} />
            ))}
          </List>
        </Section>
      )}

      {!top && timeOff.length > 0 && (
        <Section title="Tus ausencias">
          <List>
            {timeOff.map((t) => (
              <ListRow key={t.id}
                title={`${timeOffLabel(t.type)} · ${timeOffWhen(t)}`}
                subtitle={<span className={t.status === 'approved' ? 'text-emerald-700' : t.status === 'rejected' ? 'text-rose-700' : 'text-amber-700'}>
                  {STATUS_TEXT[t.status]}{t.decisionNote ? ` · “${t.decisionNote}”` : ''}
                </span>}
                trailing={t.status !== 'rejected' ? (
                  <button type="button" disabled={busy === t.id} onClick={async () => await confirmDialog('¿Cancelar esta ausencia?') && act(t.id, () => api.delete(`/staff/me/time-off/${t.id}`))}
                    className="text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cancelar</button>
                ) : undefined} />
            ))}
          </List>
        </Section>
      )}
    </div>
  );
}
