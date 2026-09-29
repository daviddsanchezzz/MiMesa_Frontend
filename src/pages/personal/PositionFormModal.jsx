import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { inputCls, labelCls } from './shared';

export function PositionFormModal({ position, onClose, onSaved }) {
  const [form, setForm] = useState({ name: position?.name || '', color: position?.color || '#64748B' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (position?._id) await api.put(`/staff/positions/${position._id}`, form);
      else await api.post('/staff/positions', form);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el puesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={position?._id ? 'Editar puesto' : 'Nuevo puesto'} onClose={onClose} size="md">
      <div className="space-y-4">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Nombre del puesto *</label>
            <input
              className={inputCls}
              placeholder="Ej: Camarero, Cocinero..."
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <label className={labelCls}>Color identificativo</label>
            <div className="flex items-center gap-3">
              <input
                className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-1"
                type="color"
                value={form.color}
                onChange={(e) => setForm((v) => ({ ...v, color: e.target.value.toUpperCase() }))}
              />
              <span className="text-sm text-gray-600 font-mono">{form.color}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border border-gray-200 bg-white">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: form.color }} />
                Vista previa
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
              {position?._id ? 'Guardar cambios' : 'Crear puesto'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
