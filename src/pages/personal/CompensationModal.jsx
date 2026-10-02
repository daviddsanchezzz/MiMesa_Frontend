import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Segmented } from '../../ui/kit';
import { Notice, SheetFooter, inputCls, labelCls, todayIso } from './shared';

const PAY_TYPES = [['hourly', 'Por hora'], ['per_shift', 'Por turno'], ['monthly_fixed', 'Mensual']];

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
  const unit = form.paymentType === 'hourly' ? 'la hora' : form.paymentType === 'per_shift' ? 'por turno' : 'al mes';
  return (
    <Modal title={`Cómo cobra ${employee.firstName}`} subtitle="Se usa para calcular los costes de personal." onClose={onClose}
      footer={<SheetFooter onCancel={onClose} saving={saving} form="compensation-form" />}>
      <form id="compensation-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <div>
          <label className={labelCls}>Tipo de pago</label>
          <Segmented value={form.paymentType} options={PAY_TYPES} onChange={(v) => setForm((f) => ({ ...f, paymentType: v }))} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Importe {unit}</label>
            <input className={`${inputCls} text-right tabular-nums`} type="number" min="0" step="0.01" value={form.baseAmount} onChange={(e) => setForm((f) => ({ ...f, baseAmount: e.target.value }))} required />
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <input className={inputCls} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Desde</label>
          <input className={inputCls} type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} required />
        </div>
        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}
