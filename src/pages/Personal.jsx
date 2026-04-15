import { useEffect, useMemo, useState } from 'react';
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
function EmployeeFormModal({ employee, positions, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    positionId: employee?.positionId || '',
    notes: employee?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
        <div>
          <label className={labelCls}>Puesto</label>
          <select className={inputCls} value={form.positionId} onChange={(e) => setForm((f) => ({ ...f, positionId: e.target.value }))}>
            <option value="">Sin puesto</option>
            {positions.map((position) => (
              <option key={position._id} value={position._id}>
                {position.name}
              </option>
            ))}
          </select>
        </div>
        <div><label className={labelCls}>Notas</label><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        <div className="flex items-center justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button><button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form>
    </Modal>
  );
}

function CompensationModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({ paymentType: employee?.activeCompensation?.paymentType || 'hourly', baseAmount: employee?.activeCompensation?.baseAmount ?? 0, currency: employee?.activeCompensation?.currency || 'EUR', effectiveFrom: todayIso(), notes: '' });
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
        <div><label className={labelCls}>Tipo de pago</label><select className={inputCls} value={form.paymentType} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}><option value="hourly">Por hora</option><option value="per_shift">Por turno</option><option value="monthly_fixed">Fijo mensual</option></select></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="sm:col-span-2"><label className={labelCls}>Importe base</label><input className={inputCls} type="number" min="0" step="0.01" value={form.baseAmount} onChange={(e) => setForm((f) => ({ ...f, baseAmount: e.target.value }))} required /></div><div><label className={labelCls}>Moneda</label><input className={inputCls} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} /></div></div>
        <div><label className={labelCls}>Vigencia desde</label><input className={inputCls} type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} required /></div>
        <div><label className={labelCls}>Observaciones</label><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        <div className="flex items-center justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button><button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button></div>
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

    assignments.forEach((assignment) => {
      const employee = assignment.employeeId;
      const key = employee?.positionId ? String(employee.positionId) : null;
      const column = key ? byKey.get(key) : null;
      if (!column) return;
      column.assigned.push(assignment);
    });

    availableEmployees.forEach((employee) => {
      const key = employee?.positionId ? String(employee.positionId) : null;
      const column = key ? byKey.get(key) : null;
      if (!column) return;
      column.available.push(employee);
    });

    return baseColumns;
  }, [positions, assignments, availableEmployees]);

  const addEmployee = async (employeeId) => {
    if (!employeeId) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/assignments', { employeeId, date: day.date, shiftId: shift._id });
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
    <Modal title={`Detalle del turno - ${shift.name}`} subtitle={`${day.fullLabel} - ${shift.startTime}-${shift.endTime}`} onClose={onClose} size="xl">
      <div className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[260px] gap-3">
            {columns.map((column) => (
              <section key={column.key} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <p className="text-sm font-semibold text-gray-900">{column.label}</p>
                </div>

                <div className="space-y-1.5 min-h-[180px]">
                  {column.assigned.length === 0 && <p className="text-xs text-gray-400">Sin asignados</p>}
                  {column.assigned.map((assignment) => {
                    const employee = assignment.employeeId;
                    const employeeName = employee?.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Empleado';
                    return (
                      <div key={assignment._id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
                        <span className="text-xs text-gray-800 truncate">{employeeName}</span>
                        <button
                          onClick={() => removeEmployee(assignment._id)}
                          disabled={saving}
                          className="text-[11px] text-rose-600 hover:underline disabled:opacity-60"
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <select
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
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
                      await addEmployee(selectedId);
                      setSelectedByColumn((prev) => ({ ...prev, [column.key]: '' }));
                    }}
                    disabled={saving || !selectedByColumn[column.key]}
                    className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    Anadir
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

function PositionManagerModal({ positions, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', color: '#64748B' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', color: '#64748B' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing?._id) await api.put(`/staff/positions/${editing._id}`, form);
      else await api.post('/staff/positions', form);
      resetForm();
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el puesto');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (position) => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/staff/positions/${position._id}/status`, {
        status: position.status === 'active' ? 'inactive' : 'active',
      });
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado del puesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Puestos" onClose={onClose}>
      <div className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {editing ? 'Editando puesto' : 'Nuevo puesto'}
        </p>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
          <input
            className={inputCls}
            placeholder="Nombre del puesto"
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            required
          />
          <input
            className={inputCls}
            type="color"
            value={form.color}
            onChange={(e) => setForm((v) => ({ ...v, color: e.target.value.toUpperCase() }))}
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
              {editing ? 'Guardar' : 'Crear'}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {positions.length === 0 && (
            <div className="text-sm text-gray-500 px-3 py-6 text-center">
              Todavia no hay puestos
            </div>
          )}
          {positions.map((position) => (
            <div key={position._id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: position.color || '#64748B' }} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{position.name}</p>
                  <p className="text-xs text-gray-500">{position.status === 'active' ? 'Activo' : 'Inactivo'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(position);
                    setForm({ name: position.name || '', color: position.color || '#64748B' });
                  }}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleStatus(position)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {position.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
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
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [compModalEmployee, setCompModalEmployee] = useState(null);
  const [slotEditor, setSlotEditor] = useState(null);

  const loadCore = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const loadWeekData = async () => {
    try {
      const [aRes, cRes] = await Promise.all([api.get(`/staff/assignments?weekStart=${weekStart}`), api.get(`/staff/costs?weekStart=${weekStart}`)]);
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

  const loadCosts = async () => {
    try {
      const cRes = await api.get(`/staff/costs?weekStart=${weekStart}`);
      setCosts(cRes.data || { employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar costes');
    }
  };

  useEffect(() => { loadCore(); }, []);
  useEffect(() => { loadWeekData(); }, [weekStart]);
  useEffect(() => { if (tab === 'costs') loadCosts(); }, [tab]);
  useEffect(() => { setMobileDayIndex(0); }, [weekStart]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === 'active'), [employees]);
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
  const currentMobileDay = days[mobileDayIndex] || days[0];

  const toggleEmployeeStatus = async (employee) => {
    try {
      const status = employee.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/staff/employees/${employee._id}/status`, { status });
      await loadCore();
      await loadAssignments();
      if (tab === 'costs') await loadCosts();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado');
    }
  };

  const renderShiftCard = (day, shift) => {
    const key = `${day.date}__${shift._id}`;
    const rawList = assignmentsByDayShift[key] || [];
    const list = rawList;

    const grouped = list.reduce((acc, assignment) => {
      const employee = assignment.employeeId || {};
      const roleName = employee.position || assignment.roleLabel || 'Sin puesto';
      const roleColor = employee.positionColor || '#64748B';
      const groupKey = `${roleName}__${roleColor}`;
      if (!acc[groupKey]) acc[groupKey] = { roleColor, items: [] };
      acc[groupKey].items.push(assignment);
      return acc;
    }, {});

    return (
      <div key={shift._id} className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-900">{shift.name}</p>
            <p className="text-[11px] text-gray-500">{`${shift.startTime} - ${shift.endTime}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700">{rawList.length}</span>
            <button
              onClick={() => setSlotEditor({ day, shift })}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Detalle
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {Object.values(grouped).map((group, index) => (
            <div key={`${group.roleColor}-${index}`} className="space-y-1">
              <div className="space-y-1">
                {group.items.map((assignment) => {
                  const employee = assignment.employeeId;
                  const employeeName = employee?.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Empleado';
                  return (
                    <p
                      key={assignment._id}
                      className="text-[12px] text-gray-800 truncate px-2 py-1 rounded-md border"
                      style={{ borderColor: group.roleColor, backgroundColor: `${group.roleColor}1A` }}
                    >
                      {employeeName}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h2 className="text-xl font-bold text-gray-900">Personal</h2><p className="text-sm text-gray-500">Gestion de empleados, planificacion semanal y costes estimados.</p></div>
        <div className="flex items-center gap-2">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`px-3 py-2 rounded-xl text-sm font-semibold ${tab === item.key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{item.label}</button>)}</div>
      </div>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
      {loading && <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />}

      {!loading && tab === 'employees' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Empleados ({employees.length})</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPositionModalOpen(true)} className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
                Puestos
              </button>
              <button onClick={() => setEmployeeModal({})} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700">
                Nuevo empleado
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2">Empleado</th>
                  <th className="text-left px-4 py-2">Puesto</th>
                  <th className="text-left px-4 py-2">Pago activo</th>
                  <th className="text-left px-4 py-2">Estado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee._id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{`${employee.firstName} ${employee.lastName || ''}`.trim()}</p>
                      <p className="text-xs text-gray-500">{employee.email || employee.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {employee.position ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2 py-1 border border-gray-200">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: employee.positionColor || '#64748B' }} />
                          {employee.position}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {employee.activeCompensation
                        ? `${employee.activeCompensation.paymentType} - ${employee.activeCompensation.baseAmount} ${employee.activeCompensation.currency}`
                        : 'Sin definir'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${employee.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setCompModalEmployee(employee)} className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100">Pago</button>
                        <button onClick={() => setEmployeeModal(employee)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Editar</button>
                        <button onClick={() => toggleEmployeeStatus(employee)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {employee.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'planner' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart((v) => addDays(v, -7))} className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm" aria-label="Semana anterior">◀</button>
              <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))} className={inputCls} />
              <button onClick={() => setWeekStart((v) => addDays(v, 7))} className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm" aria-label="Semana siguiente">▶</button>
            </div>
            <span className="text-xs text-gray-500">Vista semanal agrupada por puestos · usa Detalle para editar</span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-3 min-w-[1280px]">
              {days.map((day) => (
                <div key={day.date} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2 max-h-[74vh] overflow-auto">
                  <div className="px-1 pb-1 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
                    <p className="text-xs text-gray-500 uppercase">{day.short}</p>
                    <p className="text-sm font-semibold text-gray-900">{day.day}</p>
                  </div>

                  {(shiftRowsByDay[day.date] || []).map((shift) => renderShiftCard(day, shift))}
                </div>
              ))}
            </div>
          </div>

          <div className="md:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setMobileDayIndex(index)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border ${mobileDayIndex === index ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {day.fullLabel}
                </button>
              ))}
            </div>
            {currentMobileDay && (
              <div className="space-y-2">
                {(shiftRowsByDay[currentMobileDay.date] || []).map((shift) => renderShiftCard(currentMobileDay, shift))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'costs' && <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3"><div className="flex items-center gap-2"><button onClick={() => setWeekStart((v) => addDays(v, -7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana anterior</button><input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))} className={inputCls} /><button onClick={() => setWeekStart((v) => addDays(v, 7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana siguiente</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"><p className="text-xs text-gray-500">Total semanal</p>{Object.entries(costs.totalsByCurrency || {}).length === 0 ? <p className="text-sm font-semibold text-gray-700">Sin datos</p> : Object.entries(costs.totalsByCurrency || {}).map(([currency, value]) => <p key={currency} className="text-sm font-semibold text-gray-800">{`${value} ${currency}`}</p>)}</div><div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"><p className="text-xs text-gray-500">Estimacion mensual</p>{Object.entries(costs.monthlyEstimateByCurrency || {}).length === 0 ? <p className="text-sm font-semibold text-gray-700">Sin datos</p> : Object.entries(costs.monthlyEstimateByCurrency || {}).map(([currency, value]) => <p key={currency} className="text-sm font-semibold text-gray-800">{`${value} ${currency}`}</p>)}</div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left px-3 py-2">Empleado</th><th className="text-left px-3 py-2">Asignaciones</th><th className="text-left px-3 py-2">Horas</th><th className="text-left px-3 py-2">Tipo pago</th><th className="text-left px-3 py-2">Coste semanal</th></tr></thead><tbody>{(costs.employeeCosts || []).map((row) => <tr key={row.employeeId} className="border-b border-gray-50"><td className="px-3 py-2 font-medium text-gray-800">{row.employeeName}</td><td className="px-3 py-2 text-gray-700">{row.assignments}</td><td className="px-3 py-2 text-gray-700">{row.totalHours}</td><td className="px-3 py-2 text-gray-700">{row.compensation?.paymentType || '-'}</td><td className="px-3 py-2 font-semibold text-gray-900">{`${row.weeklyCost} ${row.currency}`}</td></tr>)}</tbody></table></div></div>}

      {employeeModal && (
        <EmployeeFormModal
          employee={employeeModal._id ? employeeModal : null}
          positions={positions.filter((position) => position.status === 'active')}
          onClose={() => setEmployeeModal(null)}
          onSaved={async () => {
            setEmployeeModal(null);
            await loadCore();
            await loadWeekData();
          }}
        />
      )}
      {positionModalOpen && (
        <PositionManagerModal
          positions={positions}
          onClose={() => setPositionModalOpen(false)}
          onSaved={loadCore}
        />
      )}
      {compModalEmployee && <CompensationModal employee={compModalEmployee} onClose={() => setCompModalEmployee(null)} onSaved={async () => { setCompModalEmployee(null); await loadCore(); await loadWeekData(); }} />}
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

