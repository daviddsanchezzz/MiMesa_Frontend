import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function toDayOfWeek(isoDate) {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

function weekDays(weekStart) {
  return [...Array(7)].map((_, i) => {
    const date = addDays(weekStart, i);
    const ui = new Date(`${date}T12:00:00`);
    return {
      date,
      short: ui.toLocaleDateString('es-ES', { weekday: 'short' }),
      day: ui.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      label: ui.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    };
  });
}

function compareShiftTime(a, b) {
  return (a.startTime || '').localeCompare(b.startTime || '');
}

function shiftAppliesToDate(shift, date) {
  const day = toDayOfWeek(date);
  if (!Array.isArray(shift.days) || !shift.days.includes(day)) return false;
  if (shift.startDate && date < shift.startDate) return false;
  if (shift.endDate && date > shift.endDate) return false;
  return true;
}

function dayShiftKey(date, shiftId) {
  return `${date}__${shiftId || '__none__'}`;
}

function getAssignmentShiftId(assignment) {
  return assignment?.shiftId?._id || assignment?.shiftId || '__none__';
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function positionColor(position) {
  const p = normalizeText(position);

  if (p.includes('cocina') || p.includes('chef')) {
    return {
      chip: 'bg-amber-50 border-amber-200 text-amber-700',
      dot: 'bg-amber-500',
    };
  }
  if (p.includes('camarer') || p.includes('sala')) {
    return {
      chip: 'bg-sky-50 border-sky-200 text-sky-700',
      dot: 'bg-sky-500',
    };
  }
  if (p.includes('encarg') || p.includes('manager')) {
    return {
      chip: 'bg-violet-50 border-violet-200 text-violet-700',
      dot: 'bg-violet-500',
    };
  }
  if (p.includes('barra') || p.includes('bar')) {
    return {
      chip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  }

  return {
    chip: 'bg-slate-50 border-slate-200 text-slate-700',
    dot: 'bg-slate-500',
  };
}

function EmployeeFormModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    position: employee?.position || '',
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
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
          </div>
          <div>
            <label className={labelCls}>Apellidos</label>
            <input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Telefono</label>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Puesto</label>
          <input className={inputCls} value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
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
      await api.post(`/staff/employees/${employee._id}/compensations`, {
        ...form,
        baseAmount: Number(form.baseAmount || 0),
      });
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
            <option value="per_shift">Por turno</option>
            <option value="monthly_fixed">Fijo mensual</option>
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
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssignmentChip({ assignment, employeeById, onRemove, onDragStart, onDragEnd }) {
  const employeeId = assignment?.employeeId?._id || assignment?.employeeId;
  const employee = assignment?.employeeId?.firstName ? assignment.employeeId : employeeById[String(employeeId)];
  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName || ''}`.trim()
    : 'Empleado';
  const role = employee?.position || assignment?.roleLabel || 'Sin puesto';
  const color = positionColor(role);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      onDragEnd={onDragEnd}
      className={`group flex items-center justify-between gap-2 text-xs rounded-md border px-2 py-1.5 cursor-grab active:cursor-grabbing ${color.chip}`}
    >
      <div className="min-w-0">
        <p className="font-semibold truncate">{employeeName}</p>
        <p className="text-[10px] opacity-80 truncate flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${color.dot}`} />
          {role}
        </p>
      </div>
      <button onClick={() => onRemove(assignment._id)} className="text-rose-600 hover:underline shrink-0">Quitar</button>
    </div>
  );
}

const tabs = [
  { key: 'employees', label: 'Empleados' },
  { key: 'planner', label: 'Planificacion semanal' },
  { key: 'costs', label: 'Costes estimados' },
];

