import { useState } from 'react';
import api from '../../services/api';
import { useData } from '../../lib/query';
import Modal from '../../components/Modal';
import { Notice, SheetFooter, inputCls, labelCls } from './shared';

/** Give one of my shifts away: to a colleague I choose, or to anyone who can take it. */
export default function SwapRequestModal({ shift, dateText, onClose, onSaved }) {
  const q = useData(['staff', 'me', 'swaps', 'colleagues', shift.id], () => api.get(`/staff/me/swaps/colleagues?assignmentId=${shift.id}`).then((r) => r.data.items));
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/me/swaps', { assignmentId: shift.id, toEmployeeId: to || undefined, note });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const option = (value, title, sub, disabled = false) => (
    <label key={value || 'any'} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${to === value ? 'border-violet-600 bg-violet-50' : 'border-gray-200'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input type="radio" name="to" value={value} checked={to === value} disabled={disabled} onChange={() => setTo(value)} className="text-violet-600 focus:ring-violet-500" />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-gray-900">{title}</span>
        {sub && <span className="block text-[13px] text-gray-500">{sub}</span>}
      </span>
    </label>
  );

  return (
    <Modal title="Ceder turno" subtitle={`${dateText} · ${shift.start}–${shift.end}`} onClose={onClose} size="md"
      footer={<SheetFooter onCancel={onClose} saving={saving} form="swap-form" label="Enviar solicitud" />}>
      <form id="swap-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <p className="text-sm text-gray-600">Tu compañero tiene que aceptarlo y después lo aprueba tu encargado. Hasta entonces el turno sigue siendo tuyo.</p>
        <div className="space-y-2">
          {option('', 'Cualquiera que pueda', 'Se avisa a quien esté libre ese día')}
          {q.isLoading && <p className="text-sm text-gray-400">Cargando compañeros…</p>}
          {(q.data || []).map((p) => option(p.id, p.name, p.blockedReason || p.position, Boolean(p.blockedReason)))}
        </div>
        <div>
          <label className={labelCls}>Mensaje <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Tengo médico por la tarde" />
        </div>
      </form>
    </Modal>
  );
}
