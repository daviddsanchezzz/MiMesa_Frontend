import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Notice, SheetFooter, inputCls, labelCls, todayIso } from './shared';

/** The manager opens a shift nobody has yet (extra hand, someone fell ill): those who can take it are told. */
export default function OpenShiftModal({ shifts, positions, onClose, onSaved }) {
  const [form, setForm] = useState({ date: todayIso(), shiftId: shifts[0]?._id || '', roleLabel: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dow = new Date(`${form.date}T12:00:00`).getDay();
  const available = shifts.filter((s) => (s.days || []).includes(dow));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/swaps', form);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo publicar el turno');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Turno libre" subtitle="Se avisa a quien pueda cubrirlo; tú eliges a quién aceptar." onClose={onClose} size="md"
      footer={<SheetFooter onCancel={onClose} saving={saving} form="open-shift-form" label="Publicar turno" disabled={!form.shiftId} />}>
      <form id="open-shift-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Día</label>
            <input type="date" className={inputCls} value={form.date} min={todayIso()} required onChange={(e) => set({ date: e.target.value, shiftId: '' })} />
          </div>
          <div>
            <label className={labelCls}>Turno</label>
            <select className={inputCls} value={form.shiftId} required onChange={(e) => set({ shiftId: e.target.value })}>
              <option value="">Elige…</option>
              {available.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.startTime}–{s.endTime}</option>)}
            </select>
          </div>
        </div>
        {positions.length > 0 && (
          <div>
            <label className={labelCls}>Puesto <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select className={inputCls} value={form.roleLabel} onChange={(e) => set({ roleLabel: e.target.value })}>
              <option value="">Cualquiera</option>
              {positions.filter((p) => p.status === 'active').map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Nota <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={300} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Ej. Evento privado, hace falta refuerzo" />
        </div>
      </form>
    </Modal>
  );
}
