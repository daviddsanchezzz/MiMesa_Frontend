import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Notice, SheetFooter, inputCls, labelCls } from './shared';

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
    <Modal title={position?._id ? 'Editar puesto' : 'Nuevo puesto'} onClose={onClose} size="md"
      footer={<SheetFooter onCancel={onClose} saving={saving} form="position-form" label={position?._id ? 'Guardar cambios' : 'Crear puesto'} />}>
      <form id="position-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <div>
          <label className={labelCls}>Nombre del puesto</label>
          <input
            className={inputCls}
            placeholder="Camarero, cocinero…"
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex items-center gap-3">
            <input
              className="h-10 w-14 rounded-xl border border-gray-300 cursor-pointer p-1 bg-white"
              type="color"
              value={form.color}
              onChange={(e) => setForm((v) => ({ ...v, color: e.target.value.toUpperCase() }))}
            />
            <span className="text-sm text-gray-500 font-mono">{form.color}</span>
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${form.color}22`, color: form.color }}>
              {form.name || 'Vista previa'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Así se verá en la planificación semanal.</p>
        </div>
      </form>
    </Modal>
  );
}
