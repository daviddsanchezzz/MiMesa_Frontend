import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { inputCls, labelCls } from './shared';

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
    <Modal title={employee?._id ? 'Editar empleado' : 'Nuevo empleado'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required /></div>
          <div><label className={labelCls}>Apellidos</label><input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Telefono</label><input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Puestos</label>
          <div className="relative" ref={positionDropdownRef}>
            <button
              type="button"
              onClick={() => setPositionOpen((v) => !v)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-left flex items-center justify-between gap-2"
            >
              <div className="flex flex-wrap gap-1.5 min-h-6">
                {selectedPositions.length > 0 ? selectedPositions.map((position) => (
                  <span key={position._id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                    {position.name}
                  </span>
                )) : <span className="text-gray-400">Selecciona uno o varios puestos...</span>}
              </div>
              <span className="text-gray-400 text-xs">{positionOpen ? '▲' : '▼'}</span>
            </button>

            {positionOpen && (
              <div className="absolute z-20 left-0 right-0 mt-2 border border-gray-200 rounded-xl bg-white shadow-lg p-2 space-y-2">
                <input
                  className={inputCls}
                  placeholder="Buscar puesto..."
                  value={positionQuery}
                  onChange={(e) => setPositionQuery(e.target.value)}
                />
                <div className="max-h-44 overflow-auto space-y-1">
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
                        className={`w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${
                          checked ? 'bg-violet-50 text-violet-700' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                          {position.name}
                        </span>
                        <span className={`text-xs font-semibold ${checked ? 'text-violet-600' : 'text-gray-300'}`}>
                          {checked ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                  {filteredPositions.length === 0 && <p className="text-xs text-gray-400 px-1 py-2">No hay puestos para ese filtro</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div><label className={labelCls}>Notas</label><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
