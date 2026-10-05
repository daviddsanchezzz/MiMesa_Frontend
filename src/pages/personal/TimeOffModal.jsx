import { useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Notice, SheetFooter, inputCls, labelCls, todayIso } from './shared';
import { TIME_OFF_TYPES } from './timeOff';

/**
 * Ask for (employee) or register (manager, when `employees` is given) a day off,
 * holidays or "I cannot work then". Several days, or a few hours of a single day.
 */
export default function TimeOffModal({ employees = null, onClose, onSaved }) {
  const manager = Array.isArray(employees);
  const [form, setForm] = useState({ employeeId: '', type: 'day_off', from: todayIso(), to: todayIso(), partial: false, fromTime: '', toTime: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const oneDay = form.from === form.to;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        type: form.type, from: form.from, to: form.to, note: form.note,
        ...(form.partial && oneDay ? { fromTime: form.fromTime, toTime: form.toTime } : {}),
      };
      if (manager) await api.post('/staff/time-off', { ...body, employeeId: form.employeeId });
      else await api.post('/staff/me/time-off', body);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={manager ? 'Añadir ausencia' : 'Pedir libre'} onClose={onClose} size="md"
      subtitle={manager ? 'Quedará aprobada y el planificador avisará al asignarle turnos.' : 'Tu encargado la verá y te dirá si puede ser.'}
      footer={<SheetFooter onCancel={onClose} saving={saving} form="timeoff-form" label={manager ? 'Guardar' : 'Enviar solicitud'} disabled={manager && !form.employeeId} />}>
      <form id="timeoff-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        {manager && (
          <div>
            <label className={labelCls}>Empleado</label>
            <select className={inputCls} value={form.employeeId} onChange={(e) => set({ employeeId: e.target.value })} required>
              <option value="">Elige a quién…</option>
              {employees.filter((x) => x.status === 'active').map((x) => <option key={x._id} value={x._id}>{`${x.firstName} ${x.lastName || ''}`.trim()}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_OFF_TYPES.map(([key, label]) => (
            <button key={key} type="button" onClick={() => set({ type: key })}
              className={`rounded-xl border px-2 py-2.5 text-[13px] font-semibold leading-tight ${form.type === key ? 'border-violet-600 bg-violet-50 text-violet-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Desde</label>
            <input type="date" className={inputCls} value={form.from} min={manager ? undefined : todayIso()} required
              onChange={(e) => set({ from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" className={inputCls} value={form.to} min={form.from} required onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>
        {oneDay && (
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.partial} onChange={(e) => set({ partial: e.target.checked })} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              Solo unas horas de ese día
            </label>
            {form.partial && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div><label className={labelCls}>De</label><input type="time" className={inputCls} value={form.fromTime} onChange={(e) => set({ fromTime: e.target.value })} /></div>
                <div><label className={labelCls}>A</label><input type="time" className={inputCls} value={form.toTime} onChange={(e) => set({ toTime: e.target.value })} /></div>
                <p className="col-span-2 text-xs text-gray-400 -mt-1">Déjalo vacío para “desde el principio” o “hasta el final del día”.</p>
              </div>
            )}
          </div>
        )}
        <div>
          <label className={labelCls}>Nota <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={300} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Ej. Boda de mi hermana" />
        </div>
      </form>
    </Modal>
  );
}
