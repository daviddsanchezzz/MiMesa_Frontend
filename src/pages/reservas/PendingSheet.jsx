import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { dayLabel } from '../../lib/dates';

const REASON = { large_group: 'Grupo grande', slot_capacity: 'Franja llena', manual: 'Aprobación manual' };

function Proposal({ r, onSend, onBack }) {
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState('');
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get('/shifts/slots', { params: { date: r.date } })
      .then((res) => {
        const all = res.data || [];
        const shift = all.find((s) => s.time === r.time)?.shiftName;
        setSlots((shift ? all.filter((s) => s.shiftName === shift) : all).filter((s) => s.time !== r.time));
      })
      .catch(() => setSlots([]));
  }, [r.date, r.time]);
  const chosen = time === '__other__' ? custom : time;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Propón otra hora a <b>{r.guestName}</b> para {dayLabel(r.date).toLowerCase()}. Le llegará un email para aceptarla.</p>
      <div className="flex flex-wrap gap-1.5">
        {slots === null && <p className="text-xs text-gray-400">Buscando horas…</p>}
        {(slots || []).map((s) => (
          <button key={s.time} type="button" onClick={() => setTime(s.time)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums border ${time === s.time ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{s.time}</button>
        ))}
        <button type="button" onClick={() => setTime('__other__')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${time === '__other__' ? 'bg-gray-900 border-gray-900 text-white' : 'border-dashed border-gray-300 text-gray-600'}`}>Otra</button>
      </div>
      {time === '__other__' && <input type="time" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-40 border border-gray-300 rounded-xl px-3 py-2" />}
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Mensaje opcional (p. ej. «A las 21:30 tenemos mesa en terraza»)"
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Volver</button>
        <button type="button" disabled={!chosen || saving}
          onClick={async () => { setSaving(true); const ok = await onSend({ date: r.date, time: chosen, ...(message.trim() ? { message: message.trim() } : {}) }); setSaving(false); if (ok) onBack(); }}
          className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">Enviar propuesta</button>
      </div>
    </div>
  );
}

/**
 * Online requests waiting for an answer, one line each: accept with one tap,
 * or propose another time, or reject. Opened from «Por hacer» in Hoy and from
 * the strip in Reservas, instead of a big block that pushes today down.
 */
export default function PendingSheet({ pending, actions, today, onClose }) {
  const [proposing, setProposing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const sorted = [...pending].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const act = async (r, fn) => { setBusyId(r._id); await fn(r); setBusyId(null); };

  return (
    <Modal title={proposing ? 'Proponer otra hora' : 'Por confirmar'} subtitle={proposing ? null : `${pending.length} ${pending.length === 1 ? 'solicitud' : 'solicitudes'} de reserva online`}
      onClose={onClose} size="md">
      {proposing ? (
        <Proposal r={proposing} onSend={(payload) => actions.propose(proposing, payload)} onBack={() => setProposing(null)} />
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nada pendiente. Todo contestado.</p>
      ) : (
        <ul className="divide-y divide-gray-100 -my-2">
          {sorted.map((r) => (
            <li key={r._id} className="py-3">
              <div className="flex items-start gap-3">
                <div className="w-14 shrink-0">
                  <p className="text-[15px] font-semibold tabular-nums text-gray-900 leading-5">{r.time}</p>
                  <p className="text-[11px] text-gray-500 leading-4">{dayLabel(r.date, today)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{r.guestName}</p>
                  <p className="text-[13px] text-gray-500">
                    {r.people} {r.people === 1 ? 'persona' : 'personas'}{REASON[r.pendingReason] ? ` · ${REASON[r.pendingReason]}` : ''}
                  </p>
                  {r.proposedAlternative?.time && (
                    <p className="text-xs text-violet-700 mt-0.5">Propuesta enviada: {dayLabel(r.proposedAlternative.date, today).toLowerCase()} a las {r.proposedAlternative.time}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-[68px]">
                <button type="button" disabled={busyId === r._id} onClick={() => act(r, actions.accept)}
                  className="h-9 px-4 rounded-full bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 disabled:opacity-50">Aceptar</button>
                <button type="button" onClick={() => setProposing(r)}
                  className="h-9 px-3.5 rounded-full bg-gray-100 text-gray-900 text-[13px] font-semibold hover:bg-gray-200">Otra hora</button>
                <button type="button" disabled={busyId === r._id} onClick={() => act(r, actions.reject)}
                  className="h-9 px-2 text-[13px] font-semibold text-rose-600 hover:text-rose-700 ml-auto">Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
