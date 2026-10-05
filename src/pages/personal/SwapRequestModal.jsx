import { useState } from 'react';
import api from '../../services/api';
import { useData } from '../../lib/query';
import Modal from '../../components/Modal';
import { Notice, SheetFooter, inputCls, labelCls } from './shared';

const dayText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

const Warnings = ({ list }) => (list?.length ? <span className="block text-[12px] text-amber-700">{list.join(' · ')}</span> : null);

/**
 * Change one of my shifts: give it away (to a colleague I choose, or to anyone who can take it)
 * or exchange it for one of a colleague's. My manager has the last word.
 */
export default function SwapRequestModal({ shift, dateText, onClose, onSaved }) {
  const [mode, setMode] = useState('give'); // give | exchange
  const [to, setTo] = useState('');
  const [counter, setCounter] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const colleagues = useData(['staff', 'me', 'swaps', 'colleagues', shift.id], () => api.get(`/staff/me/swaps/colleagues?assignmentId=${shift.id}`).then((r) => r.data.items));
  const theirs = useData(['staff', 'me', 'swaps', 'shifts-of', shift.id, to], () => api.get(`/staff/me/swaps/shifts-of?employeeId=${to}&assignmentId=${shift.id}`).then((r) => r.data.items),
    { enabled: mode === 'exchange' && Boolean(to) });

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'exchange' && (!to || !counter)) { setError('Elige con quién y qué turno quieres a cambio'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/me/swaps', { assignmentId: shift.id, toEmployeeId: to || undefined, counterAssignmentId: mode === 'exchange' ? counter : undefined, note });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const row = (checked, onChange, title, sub, warnings, disabled = false) => (
    <label className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${checked ? 'border-violet-600 bg-violet-50' : 'border-gray-200'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input type="radio" checked={checked} disabled={disabled} onChange={onChange} className="text-violet-600 focus:ring-violet-500" />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-gray-900">{title}</span>
        {sub && <span className="block text-[13px] text-gray-500">{sub}</span>}
        <Warnings list={warnings} />
      </span>
    </label>
  );

  return (
    <Modal title="Cambiar turno" subtitle={`${dateText} · ${shift.start}–${shift.end}`} onClose={onClose} size="md"
      footer={<SheetFooter onCancel={onClose} saving={saving} form="swap-form" label="Enviar solicitud" />}>
      <form id="swap-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-full bg-gray-100">
          {[['give', 'Ceder mi turno'], ['exchange', 'Intercambiar']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setCounter(''); if (k === 'give') setTo(''); }}
              className={`rounded-full py-1.5 text-[13px] font-semibold ${mode === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {mode === 'give' ? 'Tu compañero tiene que aceptarlo y después lo aprueba tu encargado.' : 'Tú haces su turno y él hace el tuyo. Él lo acepta y después lo aprueba tu encargado.'} Hasta entonces tu turno no cambia.
        </p>

        <div className="space-y-2">
          {mode === 'give' && row(to === '', () => setTo(''), 'Cualquiera que pueda', 'Se avisa a quien esté libre ese día', null)}
          {colleagues.isLoading && <p className="text-sm text-gray-400">Cargando compañeros…</p>}
          {(colleagues.data || []).map((p) => row(to === p.id, () => { setTo(p.id); setCounter(''); }, p.name, p.blockedReason || p.position, p.blockedReason ? null : p.warnings, Boolean(p.blockedReason)))}
        </div>

        {mode === 'exchange' && to && (
          <div>
            <label className={labelCls}>¿Qué turno de {(colleagues.data || []).find((p) => p.id === to)?.name?.split(' ')[0]} quieres a cambio?</label>
            <div className="space-y-2">
              {theirs.isLoading && <p className="text-sm text-gray-400">Cargando turnos…</p>}
              {theirs.data?.length === 0 && <p className="text-sm text-gray-500">No tiene turnos publicados próximos.</p>}
              {(theirs.data || []).map((t) => row(counter === t.assignmentId, () => setCounter(t.assignmentId), `${dayText(t.date)} · ${t.start}–${t.end}`, [t.shiftName, t.roleLabel].filter(Boolean).join(' · ') || t.blockedReason, t.blockedReason ? [t.blockedReason] : t.warnings, Boolean(t.blockedReason)))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Mensaje <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Tengo médico por la tarde" />
        </div>
      </form>
    </Modal>
  );
}
