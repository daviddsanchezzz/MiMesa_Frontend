import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Icon from '../../ui/Icon';
import { Notice, SheetFooter, inputCls, labelCls } from './shared';

export function EmployeeFormModal({ employee, positions, onClose, onSaved }) {
  const [positionQuery, setPositionQuery] = useState('');
  const [positionOpen, setPositionOpen] = useState(false);
  const positionDropdownRef = useRef(null);
  const [form, setForm] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    positionIds: Array.isArray(employee?.positionIds)
      ? employee.positionIds.map(String)
      : employee?.positionId
        ? [String(employee.positionId)]
        : [],
    notes: employee?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedPositions = useMemo(
    () => positions.filter((position) => form.positionIds.includes(String(position._id))),
    [positions, form.positionIds],
  );
  const filteredPositions = useMemo(() => {
    const q = positionQuery.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((position) => (position.name || '').toLowerCase().includes(q));
  }, [positions, positionQuery]);
  useEffect(() => {
    if (!positionOpen) return undefined;
    const onClickOutside = (event) => {
      if (!positionDropdownRef.current) return;
      if (!positionDropdownRef.current.contains(event.target)) setPositionOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [positionOpen]);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (employee?._id) await api.put(`/staff/employees/${employee._id}`, form);
      else await api.post('/staff/employees', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el empleado');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={employee?._id ? 'Editar empleado' : 'Nuevo empleado'} onClose={onClose}
      footer={<SheetFooter onCancel={onClose} saving={saving} form="employee-form" />}>
      <form id="employee-form" onSubmit={submit} className="space-y-4">
        <Notice>{error}</Notice>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Nombre</label><input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required /></div>
          <div><label className={labelCls}>Apellidos</label><input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Teléfono</label><input className={inputCls} inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <div>
          <label className={labelCls}>Puestos</label>
          <div className="relative" ref={positionDropdownRef}>
            <button
              type="button"
              onClick={() => setPositionOpen((v) => !v)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <div className="flex flex-wrap gap-1.5 min-h-5">
                {selectedPositions.length > 0 ? selectedPositions.map((position) => (
                  <span key={position._id} className="inline-flex items-center px-2 py-px rounded-full text-xs font-medium" style={{ backgroundColor: `${position.color || '#64748B'}22`, color: position.color || '#64748B' }}>
                    {position.name}
                  </span>
                )) : <span className="text-gray-400">Elige uno o varios</span>}
              </div>
              <Icon name="down" className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${positionOpen ? 'rotate-180' : ''}`} />
            </button>

            {positionOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 border border-gray-200 rounded-xl bg-white shadow-lg p-2 space-y-1">
                <input
                  className="w-full rounded-full bg-gray-100 border border-transparent px-3.5 py-2 text-sm focus:outline-none focus:bg-white focus:border-gray-300"
                  placeholder="Buscar puesto…"
                  value={positionQuery}
                  onChange={(e) => setPositionQuery(e.target.value)}
                />
                <div className="max-h-52 overflow-auto">
                  {filteredPositions.map((position) => {
                    const id = String(position._id);
                    const checked = form.positionIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            positionIds: checked
                              ? prev.positionIds.filter((value) => value !== id)
                              : [...prev.positionIds, id],
                          }));
                        }}
                        className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                          <span className={checked ? 'font-semibold text-gray-900' : ''}>{position.name}</span>
                        </span>
                        {checked && <Icon name="check" className="w-4 h-4 text-violet-600" strokeWidth={2} />}
                      </button>
                    );
                  })}
                  {filteredPositions.length === 0 && <p className="text-xs text-gray-400 px-2.5 py-2">{positions.length ? 'No hay puestos con ese nombre' : 'Todavía no hay puestos. Créalos en Empleados › Puestos.'}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div><label className={labelCls}>Notas</label><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
      </form>
    </Modal>
  );
}
