import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { inputCls } from '../carta/labels';

/** From how much of a rise the app warns you. */
export default function AlertSettingsModal({ value, onClose, onSaved }) {
  const [pct, setPct] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setSaving(true); setError('');
    try { await api.put('/ingredients/settings', { alertPct: Number(pct) }); onSaved(); } catch (err) { setError(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setSaving(false); }
  }
  return (
    <Modal size="md" title="Avisos de subida" subtitle="Te avisamos cuando un ingrediente sube de precio" onClose={onClose}
      footer={<div className="space-y-2">{error && <p className="text-sm text-rose-600">{error}</p>}<button type="button" onClick={save} disabled={saving} className="h-12 w-full rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-50">Guardar</button></div>}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-800">Avisarme si sube un</span>
        <span className="flex items-center gap-2">
          <input className={`${inputCls} !w-24 text-right tabular-nums`} inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d]/g, ''))} />
          <span className="text-sm text-gray-600">% o más respecto a la compra anterior</span>
        </span>
      </label>
      <p className="mt-3 text-xs text-gray-500">Un 5 % avisa de casi todo; un 10 % solo de las subidas importantes.</p>
    </Modal>
  );
}
