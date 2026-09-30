import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { inputCls, labelCls, todayIso } from './shared';

export function CompensationModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    paymentType: employee?.activeCompensation?.paymentType || 'hourly',
    baseAmount: employee?.activeCompensation?.baseAmount ?? 0,
    currency: employee?.activeCompensation?.currency || 'EUR',
    effectiveFrom: todayIso(),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/staff/employees/${employee._id}/compensations`, { ...form, baseAmount: Number(form.baseAmount || 0) });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la condición de pago');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={`Condiciones de pago - ${employee.firstName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <div>
          <label className={labelCls}>Tipo de pago</label>
          <select className={inputCls} value={form.paymentType} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}>
            <option value="hourly">Por hora</option>
            <option value="per_shift">Por turno</option>
            <option value="monthly_fixed">Precio mensual</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Importe base</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={form.baseAmount} onChange={(e) => setForm((f) => ({ ...f, baseAmount: e.target.value }))} required />
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <input className={inputCls} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Vigencia desde</label>
          <input className={inputCls} type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} required />
        </div>
        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
