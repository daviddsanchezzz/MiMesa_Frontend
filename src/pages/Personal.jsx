import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const tabs = [
  { key: 'employees', label: 'Empleados' },
  { key: 'planner', label: 'Planificacion semanal' },
  { key: 'costs', label: 'Costes estimados' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const mondayOf = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const toDayOfWeek = (isoDate) => new Date(`${isoDate}T12:00:00`).getDay();
const weekDays = (weekStart) => [...Array(7)].map((_, i) => {
  const date = addDays(weekStart, i);
  const ui = new Date(`${date}T12:00:00`);
  return {
    date,
    short: ui.toLocaleDateString('es-ES', { weekday: 'short' }),
    day: ui.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    fullLabel: ui.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }),
  };
});
const compareShiftTime = (a, b) => (a.startTime || '').localeCompare(b.startTime || '');
const shiftAppliesToDate = (shift, date) => {
  const day = toDayOfWeek(date);
  if (!Array.isArray(shift.days) || !shift.days.includes(day)) return false;
  if (shift.startDate && date < shift.startDate) return false;
  if (shift.endDate && date > shift.endDate) return false;
  return true;
};

const compLabel = (comp) => {
  if (!comp) return null;
  const suffix = comp.paymentType === 'hourly' ? '/h' : comp.paymentType === 'per_shift' ? '/asignación' : '/mes';
  return `${comp.baseAmount} ${comp.currency}${suffix}`;
};

const compTypeLabel = (type) => {
  if (type === 'hourly') return 'Por hora';
  if (type === 'per_shift') return 'Por asignación';
  if (type === 'monthly_fixed') return 'Precio mensual';
  return type || '-';
};