export default function Personal() {
  const [tab, setTab] = useState('employees');
  const [weekStart, setWeekStart] = useState(mondayOf(todayIso()));
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [costs, setCosts] = useState({ employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
  const [shifts, setShifts] = useState([]);

  const [quickAssign, setQuickAssign] = useState({});
  const [dragAssignmentId, setDragAssignmentId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employeeModal, setEmployeeModal] = useState(null);
  const [compModalEmployee, setCompModalEmployee] = useState(null);

  const loadCore = async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, shiftRes] = await Promise.all([
        api.get('/staff/employees?includeInactive=true'),
        api.get('/shifts'),
      ]);
      setEmployees(empRes.data || []);
      setShifts((shiftRes.data || []).slice().sort(compareShiftTime));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    loadWeekData();
  }, [weekStart]);

  useEffect(() => {
    setMobileDayIndex(0);
  }, [weekStart]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  const employeeById = useMemo(() => {
    const map = {};
    employees.forEach((employee) => {
      map[String(employee._id)] = employee;
    });
    return map;
  }, [employees]);

  const assignmentsByDayShift = useMemo(() => {
    const map = {};
    assignments.forEach((assignment) => {
      const shiftId = getAssignmentShiftId(assignment);
      const key = dayShiftKey(assignment.date, shiftId);
      if (!map[key]) map[key] = [];
      map[key].push(assignment);
    });
    return map;
  }, [assignments]);

  const shiftRowsByDay = useMemo(() => {
    const out = {};
    days.forEach((day) => {
      out[day.date] = shifts.filter((shift) => shiftAppliesToDate(shift, day.date));
    });
    return out;
  }, [days, shifts]);

  const currentMobileDay = days[mobileDayIndex] || days[0];

  const toggleEmployeeStatus = async (employee) => {
    try {
      const status = employee.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/staff/employees/${employee._id}/status`, { status });
      await loadCore();
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado');
    }
  };

  const removeAssignment = async (assignmentId) => {
    if (!window.confirm('Eliminar asignacion?')) return;
    try {
      await api.delete(`/staff/assignments/${assignmentId}`);
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la asignacion');
    }
  };

  const addAssignmentToShiftBox = async (date, shiftId) => {
    const key = dayShiftKey(date, shiftId);
    const employeeId = quickAssign[key];
    if (!employeeId) return;

    try {
      await api.post('/staff/assignments', {
        employeeId,
        date,
        shiftId: shiftId === '__none__' ? null : shiftId,
      });
      setQuickAssign((prev) => ({ ...prev, [key]: '' }));
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo asignar el empleado');
    }
  };

  const onChipDragStart = (event, assignment) => {
    setDragAssignmentId(assignment._id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', assignment._id);
  };

  const onChipDragEnd = () => {
    setDragAssignmentId(null);
    setDragOverSlot('');
  };

  const onSlotDragOver = (event, slotKey) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotKey) setDragOverSlot(slotKey);
  };

  const onSlotDragLeave = (slotKey) => {
    if (dragOverSlot === slotKey) setDragOverSlot('');
  };

  const onSlotDrop = async (event, date, shiftId) => {
    event.preventDefault();
    const assignmentId = dragAssignmentId || event.dataTransfer.getData('text/plain');
    setDragOverSlot('');
    setDragAssignmentId(null);

    if (!assignmentId) return;

    const assignment = assignments.find((row) => String(row._id) === String(assignmentId));
    if (!assignment) return;

    const currentShiftId = getAssignmentShiftId(assignment);
    const targetShiftId = shiftId || '__none__';

    if (assignment.date === date && String(currentShiftId) === String(targetShiftId)) return;

    try {
      await api.put(`/staff/assignments/${assignment._id}`, {
        date,
        shiftId: targetShiftId === '__none__' ? null : targetShiftId,
      });
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo mover la asignacion');
    }
  };

  const renderShiftBox = (day, shift) => {
    const shiftId = shift?._id || '__none__';
    const slotKey = dayShiftKey(day.date, shiftId);
    const list = assignmentsByDayShift[slotKey] || [];
    const isDropTarget = dragOverSlot === slotKey;

    return (
      <div
        key={slotKey}
        onDragOver={(event) => onSlotDragOver(event, slotKey)}
        onDragLeave={() => onSlotDragLeave(slotKey)}
        onDrop={(event) => onSlotDrop(event, day.date, shiftId)}
        className={`bg-white rounded-lg border p-2.5 space-y-2 min-h-[170px] transition-colors ${
          isDropTarget ? 'border-violet-400 bg-violet-50/50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-900">{shift?.name || 'Sin turno base'}</p>
            <p className="text-[11px] text-gray-500">
              {shift ? `${shift.startTime} - ${shift.endTime}` : 'Asignaciones manuales'}
            </p>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700">{list.length}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={quickAssign[slotKey] || ''}
            onChange={(e) => setQuickAssign((prev) => ({ ...prev, [slotKey]: e.target.value }))}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white"
          >
            <option value="">Asignar empleado...</option>
            {activeEmployees.map((employee) => (
              <option key={employee._id} value={employee._id}>{`${employee.firstName} ${employee.lastName || ''}`.trim()}</option>
            ))}
          </select>
          <button onClick={() => addAssignmentToShiftBox(day.date, shiftId)} className="px-2 py-1.5 rounded-lg bg-violet-600 text-white text-xs hover:bg-violet-700">
            Add
          </button>
        </div>

        <div className="space-y-1.5">
          {list.length === 0 && <p className="text-[11px] text-gray-400">Sin personal asignado</p>}
          {list.map((assignment) => (
            <AssignmentChip
              key={assignment._id}
              assignment={assignment}
              employeeById={employeeById}
              onRemove={removeAssignment}
              onDragStart={onChipDragStart}
              onDragEnd={onChipDragEnd}
            />
          ))}
        </div>
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
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold ${tab === t.key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
      {loading && <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />}

      {!loading && tab === 'employees' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Empleados ({employees.length})</p>
            <button onClick={() => setEmployeeModal({})} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700">Nuevo empleado</button>
          </div>
          {employees.length === 0 ? (
            <div className="px-4 py-10 text-sm text-gray-400 text-center">Todavia no hay empleados</div>
          ) : (
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
                      <td className="px-4 py-3 text-gray-700">{employee.position || '-'}</td>
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
          )}
        </div>
      )}

      {!loading && tab === 'planner' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana anterior</button>
              <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))} className={inputCls} />
              <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana siguiente</button>
            </div>
            <span className="text-xs text-gray-500">Tip: arrastra una tarjeta para moverla a otro turno o dia</span>
          </div>

          <div className="md:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setMobileDayIndex(index)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border ${mobileDayIndex === index ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            {currentMobileDay && (
              <div className="space-y-2">
                {(shiftRowsByDay[currentMobileDay.date] || []).map((shift) => renderShiftBox(currentMobileDay, shift))}
                {renderShiftBox(currentMobileDay, null)}
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-7 gap-3 min-w-[1320px]">
              {days.map((day) => (
                <div key={day.date} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2">
                  <div className="px-1 pb-1 border-b border-gray-200">
                    <p className="text-xs text-gray-500 uppercase">{day.short}</p>
                    <p className="text-sm font-semibold text-gray-900">{day.day}</p>
                  </div>

                  {(shiftRowsByDay[day.date] || []).length === 0 && (
                    <div className="text-xs text-gray-400 bg-white rounded-lg border border-dashed border-gray-200 p-3">
                      Sin turnos configurados
                    </div>
                  )}

                  {(shiftRowsByDay[day.date] || []).map((shift) => renderShiftBox(day, shift))}

                  {renderShiftBox(day, null)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'costs' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana anterior</button>
            <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))} className={inputCls} />
            <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">Semana siguiente</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Total semanal</p>
              {Object.entries(costs.totalsByCurrency || {}).length === 0
                ? <p className="text-sm font-semibold text-gray-700">Sin datos</p>
                : Object.entries(costs.totalsByCurrency || {}).map(([currency, value]) => <p key={currency} className="text-sm font-semibold text-gray-800">{`${value} ${currency}`}</p>)}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Estimacion mensual</p>
              {Object.entries(costs.monthlyEstimateByCurrency || {}).length === 0
                ? <p className="text-sm font-semibold text-gray-700">Sin datos</p>
                : Object.entries(costs.monthlyEstimateByCurrency || {}).map(([currency, value]) => <p key={currency} className="text-sm font-semibold text-gray-800">{`${value} ${currency}`}</p>)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2">Empleado</th>
                  <th className="text-left px-3 py-2">Asignaciones</th>
                  <th className="text-left px-3 py-2">Horas</th>
                  <th className="text-left px-3 py-2">Tipo pago</th>
                  <th className="text-left px-3 py-2">Coste semanal</th>
                </tr>
              </thead>
              <tbody>
                {(costs.employeeCosts || []).map((row) => (
                  <tr key={row.employeeId} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{row.employeeName}</td>
                    <td className="px-3 py-2 text-gray-700">{row.assignments}</td>
                    <td className="px-3 py-2 text-gray-700">{row.totalHours}</td>
                    <td className="px-3 py-2 text-gray-700">{row.compensation?.paymentType || '-'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{`${row.weeklyCost} ${row.currency}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {employeeModal && (
        <EmployeeFormModal
          employee={employeeModal._id ? employeeModal : null}
          onClose={() => setEmployeeModal(null)}
          onSaved={async () => {
            setEmployeeModal(null);
            await loadCore();
            await loadWeekData();
          }}
        />
      )}

      {compModalEmployee && (
        <CompensationModal
          employee={compModalEmployee}
          onClose={() => setCompModalEmployee(null)}
          onSaved={async () => {
            setCompModalEmployee(null);
            await loadCore();
            await loadWeekData();
          }}
        />
      )}
    </div>
  );
}