function Avatar({ name, size = 'md' }) {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const sz = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full ${colors[idx]} flex items-center justify-center text-white font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function MobileEmployeeRow({ employee, onEdit, onPago, onToggle }) {
  const [open, setOpen] = useState(false);
  const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();
  const comp = employee.activeCompensation;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={employee.firstName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {employee.email || employee.phone || 'Sin contacto'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(employee.positions || []).slice(0, 3).map((pos) => (
            <span key={pos._id} className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: pos.color || '#64748B' }} title={pos.name} />
          ))}
          <span className={`text-[11px] border px-2 py-0.5 rounded-full font-semibold ${
            employee.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {employee.status === 'active' ? 'Activo' : 'Inact.'}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 bg-gray-50/80 border-t border-gray-100 space-y-2">
          {(employee.positions || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(employee.positions || []).map((pos) => (
                <span key={pos._id} className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 border border-gray-200 bg-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pos.color || '#64748B' }} />
                  {pos.name}
                </span>
              ))}
            </div>
          )}
          {comp ? (
            <p className="text-xs text-gray-600 font-medium">{compLabel(comp)} · {compTypeLabel(comp.paymentType)}</p>
          ) : (
            <p className="text-xs text-amber-600">Sin condiciones de pago</p>
          )}
          {employee.notes && (
            <p className="text-xs text-gray-500 italic bg-white border border-gray-200 rounded-lg px-2.5 py-2">
              "{employee.notes}"
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onPago} className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-violet-50 text-violet-700 active:bg-violet-100 transition-colors">
              Pago
            </button>
            <button onClick={onEdit} className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors">
              Editar
            </button>
            <button onClick={onToggle} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              employee.status === 'active' ? 'bg-rose-50 text-rose-600 active:bg-rose-100' : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100'
            }`}>
              {employee.status === 'active' ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeFormModal({ employee, positions, onClose, onSaved }) {
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
              <span className="text-gray-400 text-xs">{positionOpen ? 'â–²' : 'â–¼'}</span>
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

function CompensationModal({ employee, onClose, onSaved }) {
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
      setError(err?.response?.data?.message || 'No se pudo guardar la condicion de pago');
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
            <option value="per_shift">Por asignación</option>
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

function ShiftEditorModal({ day, shift, assignments, activeEmployees, positions, onClose, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedByColumn, setSelectedByColumn] = useState({});

  const assignedIds = new Set(assignments.map((a) => String(a.employeeId?._id || a.employeeId)));
  const availableEmployees = useMemo(
    () => activeEmployees.filter((employee) => !assignedIds.has(String(employee._id))),
    [activeEmployees, assignments],
  );

  const columns = useMemo(() => {
    const activePositions = (positions || []).filter((position) => position.status === 'active');
    const baseColumns = activePositions.map((position) => ({
      key: String(position._id),
      label: position.name,
      color: position.color || '#64748B',
      assigned: [],
      available: [],
    }));

    const byKey = new Map(baseColumns.map((column) => [column.key, column]));
    const byName = new Map(baseColumns.map((column) => [column.label, column]));

    assignments.forEach((assignment) => {
      const employee = assignment.employeeId;
      const key = employee?.positionId ? String(employee.positionId) : null;
      const column = (assignment.roleLabel && byName.get(assignment.roleLabel)) || (key ? byKey.get(key) : null);
      if (!column) return;
      column.assigned.push(assignment);
    });

    availableEmployees.forEach((employee) => {
      const ids = Array.isArray(employee?.positionIds) && employee.positionIds.length
        ? employee.positionIds.map(String)
        : employee?.positionId
          ? [String(employee.positionId)]
          : [];
      ids.forEach((id) => {
        const column = byKey.get(id);
        if (column) column.available.push(employee);
      });
    });

    return baseColumns;
  }, [positions, assignments, availableEmployees]);

  const addEmployee = async (employeeId, columnKey) => {
    if (!employeeId) return;
    setSaving(true);
    setError('');
    try {
      const column = columns.find((item) => String(item.key) === String(columnKey));
      await api.post('/staff/assignments', {
        employeeId,
        date: day.date,
        shiftId: shift._id,
        roleLabel: column?.label || '',
      });
      await onRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo asignar el empleado');
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (assignmentId) => {
    setSaving(true);
    setError('');
    try {
      await api.delete(`/staff/assignments/${assignmentId}`);
      await onRefresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo quitar el empleado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Detalle del turno - ${shift.name}`} subtitle={`${day.fullLabel} · ${shift.startTime}-${shift.endTime}`} onClose={onClose} size="xl">
      <div className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[260px] gap-3">
            {columns.map((column) => (
              <section key={column.key} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <p className="text-sm font-semibold text-gray-900">{column.label}</p>
                  <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">{column.assigned.length}</span>
                </div>

                <div className="space-y-1.5 min-h-[180px]">
                  {column.assigned.length === 0 && <p className="text-xs text-gray-400 italic">Sin asignados</p>}
                  {column.assigned.map((assignment) => {
                    const employee = assignment.employeeId;
                    const employeeName = employee?.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Empleado';
                    return (
                      <div key={assignment._id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-2 py-1.5 bg-gray-50/60">
                        <span className="text-xs text-gray-800 truncate font-medium">{employeeName}</span>
                        <button
                          onClick={() => removeEmployee(assignment._id)}
                          disabled={saving}
                          className="text-[11px] text-rose-600 hover:underline disabled:opacity-60 shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={selectedByColumn[column.key] || ''}
                    onChange={(e) => setSelectedByColumn((prev) => ({ ...prev, [column.key]: e.target.value }))}
                    disabled={saving}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {column.available.map((employee) => {
                      const employeeName = `${employee.firstName} ${employee.lastName || ''}`.trim();
                      return (
                        <option key={employee._id} value={employee._id}>
                          {employeeName}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={async () => {
                      const selectedId = selectedByColumn[column.key];
                      if (!selectedId) return;
                      await addEmployee(selectedId, column.key);
                      setSelectedByColumn((prev) => ({ ...prev, [column.key]: '' }));
                    }}
                    disabled={saving || !selectedByColumn[column.key]}
                    className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    Añadir
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PositionFormModal({ position, onClose, onSaved }) {
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

export default function Personal() {
  const [tab, setTab] = useState('employees');
  const [weekStart, setWeekStart] = useState(mondayOf(todayIso()));
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [costs, setCosts] = useState({ employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeModal, setEmployeeModal] = useState(null);
  const [positionModal, setPositionModal] = useState(null);
  const [employeeSubTab, setEmployeeSubTab] = useState('employees');
  const [compModalEmployee, setCompModalEmployee] = useState(null);
  const [slotEditor, setSlotEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [costsSubTab, setCostsSubTab] = useState('monthly');
  const [costMonth, setCostMonth] = useState(() => todayIso().slice(0, 7));
  const [monthlyCosts, setMonthlyCosts] = useState({ employeeCosts: [], totalsByCurrency: {} });
  const [balances, setBalances] = useState([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(null); // employeeId

  const loadCore = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [empRes, shiftRes, posRes] = await Promise.all([
        api.get('/staff/employees?includeInactive=true'),
        api.get('/shifts'),
        api.get('/staff/positions?includeInactive=true'),
      ]);
      setEmployees(empRes.data || []);
      setShifts((shiftRes.data || []).slice().sort(compareShiftTime));
      setPositions(posRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los empleados');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadWeekData = async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        api.get(`/staff/assignments?weekStart=${weekStart}`),
        api.get(`/staff/costs?weekStart=${weekStart}`),
      ]);
      setAssignments(aRes.data?.assignments || []);
      setCosts(cRes.data || { employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar asignaciones o costes');
    }
  };

  const loadAssignments = async () => {
    try {
      const aRes = await api.get(`/staff/assignments?weekStart=${weekStart}`);
      setAssignments(aRes.data?.assignments || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar asignaciones');
    }
  };

  const loadMonthlyCosts = async (month = costMonth) => {
    setCostsLoading(true);
    try {
      const res = await api.get(`/staff/costs/monthly?month=${month}`);
      setMonthlyCosts(res.data || { employeeCosts: [], totalsByCurrency: {} });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los costes mensuales');
    } finally {
      setCostsLoading(false);
    }
  };

  const loadBalances = async () => {
    setCostsLoading(true);
    try {
      const res = await api.get('/staff/balances');
      setBalances(res.data?.balances || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los balances');
    } finally {
      setCostsLoading(false);
    }
  };

  const registerPayment = async (employeeId, amount, currency) => {
    try {
      await api.post('/staff/payments', { employeeId, amount, currency });
      setConfirmingPayment(null);
      await loadBalances();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo registrar el pago');
    }
  };

  useEffect(() => { loadCore(); }, []);
  useEffect(() => { loadWeekData(); }, [weekStart]);
  useEffect(() => {
    if (tab === 'costs') {
      if (costsSubTab === 'monthly') loadMonthlyCosts(costMonth);
      else loadBalances();
    }
  }, [tab, costsSubTab]);
  useEffect(() => {
    if (tab === 'costs' && costsSubTab === 'monthly') loadMonthlyCosts(costMonth);
  }, [costMonth]);
  useEffect(() => { setMobileDayIndex(0); }, [weekStart]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = todayIso();
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);

  const employeeStats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
    noPay: employees.filter((e) => !e.activeCompensation).length,
  }), [employees]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.includes(q),
      );
    }
    if (statusFilter === 'active') list = list.filter((e) => e.status === 'active');
    if (statusFilter === 'inactive') list = list.filter((e) => e.status === 'inactive');
    if (statusFilter === 'no_pay') list = list.filter((e) => !e.activeCompensation);
    return list;
  }, [employees, search, statusFilter]);

  const employeeCountByPosition = useMemo(() => {
    const map = new Map();
    employees.filter((e) => e.status === 'active').forEach((e) => {
      const ids = Array.isArray(e.positionIds) && e.positionIds.length
        ? e.positionIds.map(String)
        : e.positionId ? [String(e.positionId)] : [];
      ids.forEach((id) => map.set(id, (map.get(id) || 0) + 1));
    });
    return map;
  }, [employees]);

  const assignmentsByDayShift = useMemo(() => {
    const map = {};
    assignments.forEach((assignment) => {
      const shiftId = assignment?.shiftId?._id || assignment?.shiftId;
      if (!shiftId) return;
      const key = `${assignment.date}__${shiftId}`;
      if (!map[key]) map[key] = [];
      map[key].push(assignment);
    });
    return map;
  }, [assignments]);

  const shiftRowsByDay = useMemo(() => {
    const out = {};
    days.forEach((day) => { out[day.date] = shifts.filter((shift) => shiftAppliesToDate(shift, day.date)); });
    return out;
  }, [days, shifts]);

  const assignmentsTotalByDay = useMemo(() => {
    const out = {};
    days.forEach((day) => {
      const dayShifts = shiftRowsByDay[day.date] || [];
      let total = 0;
      dayShifts.forEach((shift) => {
        const key = `${day.date}__${shift._id}`;
        total += (assignmentsByDayShift[key] || []).length;
      });
      out[day.date] = total;
    });
    return out;
  }, [days, shiftRowsByDay, assignmentsByDayShift]);

  const addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthLabel = useMemo(() => {
    if (!costMonth) return '';
    const [y, m] = costMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [costMonth]);

  const weekLabel = useMemo(() => {
    if (!days.length) return '';
    const first = new Date(`${days[0].date}T12:00:00`);
    const last = new Date(`${days[6].date}T12:00:00`);
    const sameMonth = first.getMonth() === last.getMonth();
    const opts = { day: 'numeric', month: 'short' };
    if (sameMonth) {
      return `${first.getDate()} – ${last.toLocaleDateString('es-ES', opts)} ${last.getFullYear()}`;
    }
    return `${first.toLocaleDateString('es-ES', opts)} – ${last.toLocaleDateString('es-ES', opts)} ${last.getFullYear()}`;
  }, [days]);

  const weekTotalAssignments = useMemo(
    () => Object.values(assignmentsTotalByDay).reduce((a, b) => a + b, 0),
    [assignmentsTotalByDay],
  );

  const weekCostSummary = useMemo(() => {
    const totals = costs.totalsByCurrency || {};
    const entries = Object.entries(totals);
    if (!entries.length) return null;
    return entries.map(([cur, val]) => `${val} ${cur}`).join(' · ');
  }, [costs]);

  const currentMobileDay = days[mobileDayIndex] || days[0];
  const positionColorByName = useMemo(() => {
    const map = new Map();
    (positions || []).forEach((position) => map.set(position.name, position.color || '#64748B'));
    return map;
  }, [positions]);
  const plannerLegend = useMemo(
    () => (positions || []).filter((position) => position.status === 'active'),
    [positions],
  );

  const toggleEmployeeStatus = async (employee) => {
    try {
      const status = employee.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/staff/employees/${employee._id}/status`, { status });
      await loadCore({ silent: true });
      await loadAssignments();
      if (tab === 'costs') await loadCosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado');
    }
  };

  const togglePositionStatus = async (position) => {
    try {
      await api.patch(`/staff/positions/${position._id}/status`, {
        status: position.status === 'active' ? 'inactive' : 'active',
      });
      await loadCore({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado del puesto');
    }
  };

  const renderShiftCard = (day, shift) => {
    const key = `${day.date}__${shift._id}`;
    const rawList = assignmentsByDayShift[key] || [];

    const grouped = rawList.reduce((acc, assignment) => {
      const employee = assignment.employeeId || {};
      const roleName = assignment.roleLabel || employee.position || 'Sin puesto';
      const roleColor = positionColorByName.get(roleName) || employee.positionColor || '#64748B';
      const groupKey = `${roleName}__${roleColor}`;
      if (!acc[groupKey]) acc[groupKey] = { roleName, roleColor, names: [] };
      const employeeName = employee?.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Empleado';
      acc[groupKey].names.push(employeeName);
      return acc;
    }, {});

    return (
      <div key={shift._id} className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-900">{shift.name}</p>
            <p className="text-[11px] text-gray-500">{shift.startTime} - {shift.endTime}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${rawList.length > 0 ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-400'}`}>
              {rawList.length}
            </span>
            <button
              onClick={() => setSlotEditor({ day, shift })}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Detalle
            </button>
          </div>
        </div>

        {rawList.length === 0 ? (
          <p className="text-[11px] text-gray-300 italic">Sin empleados asignados</p>
        ) : (
          <div className="space-y-1.5">
            {Object.values(grouped).map((group, index) => (
              <div key={`${group.roleColor}-${index}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: group.roleColor }}>
                  {group.roleName}
                </p>
                <p className="text-[12px] text-gray-700 leading-5">{group.names.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal</h2>
          <p className="text-sm text-gray-500">Gestion de empleados, planificacion semanal y costes estimados.</p>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === item.key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
      {loading && <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />}

      {/* -- EMPLEADOS TAB -- */}
      {!loading && tab === 'employees' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Sub-tab header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEmployeeSubTab('employees')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${employeeSubTab === 'employees' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Empleados
              </button>
              <button
                onClick={() => setEmployeeSubTab('positions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${employeeSubTab === 'positions' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Puestos
              </button>
            </div>
            <div>
              {employeeSubTab === 'employees' ? (
                <button
                  onClick={() => setEmployeeModal({})}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                  Nuevo empleado
                </button>
              ) : (
                <button
                  onClick={() => setPositionModal({})}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                  Nuevo puesto
                </button>
              )}
            </div>
          </div>

          {/* -- EMPLOYEES SUB-TAB -- */}
          {employeeSubTab === 'employees' && (
            <>
              {/* Stats bar */}
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${statusFilter === 'all' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {employeeStats.total} total
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${statusFilter === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {employeeStats.active} activos
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${statusFilter === 'inactive' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {employeeStats.inactive} inactivos
                </button>
                {employeeStats.noPay > 0 && (
                  <button
                    onClick={() => setStatusFilter('no_pay')}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${statusFilter === 'no_pay' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {employeeStats.noPay} sin pago
                  </button>
                )}
                {/* Search */}
                <div className="relative ml-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar empleado..."
                    className="border border-gray-300 rounded-xl pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-52"
                  />
                </div>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredEmployees.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">Sin empleados</div>
                )}
                {filteredEmployees.map((employee) => (
                  <MobileEmployeeRow
                    key={employee._id}
                    employee={employee}
                    onEdit={() => setEmployeeModal(employee)}
                    onPago={() => setCompModalEmployee(employee)}
                    onToggle={() => toggleEmployeeStatus(employee)}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">
                    {search ? 'No hay resultados para tu búsqueda' : 'Sin empleados'}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Puestos</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pago activo</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee, i) => {
                        const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();
                        const comp = employee.activeCompensation;
                        return (
                          <tr
                            key={employee._id}
                            className={`hover:bg-gray-50/60 transition-colors ${i < filteredEmployees.length - 1 ? 'border-b border-gray-50' : ''}`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={employee.firstName} />
                                <div>
                                  <p className="font-semibold text-gray-900 leading-tight">{fullName}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {employee.email || employee.phone || 'Sin contacto'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1.5">
                                {(employee.positions || []).map((position) => (
                                  <span key={position._id} className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border border-gray-200">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                                    {position.name}
                                  </span>
                                ))}
                                {(!employee.positions || employee.positions.length === 0) && (
                                  <span className="text-xs text-gray-300">Sin puesto</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {comp ? (
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{compLabel(comp)}</p>
                                  <p className="text-xs text-gray-400">{compTypeLabel(comp.paymentType)}</p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Sin definir
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${employee.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setCompModalEmployee(employee)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 font-medium transition-colors"
                                >
                                  Pago
                                </button>
                                <button
                                  onClick={() => setEmployeeModal(employee)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => toggleEmployeeStatus(employee)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                                >
                                  {employee.status === 'active' ? 'Desactivar' : 'Activar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* -- POSITIONS SUB-TAB -- */}
          {employeeSubTab === 'positions' && (
            <>
              {/* Position stats */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <span className="text-xs text-gray-500 font-semibold">
                  {positions.filter((p) => p.status === 'active').length} puestos activos
                </span>
                {positions.filter((p) => p.status === 'inactive').length > 0 && (
                  <span className="text-xs text-gray-400">
                    · {positions.filter((p) => p.status === 'inactive').length} inactivos
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                {positions.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">Sin puestos definidos</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Puesto</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Color</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleados activos</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, i) => {
                        const count = employeeCountByPosition.get(String(position._id)) || 0;
                        return (
                          <tr
                            key={position._id}
                            className={`hover:bg-gray-50/60 transition-colors ${i < positions.length - 1 ? 'border-b border-gray-50' : ''}`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-8 h-8 rounded-xl shrink-0 shadow-sm border border-white"
                                  style={{ backgroundColor: position.color || '#64748B' }}
                                />
                                <p className="font-semibold text-gray-900">{position.name}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-xs font-mono text-gray-500">{position.color || '#64748B'}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              {count > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">
                                  {count} {count === 1 ? 'empleado' : 'empleados'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">Sin empleados</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${position.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {position.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setPositionModal(position)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => togglePositionStatus(position)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                                >
                                  {position.status === 'active' ? 'Desactivar' : 'Activar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* -- PLANNER TAB -- */}
      {!loading && tab === 'planner' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          {/* Nav row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekStart((v) => addDays(v, -7))}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-700"
                aria-label="Semana anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
              </button>
              <label className="relative cursor-pointer group">
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-800 group-hover:bg-gray-100 transition-colors block">
                  {weekLabel}
                </span>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  tabIndex={-1}
                />
              </label>
              <button
                onClick={() => setWeekStart((v) => addDays(v, 7))}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-700"
                aria-label="Semana siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setWeekStart(mondayOf(todayIso()))}
                className="ml-1 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-500 transition-colors"
              >
                Hoy
              </button>
            </div>
            {/* Legend */}
            {plannerLegend.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {plannerLegend.map((position) => (
                  <span key={position._id} className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                    {position.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-2.5 min-w-[1280px]">
              {days.map((day) => {
                const isToday = day.date === today;
                const totalForDay = assignmentsTotalByDay[day.date] || 0;
                const dayShifts = shiftRowsByDay[day.date] || [];
                return (
                  <div
                    key={day.date}
                    className={`rounded-xl border p-2.5 space-y-2 max-h-[74vh] overflow-auto ${
                      isToday
                        ? 'border-violet-300 bg-violet-50/40'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className={`px-1 pb-1.5 border-b sticky top-0 z-10 ${isToday ? 'border-violet-200 bg-violet-50/40' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <p className={`text-xs uppercase font-semibold ${isToday ? 'text-violet-600' : 'text-gray-400'}`}>{day.short}</p>
                          <p className={`text-sm font-bold ${isToday ? 'text-violet-700' : 'text-gray-900'}`}>{day.day}</p>
                        </div>
                        {totalForDay > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isToday ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'}`}>
                            {totalForDay}
                          </span>
                        )}
                      </div>
                    </div>

                    {dayShifts.length === 0 ? (
                      <p className="text-[11px] text-gray-300 text-center pt-2">Sin turnos</p>
                    ) : (
                      dayShifts.map((shift) => renderShiftCard(day, shift))
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile day selector */}
          <div className="md:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day, index) => {
                const isToday = day.date === today;
                return (
                  <button
                    key={day.date}
                    onClick={() => setMobileDayIndex(index)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      mobileDayIndex === index
                        ? isToday ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-600 text-white border-violet-600'
                        : isToday ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {day.fullLabel}
                  </button>
                );
              })}
            </div>
            {currentMobileDay && (
              <div className="space-y-2">
                {(shiftRowsByDay[currentMobileDay.date] || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin turnos para este día</p>
                ) : (
                  (shiftRowsByDay[currentMobileDay.date] || []).map((shift) => renderShiftCard(currentMobileDay, shift))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- COSTS TAB -- */}
      {!loading && tab === 'costs' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Sub-tab header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCostsSubTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${costsSubTab === 'monthly' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Mes
              </button>
              <button
                onClick={() => setCostsSubTab('balance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${costsSubTab === 'balance' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Balance acumulado
              </button>
            </div>
            {/* Month nav — only for monthly sub-tab */}
            {costsSubTab === 'monthly' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCostMonth((v) => addMonths(v, -1))}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-700"
                  aria-label="Mes anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
                <label className="relative cursor-pointer group">
                  <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-800 group-hover:bg-gray-100 transition-colors block capitalize">
                    {monthLabel}
                  </span>
                  <input
                    type="month"
                    value={costMonth}
                    onChange={(e) => e.target.value && setCostMonth(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    tabIndex={-1}
                  />
                </label>
                <button
                  onClick={() => setCostMonth((v) => addMonths(v, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-700"
                  aria-label="Mes siguiente"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {costsLoading && <div className="h-20 mx-4 my-4 rounded-xl bg-gray-100 animate-pulse" />}

          {/* ── MONTHLY SUB-TAB ── */}
          {!costsLoading && costsSubTab === 'monthly' && (
            <>
              {/* Total card */}
              {Object.entries(monthlyCosts.totalsByCurrency || {}).length > 0 && (
                <div className="px-4 pt-4 pb-2 flex flex-wrap gap-3">
                  {Object.entries(monthlyCosts.totalsByCurrency).map(([currency, value]) => (
                    <div key={currency} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total {monthLabel}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value} <span className="text-sm font-semibold text-gray-500">{currency}</span></p>
                    </div>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto">
                {(monthlyCosts.employeeCosts || []).length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">Sin asignaciones en {monthLabel}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Asignaciones</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Horas</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo pago</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Coste mes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(monthlyCosts.employeeCosts || []).map((row, i) => (
                        <tr key={String(row.employeeId)} className={`hover:bg-gray-50/60 transition-colors ${i < monthlyCosts.employeeCosts.length - 1 ? 'border-b border-gray-50' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={row.employeeName} />
                              <span className="font-medium text-gray-800">{row.employeeName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">{row.assignments}</td>
                          <td className="px-4 py-3.5 text-gray-600">{row.totalHours}h</td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs">{compTypeLabel(row.compensation?.paymentType)}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-900">{row.monthlyCost} <span className="text-xs font-semibold text-gray-400">{row.currency}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── BALANCE SUB-TAB ── */}
          {!costsLoading && costsSubTab === 'balance' && (
            <>
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-400">Acumulado total generado menos pagos registrados. Pulsa <span className="font-semibold">Pagado</span> para registrar un cobro y resetear el saldo.</p>
              </div>
              <div className="overflow-x-auto">
                {balances.filter((b) => b.employeeStatus === 'active' || b.balance !== 0).length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">Sin datos de balance</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Generado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pagado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Último pago</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pendiente</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {balances
                        .filter((b) => b.employeeStatus === 'active' || b.balance !== 0)
                        .map((row, i, arr) => {
                          const isConfirming = confirmingPayment === String(row.employeeId);
                          return (
                            <tr key={String(row.employeeId)} className={`hover:bg-gray-50/60 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={row.employeeName} />
                                  <span className="font-medium text-gray-800">{row.employeeName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-gray-600">{row.totalEarned} <span className="text-xs text-gray-400">{row.currency}</span></td>
                              <td className="px-4 py-3.5 text-gray-600">{row.totalPaid} <span className="text-xs text-gray-400">{row.currency}</span></td>
                              <td className="px-4 py-3.5 text-gray-400 text-xs">
                                {row.lastPaidAt
                                  ? new Date(row.lastPaidAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : '—'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`font-bold text-base ${row.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {row.balance} <span className="text-xs font-semibold text-gray-400">{row.currency}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {isConfirming ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-gray-500">¿Confirmar {row.balance} {row.currency}?</span>
                                    <button
                                      onClick={() => registerPayment(String(row.employeeId), row.balance, row.currency)}
                                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => setConfirmingPayment(null)}
                                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    disabled={row.balance <= 0}
                                    onClick={() => setConfirmingPayment(String(row.employeeId))}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Pagado
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* -- MODALS -- */}
      {employeeModal && (
        <EmployeeFormModal
          employee={employeeModal._id ? employeeModal : null}
          positions={positions.filter((position) => position.status === 'active')}
          onClose={() => setEmployeeModal(null)}
          onSaved={async () => {
            setEmployeeModal(null);
            await loadCore({ silent: true });
            await loadWeekData();
          }}
        />
      )}
      {positionModal && (
        <PositionFormModal
          position={positionModal._id ? positionModal : null}
          onClose={() => setPositionModal(null)}
          onSaved={() => loadCore({ silent: true })}
        />
      )}
      {compModalEmployee && (
        <CompensationModal
          employee={compModalEmployee}
          onClose={() => setCompModalEmployee(null)}
          onSaved={async () => {
            setCompModalEmployee(null);
            await loadCore({ silent: true });
            await loadWeekData();
          }}
        />
      )}
      {slotEditor && (
        <ShiftEditorModal
          day={slotEditor.day}
          shift={slotEditor.shift}
          assignments={assignmentsByDayShift[`${slotEditor.day.date}__${slotEditor.shift._id}`] || []}
          activeEmployees={activeEmployees}
          positions={positions}
          onClose={() => setSlotEditor(null)}
          onRefresh={loadAssignments}
        />
      )}
    </div>
  );
}

