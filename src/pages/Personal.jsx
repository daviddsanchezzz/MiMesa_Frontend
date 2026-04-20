import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const tabs = [
  {
    key: 'planner', label: 'Planificacion',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V7h11V5.75c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 8.5v4.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V8.5h-11Z" clipRule="evenodd" /></svg>,
  },
  {
    key: 'employees', label: 'Empleados',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg>,
  },
  {
    key: 'costs', label: 'Costes',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true"><text x="1" y="13" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="system-ui,-apple-system,sans-serif">€</text></svg>,
  },
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
const normalizeDateOnly = (value) => {
  const text = String(value || '');
  return text.length >= 10 ? text.slice(0, 10) : '';
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

const formatMoney = (value, currency = 'EUR') => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${parsed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
};

const currencySymbol = (currency = 'EUR') => {
  const sample = formatMoney(0, currency);
  const symbol = sample.replace(/[0-9\s.,-]/g, '').trim();
  return symbol || currency;
};

const compLabel = (comp) => {
  if (!comp) return null;
  const suffix = comp.paymentType === 'hourly' ? '/h' : comp.paymentType === 'per_shift' ? '/turno' : '/mes';
  return `${formatMoney(comp.baseAmount, comp.currency)}${suffix}`;
};

const compTypeLabel = (type) => {
  if (type === 'hourly') return 'Por hora';
  if (type === 'per_shift') return 'Por turno';
  if (type === 'monthly_fixed') return 'Precio mensual';
  return type || '-';
};

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

function ShiftEditorModal({ day, shift, assignments, activeEmployees, positions, onClose, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reservationStats, setReservationStats] = useState(null); // { count, covers }

  useEffect(() => {
    api.get(`/reservations?from=${day.date}&to=${day.date}`)
      .then(({ data }) => {
        const inShift = (data || []).filter((r) => {
          if (!['confirmed', 'seated'].includes(r.status)) return false;
          if (!r.time || !shift.startTime || !shift.endTime) return false;
          return r.time >= shift.startTime && r.time < shift.endTime;
        });
        setReservationStats({
          count: inShift.length,
          covers: inShift.reduce((s, r) => s + (r.people || 0), 0),
        });
      })
      .catch(() => {});
  }, [day.date, shift.startTime, shift.endTime]);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeePickerMenuStyle, setEmployeePickerMenuStyle] = useState(null);
  const [draftAssignments, setDraftAssignments] = useState(assignments || []);
  const employeePickerRef = useRef(null);
  const employeePickerMenuRef = useRef(null);

  useEffect(() => {
    setDraftAssignments(assignments || []);
  }, [assignments]);

  const activePositions = useMemo(
    () => (positions || []).filter((position) => position.status === 'active'),
    [positions],
  );

  const employeeById = useMemo(() => {
    const map = new Map();
    (activeEmployees || []).forEach((employee) => map.set(String(employee._id), employee));
    return map;
  }, [activeEmployees]);

  const initialAssignmentIds = useMemo(
    () => new Set((assignments || []).map((assignment) => String(assignment._id))),
    [assignments],
  );

  const assignmentsByPosition = useMemo(() => {
    const base = activePositions.map((position) => ({
      key: String(position._id),
      label: position.name,
      color: position.color || '#64748B',
      assignments: [],
    }));
    const byKey = new Map(base.map((column) => [column.key, column]));
    const byName = new Map(base.map((column) => [column.label, column]));

    draftAssignments.forEach((assignment) => {
      const employee = assignment.employeeId || {};
      const roleMatch = assignment.roleLabel ? byName.get(assignment.roleLabel) : null;
      const legacyKey = employee?.positionId ? String(employee.positionId) : null;
      const column = roleMatch || (legacyKey ? byKey.get(legacyKey) : null);
      if (!column) return;
      column.assignments.push(assignment);
    });

    return base;
  }, [activePositions, draftAssignments]);

  const assignedEmployeeIds = useMemo(
    () => new Set(draftAssignments.map((assignment) => String(assignment.employeeId?._id || assignment.employeeId))),
    [draftAssignments],
  );

  const availableEmployees = useMemo(
    () => activeEmployees.filter((employee) => !assignedEmployeeIds.has(String(employee._id))),
    [activeEmployees, assignedEmployeeIds],
  );

  const eligibleEmployeesForSelectedPosition = useMemo(() => {
    if (!selectedPositionId) return [];
    return availableEmployees.filter((employee) => {
      const ids = Array.isArray(employee?.positionIds) && employee.positionIds.length
        ? employee.positionIds.map(String)
        : employee?.positionId
          ? [String(employee.positionId)]
          : [];
      return ids.length === 0 || ids.includes(String(selectedPositionId));
    });
  }, [availableEmployees, selectedPositionId]);
  const filteredEligibleEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return eligibleEmployeesForSelectedPosition;
    return eligibleEmployeesForSelectedPosition.filter((employee) => {
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim().toLowerCase();
      return fullName.includes(q);
    });
  }, [eligibleEmployeesForSelectedPosition, employeeQuery]);
  const selectedEmployee = useMemo(
    () => filteredEligibleEmployees.find((employee) => String(employee._id) === String(selectedEmployeeId))
      || eligibleEmployeesForSelectedPosition.find((employee) => String(employee._id) === String(selectedEmployeeId))
      || null,
    [filteredEligibleEmployees, eligibleEmployeesForSelectedPosition, selectedEmployeeId],
  );
  const noPositionPersonColors = useMemo(() => {
    if (activePositions.length > 0) return null;
    const names = (activeEmployees || [])
      .map((employee) => `${employee.firstName || ''} ${employee.lastName || ''}`.trim())
      .filter(Boolean);
    return assignPersonColors(names);
  }, [activeEmployees, activePositions.length]);

  const addEmployeeDirectly = (position, employee) => {
    if (assignedEmployeeIds.has(String(employee._id))) return;
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setDraftAssignments((prev) => [...prev, {
      _id: tempId,
      __temp: true,
      date: day.date,
      shiftId: shift,
      roleLabel: position?.name || '',
      employeeId: employee,
    }]);
    setEmployeeQuery('');
  };

  const totalAssigned = draftAssignments.length;
  const hasChanges = useMemo(() => {
    if ((assignments || []).length !== draftAssignments.length) return true;
    const currentSet = new Set(draftAssignments.filter((assignment) => assignment._id).map((assignment) => String(assignment._id)));
    if (currentSet.size !== initialAssignmentIds.size) return true;
    for (const id of initialAssignmentIds) {
      if (!currentSet.has(id)) return true;
    }
    return draftAssignments.some((assignment) => !assignment._id);
  }, [assignments, draftAssignments, initialAssignmentIds]);

  const addToDraft = () => {
    if (!selectedPositionId || !selectedEmployeeId) return;
    const position = activePositions.find((item) => String(item._id) === String(selectedPositionId));
    const employee = employeeById.get(String(selectedEmployeeId));
    if (!position || !employee) return;
    const employeeId = String(employee._id);
    if (assignedEmployeeIds.has(employeeId)) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setDraftAssignments((prev) => [
      ...prev,
      {
        _id: tempId,
        __temp: true,
        date: day.date,
        shiftId: shift,
        roleLabel: position?.name || '',
        employeeId: employee,
      },
    ]);
    setSelectedEmployeeId('');
    setEmployeeQuery('');
    setEmployeePickerOpen(false);
  };

  const removeFromDraft = (assignmentId) => {
    setDraftAssignments((prev) => prev.filter((assignment) => String(assignment._id) !== String(assignmentId)));
  };
  useEffect(() => {
    if (!employeePickerOpen) return undefined;
    const handleClickOutside = (event) => {
      const inTrigger = employeePickerRef.current && employeePickerRef.current.contains(event.target);
      const inMenu = employeePickerMenuRef.current && employeePickerMenuRef.current.contains(event.target);
      if (!inTrigger && !inMenu) setEmployeePickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [employeePickerOpen]);
  useEffect(() => {
    if (!employeePickerOpen || !selectedPositionId) return undefined;
    const updateMenuPosition = () => {
      if (!employeePickerRef.current) return;
      const rect = employeePickerRef.current.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewportLeft = vv ? vv.offsetLeft : 0;
      const viewportTop = vv ? vv.offsetTop : 0;
      const viewportWidth = vv ? vv.width : window.innerWidth;
      const viewportHeight = vv ? vv.height : window.innerHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const safeMargin = 8;
      const menuGap = 8;

      const desiredWidth = Math.min(Math.max(rect.width + 8, 220), Math.max(220, viewportWidth - safeMargin * 2));
      const left = Math.min(
        Math.max(rect.left - 4, viewportLeft + safeMargin),
        viewportRight - desiredWidth - safeMargin,
      );

      const estimatedHeight = Math.min(320, Math.max(120, filteredEligibleEmployees.length * 42 + 12));
      const spaceBelow = viewportBottom - (rect.bottom + menuGap) - safeMargin;
      const spaceAbove = (rect.top - menuGap) - (viewportTop + safeMargin);
      const openUp = spaceBelow < Math.min(estimatedHeight, 180) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(320, openUp ? spaceAbove : spaceBelow));
      const top = openUp
        ? Math.max(viewportTop + safeMargin, rect.top - Math.min(estimatedHeight, maxHeight) - menuGap)
        : Math.min(rect.bottom + menuGap, viewportBottom - maxHeight - safeMargin);

      setEmployeePickerMenuStyle({
        top,
        left,
        width: desiredWidth,
        maxHeight,
      });
    };
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.visualViewport?.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('scroll', updateMenuPosition);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.visualViewport?.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition);
    };
  }, [employeePickerOpen, selectedPositionId, filteredEligibleEmployees.length]);

  const saveChanges = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const persistedNow = draftAssignments.filter((assignment) => assignment._id && !String(assignment._id).startsWith('tmp_'));
      const persistedIdsNow = new Set(persistedNow.map((assignment) => String(assignment._id)));
      const toDeleteIds = [...initialAssignmentIds].filter((id) => !persistedIdsNow.has(id));
      const toCreate = draftAssignments.filter((assignment) => String(assignment._id).startsWith('tmp_'));

      await Promise.all(toDeleteIds.map((id) => api.delete(`/staff/assignments/${id}`)));
      await Promise.all(toCreate.map((assignment) => api.post('/staff/assignments', {
        employeeId: assignment.employeeId?._id || assignment.employeeId,
        date: day.date,
        shiftId: shift._id,
        roleLabel: assignment.roleLabel || '',
      })));

      await onRefresh();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron guardar los cambios del turno');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={shift.name}
      subtitle={
        <span>
          {day.fullLabel} · {shift.startTime}–{shift.endTime}
          {reservationStats && reservationStats.count > 0 && (
            <span className="ml-2 text-violet-600 font-semibold">
              · {reservationStats.count} {reservationStats.count === 1 ? 'reserva' : 'reservas'}, {reservationStats.covers} {reservationStats.covers === 1 ? 'comensal' : 'comensales'}
            </span>
          )}
        </span>
      }
      onClose={onClose}
      size="lg"
      bodyClassName="overflow-visible"
    >
      <div className="divide-y divide-gray-100">
        {error && (
          <div className="px-5 pb-4">
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>
          </div>
        )}

        {/* ── Assigned list ── */}
        <div className="px-5 py-4 space-y-5">
          {totalAssigned === 0 && (
            <p className="text-sm text-gray-300 text-center py-2">Sin personal asignado</p>
          )}
          {activePositions.length === 0 ? (
            <div className="space-y-0.5">
              {draftAssignments.map((assignment) => {
                const emp = assignment.employeeId || {};
                const name = emp?.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Empleado';
                const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                const personColor = noPositionPersonColors?.get(name) || '#64748B';
                return (
                  <div key={assignment._id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 group transition-colors">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: personColor }}
                    >
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-gray-800 flex-1">{name}</span>
                    <button onClick={() => removeFromDraft(assignment._id)} disabled={saving}
                      className="w-7 h-7 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-300 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all shrink-0 disabled:cursor-not-allowed">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            assignmentsByPosition.filter((col) => col.assignments.length > 0).map((column) => (
              <div key={column.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{column.label}</p>
                </div>
                <div className="space-y-0.5">
                  {column.assignments.map((assignment) => {
                    const emp = assignment.employeeId || {};
                    const name = emp?.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Empleado';
                    const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <div key={assignment._id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 group transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: column.color }}>
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-800 flex-1">{name}</span>
                        <button onClick={() => removeFromDraft(assignment._id)} disabled={saving}
                          className="w-7 h-7 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-300 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all shrink-0 disabled:cursor-not-allowed">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Add section ── */}
        <div className="px-5 py-4 space-y-3 bg-gray-50/50">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Añadir personal</p>

          {activePositions.length === 0 ? (
            /* No positions configured — show all employees directly */
            <div className="space-y-2">
              <div className="relative">
                <input
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors"
                  value={employeeQuery}
                  onChange={(e) => setEmployeeQuery(e.target.value)}
                  placeholder="Buscar..."
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </div>
              {(() => {
                const q = employeeQuery.trim().toLowerCase();
                const list = availableEmployees.filter((e) => !q || `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(q));
                if (list.length === 0) return <p className="text-xs text-gray-400 text-center py-3">{q ? 'Sin resultados' : 'Sin empleados disponibles'}</p>;
                return (
                  <div className="grid grid-cols-2 gap-1.5">
                    {list.map((emp) => {
                      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                      const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                      const personColor = noPositionPersonColors?.get(name) || '#64748B';
                      return (
                        <button key={emp._id} onClick={() => addEmployeeDirectly(null, emp)} disabled={saving}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 text-left transition-all">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ backgroundColor: personColor }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate">{emp.firstName}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
          {/* Position pills */}
          <div className="flex flex-wrap gap-1.5">
            {activePositions.map((position) => {
              const isSelected = String(selectedPositionId) === String(position._id);
              return (
                <button
                  key={position._id}
                  onClick={() => {
                    setSelectedPositionId(isSelected ? '' : String(position._id));
                    setSelectedEmployeeId('');
                    setEmployeeQuery('');
                  }}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isSelected ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                  style={isSelected ? { backgroundColor: position.color || '#7c3aed' } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : (position.color || '#64748B') }} />
                  {position.name}
                </button>
              );
            })}
          </div>

          {/* Employee search + grid */}
          {selectedPositionId && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors"
                  value={employeeQuery}
                  onChange={(e) => setEmployeeQuery(e.target.value)}
                  placeholder="Buscar..."
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </div>

              {filteredEligibleEmployees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  {employeeQuery ? 'Sin resultados' : 'Sin empleados disponibles para este puesto'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredEligibleEmployees.map((emp) => {
                    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                    const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                    const pos = activePositions.find((p) => String(p._id) === String(selectedPositionId));
                    return (
                      <button
                        key={emp._id}
                        onClick={() => addEmployeeDirectly(pos, emp)}
                        disabled={saving}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 text-left transition-all"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: pos?.color || '#64748B' }}
                        >
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">{emp.firstName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">{totalAssigned} {totalAssigned === 1 ? 'persona asignada' : 'personas asignadas'}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || !hasChanges}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EmployeeAssignmentsModal({ employee, onClose, onDeleted }) {
  const [assignments, setAssignments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const compensation = employee?.activeCompensation || null;
  const currency = compensation?.currency || 'EUR';
  const currencySign = currencySymbol(currency);

  const assignmentMinutes = (assignment) => {
    const shift = assignment?.shiftId || {};
    const start = assignment?.startTime || shift?.startTime;
    const end = assignment?.endTime || shift?.endTime;
    if (!start || !end) return 0;
    const [sh, sm] = String(start).split(':').map(Number);
    const [ehRaw, emRaw] = String(end).split(':').map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(ehRaw) || Number.isNaN(emRaw)) return 0;
    const startMin = sh * 60 + sm;
    let endMin = ehRaw * 60 + emRaw;
    if (endMin <= startMin) endMin += 24 * 60;
    return Math.max(endMin - startMin, 0);
  };

  const autoPriceForAssignment = (assignment) => {
    if (!compensation) return null;
    if (compensation.paymentType === 'per_shift') return Number(compensation.baseAmount || 0);
    if (compensation.paymentType === 'hourly') {
      const hours = assignmentMinutes(assignment) / 60;
      return Number((hours * Number(compensation.baseAmount || 0)).toFixed(2));
    }
    return null;
  };

  const formattedPrice = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
    return Number(value).toFixed(2);
  };

  useEffect(() => {
    api.get(`/staff/employees/${employee._id}/assignments`)
      .then((r) => {
        const rows = r.data?.assignments || [];
        setAssignments(rows);
      })
      .catch(() => setErrorMsg('No se pudieron cargar los turnos'))
      .finally(() => setLoadingList(false));
  }, [employee._id]);

  const deleteAssignment = async (id) => {
    setDeletingId(id);
    setErrorMsg('');
    try {
      await api.delete(`/staff/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a._id !== id));
      if (editingAssignmentId === id) {
        setEditingAssignmentId(null);
        setEditingPriceValue('');
      }
      onDeleted?.();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo eliminar el turno');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditingPrice = (assignment) => {
    const effective = assignment.customPrice ?? autoPriceForAssignment(assignment);
    setEditingAssignmentId(assignment._id);
    setEditingPriceValue(effective === null ? '' : formattedPrice(effective));
  };

  const cancelEditingPrice = () => {
    setEditingAssignmentId(null);
    setEditingPriceValue('');
  };

  const saveAssignmentPrice = async (assignmentId, rawValue) => {
    const assignment = assignments.find((item) => item._id === assignmentId);
    if (!assignment) return;
    const raw = String(rawValue ?? '').trim();
    let customPrice = null;
    if (raw !== '') {
      const parsed = Number(raw.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrorMsg('El precio debe ser un numero mayor o igual a 0');
        return;
      }
      customPrice = Number(parsed.toFixed(2));
    }

    if ((assignment.customPrice ?? null) === customPrice) {
      cancelEditingPrice();
      return;
    }

    setSavingPriceId(assignmentId);
    setErrorMsg('');
    try {
      const res = await api.put(`/staff/assignments/${assignmentId}`, { customPrice });
      const updated = res.data;
      setAssignments((prev) => prev.map((row) => (row._id === assignmentId ? { ...row, ...updated } : row)));
      cancelEditingPrice();
      onDeleted?.();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo actualizar el precio');
    } finally {
      setSavingPriceId(null);
    }
  };

  const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();

  return (
    <Modal title={`Turnos — ${fullName}`} subtitle={`${assignments.length} turnos en total`} onClose={onClose} size="lg">
      <div className="space-y-2">
        {errorMsg && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{errorMsg}</div>}
        {loadingList && <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />}
        {!loadingList && assignments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin turnos registrados</p>
        )}
        {!loadingList && assignments.length > 0 && (
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Turno</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const shift = a.shiftId;
                  const dateLabel = new Date(`${a.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                  const autoPrice = autoPriceForAssignment(a);
                  const isSavingPrice = savingPriceId === a._id;
                  const isEditingPrice = editingAssignmentId === a._id;
                  const effectivePrice = a.customPrice ?? autoPrice;
                  return (
                    <tr key={a._id} className={`hover:bg-gray-50/60 transition-colors ${i < assignments.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-3 py-2.5 text-gray-700 capitalize">{dateLabel}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{shift?.name || '—'}</td>
                      <td className="px-3 py-2.5">
                        {!isEditingPrice ? (
                          <div>
                            <span className="text-sm text-gray-800">
                              {effectivePrice === null ? '—' : formatMoney(effectivePrice, currency)}
                            </span>
                            {a.customPrice === null && autoPrice !== null && (
                              <p className="text-[11px] text-gray-400">Automático</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                disabled={isSavingPrice}
                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                              <span className="text-xs text-gray-500">{currencySign}</span>
                            </div>
                            {autoPrice !== null && (
                              <button
                                type="button"
                                onClick={() => saveAssignmentPrice(a._id, null)}
                                disabled={isSavingPrice}
                                className="text-[11px] text-violet-600 hover:underline disabled:opacity-50"
                              >
                                Usar automático
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {!isEditingPrice ? (
                            <button
                              onClick={() => startEditingPrice(a)}
                              disabled={isSavingPrice || deletingId === a._id}
                              className="text-xs text-gray-600 hover:text-gray-800 hover:underline disabled:opacity-40 transition-colors"
                            >
                              Editar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => saveAssignmentPrice(a._id, editingPriceValue)}
                                disabled={isSavingPrice}
                                className="text-xs text-violet-600 hover:text-violet-700 hover:underline disabled:opacity-40 transition-colors"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEditingPrice}
                                disabled={isSavingPrice}
                                className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-40 transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteAssignment(a._id)}
                            disabled={deletingId === a._id || isSavingPrice}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:underline disabled:opacity-40 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

const CHIP_LIMIT = 8;

const PERSON_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#a855f7', // purple
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#22c55e', // green
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#eab308', // yellow
  '#64748b', // slate
  '#0891b2', // dark cyan
  '#e11d48', // crimson
];

function assignPersonColors(names) {
  const n = PERSON_COLORS.length;
  const result = new Map();
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    let h = 0;
    for (let i = 0; i < name.length; i++) { h = name.charCodeAt(i) + ((h << 5) - h); h |= 0; }
    const idx = Math.abs(h) % n;
    result.set(name, PERSON_COLORS[idx]);
  }
  return result;
}

function ShiftStaffChips({ groups }) {
  const [expanded, setExpanded] = useState(false);

  const noPos = groups.length === 1 && groups[0].roleName === 'Sin puesto';
  const personColors = noPos
    ? assignPersonColors(groups[0].names)
    : null;

  const allPeople = groups.flatMap((g) =>
    g.names.map((name) => ({
      name,
      roleColor: noPos ? personColors.get(name) : g.roleColor,
      roleName: g.roleName,
    }))
  );

  if (allPeople.length === 0) return null;

  const overflow = allPeople.length - CHIP_LIMIT;
  const showOverflow = !expanded && overflow > 0;
  const visible = expanded ? allPeople : allPeople.slice(0, CHIP_LIMIT);

  if (!expanded) {
    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((p, i) => (
          <span key={i}
            className="inline-flex items-center px-2.5 py-1 md:px-2 md:py-0.5 rounded-md text-xs md:text-[11px] font-medium leading-5"
            style={{ backgroundColor: p.roleColor + '20', color: p.roleColor }}
          >
            {p.name.split(' ')[0]}
          </span>
        ))}
        {showOverflow && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="inline-flex items-center px-2.5 py-1 md:px-2 md:py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs md:text-[11px] font-semibold leading-5 hover:bg-violet-200 transition-colors"
          >
            +{overflow}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => {
        const groupNoPos = group.roleName === 'Sin puesto';
        return (
          <div key={gi}>
            {!groupNoPos && (
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 pb-0.5 border-b inline-block" style={{ color: group.roleColor, borderColor: group.roleColor }}>
                {group.roleName}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {group.names.map((name, ni) => {
                const c = groupNoPos ? (personColors?.get(name) || group.roleColor) : group.roleColor;
                return (
                <span key={ni}
                  className="inline-flex items-center px-2.5 py-1 md:px-2 md:py-0.5 rounded-md text-xs md:text-[11px] font-medium leading-5"
                  style={{ backgroundColor: c + '22', color: c }}
                >
                  {name.split(' ')[0]}
                </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        className="text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        Ver menos
      </button>
    </div>
  );
}

export default function Personal() {
  const { role, business } = useAuth();
  const navigate = useNavigate();

  // staff no tiene acceso a esta página
  useEffect(() => {
    if (role === 'staff') navigate('/', { replace: true });
  }, [role]);

  const allowedTabs = useMemo(() => {
    if (role === 'owner') return ['employees', 'planner', 'costs'];
    if (role === 'manager') return ['planner'];
    return [];
  }, [role]);

  const [tab, setTab] = useState('planner');

  useSetMobileHeader({
    title: 'Personal',
    actions: allowedTabs.length > 1 ? (
      <div className="flex items-center gap-1">
        {tabs.filter((item) => allowedTabs.includes(item.key)).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${tab === item.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    ) : null,
  });
  
  

  const [weekStart, setWeekStart] = useState(mondayOf(todayIso()));
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const ws = mondayOf(todayIso());
    const diff = Math.round((new Date(todayIso()) - new Date(ws)) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : 0;
  });
  
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
  const [assignmentsModal, setAssignmentsModal] = useState(null); // employee object
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingWeek, setIsCopyingWeek] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const plannerGridRef = useRef(null);
  const exportMenuRef = useRef(null);
  const mobileDayButtonRefs = useRef({});
  const mobileDayScrollerRef = useRef(null);
  const weekDataRequestSeqRef = useRef(0);
  const EMPTY_COSTS = { employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} };

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

  const loadWeekData = async (targetWeekStart = weekStart) => {
    const requestSeq = ++weekDataRequestSeqRef.current;
    try {
      const [aRes, cRes] = await Promise.all([
        api.get(`/staff/assignments?weekStart=${targetWeekStart}`),
        api.get(`/staff/costs?weekStart=${targetWeekStart}`),
      ]);
      if (requestSeq !== weekDataRequestSeqRef.current) return;
      const weekEnd = addDays(targetWeekStart, 6);
      const safeAssignments = (aRes.data?.assignments || [])
        .map((assignment) => ({
          ...assignment,
          date: normalizeDateOnly(assignment?.date),
        }))
        .filter((assignment) => assignment.date && assignment.date >= targetWeekStart && assignment.date <= weekEnd);
      setAssignments(safeAssignments);
      setCosts(cRes.data || EMPTY_COSTS);
    } catch (err) {
      if (requestSeq !== weekDataRequestSeqRef.current) return;
      setError(err?.response?.data?.message || 'No se pudieron cargar asignaciones o costes');
    }
  };

  const loadAssignments = async () => {
    try {
      const aRes = await api.get(`/staff/assignments?weekStart=${weekStart}`);
      const weekEnd = addDays(weekStart, 6);
      const safeAssignments = (aRes.data?.assignments || [])
        .map((assignment) => ({
          ...assignment,
          date: normalizeDateOnly(assignment?.date),
        }))
        .filter((assignment) => assignment.date && assignment.date >= weekStart && assignment.date <= weekEnd);
      setAssignments(safeAssignments);
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
  useEffect(() => {
    setAssignments([]);
    setCosts(EMPTY_COSTS);
    loadWeekData(weekStart);
  }, [weekStart]);
  useEffect(() => {
    if (tab === 'costs') {
      if (costsSubTab === 'monthly') loadMonthlyCosts(costMonth);
      else loadBalances();
    }
  }, [tab, costsSubTab]);
  useEffect(() => {
    if (tab === 'costs' && costsSubTab === 'monthly') loadMonthlyCosts(costMonth);
  }, [costMonth]);
  useEffect(() => {
    const diff = Math.round((new Date(`${todayIso()}T12:00:00`) - new Date(`${weekStart}T12:00:00`)) / 86400000);
    setMobileDayIndex(diff >= 0 && diff <= 6 ? diff : 0);
  }, [weekStart]);

  // After initial load, scroll mobile day strip to today
  useEffect(() => {
    if (loading) return;
    setTimeout(() => {
      const selectedDay = days[mobileDayIndex];
      if (!selectedDay) return;
      const buttonNode = mobileDayButtonRefs.current[selectedDay.date];
      if (buttonNode) centerMobileDayButton(buttonNode);
    }, 150);
  }, [loading]); // eslint-disable-line

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const centerMobileDayButton = useCallback((buttonNode) => {
    const scroller = mobileDayScrollerRef.current;
    if (!buttonNode || !scroller) return;
    const nodeCenter = buttonNode.offsetLeft + buttonNode.offsetWidth / 2;
    const targetLeft = nodeCenter - scroller.clientWidth / 2;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollTo({
      left: Math.max(0, Math.min(targetLeft, maxScroll)),
      behavior: 'auto',
    });
  }, []);
  useEffect(() => {
    if (tab !== 'planner') return undefined;
    const selectedDay = days[mobileDayIndex];
    if (!selectedDay) return undefined;
    const center = () => {
      const buttonNode = mobileDayButtonRefs.current[selectedDay.date];
      if (!buttonNode) return;
      centerMobileDayButton(buttonNode);
    };
    const raf = requestAnimationFrame(center);
    const timeoutId = setTimeout(center, 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, [tab, mobileDayIndex, days, centerMobileDayButton]);
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
  const visibleWeekAssignments = useMemo(
    () => Object.values(assignmentsByDayShift).flat(),
    [assignmentsByDayShift],
  );

  const shiftRowsByDay = useMemo(() => {
    const out = {};
    days.forEach((day) => { out[day.date] = shifts.filter((shift) => shiftAppliesToDate(shift, day.date)); });
    return out;
  }, [days, shifts]);

  const addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthLabel = useMemo(() => {
    if (!costMonth) return '';
    const [y, m] = costMonth.split('-').map(Number);
    const raw = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
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

  const weekCostSummary = useMemo(() => {
    const totals = costs.totalsByCurrency || {};
    const entries = Object.entries(totals);
    if (!entries.length) return null;
    return entries.map(([cur, val]) => formatMoney(val, cur)).join(' · ');
  }, [costs]);

  const currentMobileDay = days[mobileDayIndex] || days[0];

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  const exportPlanner = async (format) => {
    setExportMenuOpen(false);
    setIsExporting(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(plannerGridRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const safeLabel = weekLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `planificacion_${safeLabel}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const { jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();  // 297mm
        const pageH = pdf.internal.pageSize.getHeight(); // 210mm
        const imgRatio = canvas.width / canvas.height;
        const pageRatio = pageW / pageH;
        let drawW = pageW, drawH = pageH, offsetX = 0, offsetY = 0;
        if (imgRatio > pageRatio) {
          drawH = pageW / imgRatio;
          offsetY = (pageH - drawH) / 2;
        } else {
          drawW = pageH * imgRatio;
          offsetX = (pageW - drawW) / 2;
        }
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
        pdf.save(`planificacion_${safeLabel}.pdf`);
      }
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const clearWeekAssignments = async () => {
    const current = visibleWeekAssignments || [];
    if (current.length === 0) return;
    if (!window.confirm('¿Borrar todas las asignaciones de esta semana?')) return;
    try {
      await Promise.all(
        current.filter((a) => a?._id).map((a) => api.delete(`/staff/assignments/${a._id}`)),
      );
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron borrar las asignaciones');
    }
  };

  const copyPreviousWeekAssignments = async () => {
    if (isCopyingWeek) return;
    setError('');
    try {
      const previousWeekStart = addDays(weekStart, -7);
      const prevRes = await api.get(`/staff/assignments?weekStart=${previousWeekStart}`);
      const previousAssignments = prevRes.data?.assignments || [];

      if (previousAssignments.length === 0) {
        setError('La semana anterior no tiene asignaciones para copiar.');
        return;
      }

      if ((visibleWeekAssignments || []).length > 0) {
        const confirmed = window.confirm(
          'Esta semana ya tiene asignaciones. Si continúas se borrarán las actuales y se copiarán las de la semana anterior. ¿Quieres continuar?',
        );
        if (!confirmed) return;
      }

      setIsCopyingWeek(true);

      const currentAssignments = visibleWeekAssignments || [];
      if (currentAssignments.length > 0) {
        await Promise.all(
          currentAssignments
            .filter((assignment) => assignment?._id)
            .map((assignment) => api.delete(`/staff/assignments/${assignment._id}`)),
        );
      }

      const payloads = previousAssignments
        .map((assignment) => ({
          employeeId: assignment?.employeeId?._id || assignment?.employeeId,
          shiftId: assignment?.shiftId?._id || assignment?.shiftId,
          date: assignment?.date ? addDays(assignment.date, 7) : '',
          roleLabel: assignment?.roleLabel || '',
          customPrice: assignment?.customPrice ?? null,
        }))
        .filter((payload) => payload.employeeId && payload.shiftId && payload.date);

      if (payloads.length === 0) {
        setError('No hay asignaciones válidas en la semana anterior para copiar.');
        return;
      }

      await Promise.all(payloads.map((payload) => api.post('/staff/assignments', payload)));
      await loadWeekData();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo copiar la semana anterior');
    } finally {
      setIsCopyingWeek(false);
    }
  };

  const positionColorByName = useMemo(() => {
    const map = new Map();
    (positions || []).forEach((position) => map.set(position.name, position.color || '#64748B'));
    return map;
  }, [positions]);

  const positionOrderByName = useMemo(() => {
    const map = new Map();
    (positions || []).forEach((position, i) => map.set(position.name, i));
    return map;
  }, [positions]);

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

  const renderShiftCard = (day, shift, cardKey) => {
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
      <div
        key={cardKey}
        onClick={() => setSlotEditor({ day, shift })}
        className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 h-full lg:cursor-default cursor-pointer lg:hover:border-gray-200 hover:border-violet-300 transition-colors"
      >
        {/* Shift header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{shift.name}</p>
            <p className="text-xs text-gray-400 whitespace-nowrap">{shift.startTime}–{shift.endTime}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSlotEditor({ day, shift }); }}
            className="shrink-0 w-6 h-6 hidden lg:flex items-center justify-center rounded-full text-gray-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            title="Asignar personal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
          </button>
        </div>
        

        {/* Staff chips — w-0 min-w-full prevents chips from inflating column's intrinsic width */}
        {rawList.length === 0 ? (
          <p className="text-xs text-gray-300 italic">Sin empleados asignados</p>
        ) : (
          <div className="w-0 min-w-full">
            <ShiftStaffChips
              groups={Object.values(grouped)
                .sort((a, b) => {
                  const oa = positionOrderByName.get(a.roleName) ?? 999;
                  const ob = positionOrderByName.get(b.roleName) ?? 999;
                  return oa !== ob ? oa - ob : a.roleName.localeCompare(b.roleName);
                })
                .map((g) => ({ ...g, names: [...g.names].sort((a, b) => a.localeCompare(b)) }))}
            />
          </div>
        )}
      </div>
    );
  };

  
  return (
    <div className="space-y-5">
      <div className="hidden lg:flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal</h2>
          <p className="text-sm text-gray-500">Gestion de empleados, planificacion semanal y costes estimados.</p>
        </div>
        {allowedTabs.length > 1 && (
          <div className="flex items-center gap-1.5">
            {tabs.filter((item) => allowedTabs.includes(item.key)).map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === item.key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                title={item.label}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
      {loading && <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />}

      {/* -- EMPLEADOS TAB -- */}
      {!loading && tab === 'employees' && allowedTabs.includes('employees') && (
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
                  className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:gap-1.5 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">Nuevo empleado</span>
                </button>
              ) : (
                <button
                  onClick={() => setPositionModal({})}
                  className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:gap-1.5 flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">Nuevo puesto</span>
                </button>
              )}
            </div>
          </div>

          {/* -- EMPLOYEES SUB-TAB -- */}
          {employeeSubTab === 'employees' && (
            <>
              {/* Stats bar */}
              <div className="px-4 py-3 border-b border-gray-100 space-y-2">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
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
                  {/* Search — inline on desktop, full-width on mobile */}
                  <div className="relative hidden sm:block ml-auto">
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
                {/* Search full-width on mobile */}
                <div className="relative sm:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar empleado..."
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                              <div>
                                <p className="font-semibold text-gray-900 leading-tight">{fullName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {employee.email || employee.phone || 'Sin contacto'}
                                </p>
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
                        const movePosition = async (fromIdx, toIdx) => {
                          if (toIdx < 0 || toIdx >= positions.length) return;
                          const reordered = [...positions];
                          const [moved] = reordered.splice(fromIdx, 1);
                          reordered.splice(toIdx, 0, moved);
                          // Optimistic update
                          setPositions(reordered);
                          try {
                            await api.patch('/staff/positions/reorder', { ids: reordered.map((p) => p._id) });
                          } catch {
                            await loadCore({ silent: true });
                          }
                        };
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
                                <div className="flex flex-col gap-0.5 mr-1">
                                  <button
                                    onClick={() => movePosition(i, i - 1)}
                                    disabled={i === 0}
                                    className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
                                    title="Subir"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                      <path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => movePosition(i, i + 1)}
                                    disabled={i === positions.length - 1}
                                    className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
                                    title="Bajar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                      <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
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
      {!loading && tab === 'planner' && allowedTabs.includes('planner') && (
        <div className="space-y-4 sm:bg-white sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-sm sm:mx-0">
          {/* Nav row */}
          <div className="space-y-2 px-4 pt-4">
            {/* Row 1: week navigation */}
            <div className="flex items-center justify-between">
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
              </div>
              {/* Right side */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWeekStart(mondayOf(todayIso()))}
                  className="h-8 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-500 transition-colors"
                >
                  Hoy
                </button>

                {/* Desktop: inline buttons */}
                {(role === 'owner' || role === 'manager') && (<>
                  <button
                    onClick={copyPreviousWeekAssignments}
                    disabled={isCopyingWeek}
                    className="hidden lg:flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
                      <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                    </svg>
                    {isCopyingWeek ? 'Copiando...' : 'Copiar semana anterior'}
                  </button>
                  <button
                    onClick={clearWeekAssignments}
                    disabled={isCopyingWeek || !visibleWeekAssignments.length}
                    className="hidden lg:flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-gray-600 hover:text-rose-600 transition-colors disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                    </svg>
                    Borrar semana
                  </button>
                </>)}

                {/* Desktop: download dropdown */}
                <div className="hidden lg:block relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen((v) => !v)}
                    disabled={isExporting}
                    className="h-8 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
                    aria-label="Descargar"
                  >
                    {isExporting ? (
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400">
                          <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                          <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                        </svg>
                        Descargar
                      </>
                    )}
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden py-1">
                      <button onClick={() => exportPlanner('png')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">PNG</button>
                      <button onClick={() => exportPlanner('pdf')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">PDF</button>
                    </div>
                  )}
                </div>

                {/* Mobile: ··· dropdown with everything */}
                <div className="lg:hidden relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center text-gray-500"
                    aria-label="Más opciones"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M8 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM8 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM9.5 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                    </svg>
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden py-1">
                      {(role === 'owner' || role === 'manager') && (<>
                        <button onClick={() => { setExportMenuOpen(false); copyPreviousWeekAssignments(); }} disabled={isCopyingWeek} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400"><path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" /></svg>
                          {isCopyingWeek ? 'Copiando...' : 'Copiar semana anterior'}
                        </button>
                        <button onClick={() => { setExportMenuOpen(false); clearWeekAssignments(); }} disabled={isCopyingWeek || !visibleWeekAssignments.length} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 disabled:opacity-30">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" /></svg>
                          Borrar semana
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                      </>)}
                      <button onClick={() => exportPlanner('png')} disabled={isExporting} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-40">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400"><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" /><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" /></svg>
                        Descargar PNG
                      </button>
                      <button onClick={() => exportPlanner('pdf')} disabled={isExporting} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-40">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400"><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" /><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" /></svg>
                        Descargar PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Week grid — flat grid so each shift row aligns across all columns */}
          {(() => {
            const maxShifts = Math.max(0, ...days.map(d => (shiftRowsByDay[d.date] || []).length));
            return (
              <div className="overflow-x-auto pb-4">
                <div className="grid gap-2 px-3" style={{ gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', minWidth: 'calc(7 * 160px + 6 * 8px + 24px)' }}>
                  {/* Row 0: day headers */}
                  {days.map((day) => {
                    const isToday = day.date === today;
                    return (
                      <div key={`h-${day.date}`} className={`rounded-xl border px-3 py-2 ${isToday ? 'border-violet-300 bg-violet-50/40' : 'border-gray-200 bg-gray-50'}`}>
                        <p className={`text-[11px] uppercase font-bold tracking-wider ${isToday ? 'text-violet-500' : 'text-gray-400'}`}>{day.short}</p>
                        <p className={`text-base font-extrabold leading-tight ${isToday ? 'text-violet-700' : 'text-gray-900'}`}>{day.day}</p>
                      </div>
                    );
                  })}
                  {/* Rows 1..maxShifts: one row per shift slot */}
                  {Array.from({ length: maxShifts }, (_, i) =>
                    days.map((day) => {
                      const shift = (shiftRowsByDay[day.date] || [])[i];
                      if (!shift) return <div key={`${day.date}-${i}`} className="rounded-xl border border-dashed border-gray-100" />;
                      return renderShiftCard(day, shift, `${day.date}__${shift._id}`);
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* Export portal — rendered off-screen, always full 7-day grid */}
          {isExporting && createPortal(
            <div
              ref={plannerGridRef}
              style={{ position: 'fixed', left: '-9999px', top: 0, width: '3400px', backgroundColor: '#ffffff', padding: '80px 90px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Header */}
              <div style={{ marginBottom: '52px', paddingBottom: '36px', borderBottom: '3px solid #e5e7eb', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '26px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>{business?.name || 'Planificación'}</p>
                  <p style={{ fontSize: '60px', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>Planificación semanal</p>
                </div>
                <p style={{ fontSize: '36px', fontWeight: 700, color: '#6b7280', margin: 0 }}>{weekLabel}</p>
              </div>
              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '24px' }}>
                {days.map((day) => {
                  const dayShifts = shiftRowsByDay[day.date] || [];
                  return (
                    <div key={day.date} style={{ borderRadius: '22px', border: '2px solid #e5e7eb', padding: '24px', backgroundColor: '#f9fafb' }}>
                      <div style={{ paddingBottom: '18px', borderBottom: '2px solid #e5e7eb', marginBottom: '18px' }}>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>{day.short}</p>
                        <p style={{ fontSize: '42px', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>{day.day}</p>
                      </div>
                      {dayShifts.length === 0 ? (
                        <p style={{ fontSize: '20px', color: '#d1d5db', textAlign: 'center', paddingTop: '14px', margin: 0 }}>Sin turnos</p>
                      ) : (
                        dayShifts.map((shift) => {
                          const key = `${day.date}__${shift._id}`;
                          const rawList = assignmentsByDayShift[key] || [];
                          const grouped = rawList.reduce((acc, a) => {
                            const emp = a.employeeId || {};
                            const role = a.roleLabel || emp.position || 'Sin puesto';
                            const color = positionColorByName.get(role) || emp.positionColor || '#64748B';
                            const gk = `${role}__${color}`;
                            if (!acc[gk]) acc[gk] = { role, color, names: [] };
                            acc[gk].names.push(emp?.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Empleado');
                            return acc;
                          }, {});
                          return (
                            <div key={shift._id} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #e5e7eb', padding: '18px 20px', marginBottom: '12px' }}>
                              <p style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.01em' }}>{shift.name}</p>
                              {rawList.length === 0 ? (
                                <p style={{ fontSize: '20px', color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>Sin empleados asignados</p>
                              ) : (
                                <ShiftStaffChips
                                  groups={Object.values(grouped)
                                    .sort((a, b) => {
                                      const oa = positionOrderByName.get(a.role) ?? 999;
                                      const ob = positionOrderByName.get(b.role) ?? 999;
                                      return oa !== ob ? oa - ob : a.role.localeCompare(b.role);
                                    })
                                    .map((g) => ({ roleName: g.role, roleColor: g.color, names: [...g.names].sort((a, b) => a.localeCompare(b)) }))}
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* -- COSTS TAB -- */}
      {!loading && tab === 'costs' && allowedTabs.includes('costs') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Sub-tab header */}
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
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
            {/* Month nav */}
            {costsSubTab === 'monthly' && (
              <div className="flex items-center gap-1 sm:ml-auto">
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
                  <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-800 group-hover:bg-gray-100 transition-colors block">
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
            <div className="overflow-x-auto">
              {(monthlyCosts.employeeCosts || []).length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">Sin turnos en {monthLabel}</div>
              ) : (
                <>
                  <div className="sm:hidden divide-y divide-gray-100">
                    {(monthlyCosts.employeeCosts || []).map((row) => (
                      <div key={String(row.employeeId)} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900 truncate">{row.employeeName}</p>
                          <p className="font-semibold text-gray-900 shrink-0">{formatMoney(row.monthlyCost, row.currency)}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {row.assignments} turnos · {row.totalHours}h · {compTypeLabel(row.compensation?.paymentType)}
                        </p>
                      </div>
                    ))}
                    {Object.entries(monthlyCosts.totalsByCurrency || {}).map(([currency, value]) => (
                      <div key={currency} className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">Total {monthLabel}</p>
                        <p className="text-base font-bold text-gray-900">{formatMoney(value, currency)}</p>
                      </div>
                    ))}
                  </div>

                  <table className="hidden sm:table w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</th>
                        <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Turnos</th>
                        <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Horas</th>
                        <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo pago</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Coste mes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(monthlyCosts.employeeCosts || []).map((row) => (
                        <tr key={String(row.employeeId)} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-medium text-gray-800">{row.employeeName}</span>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3.5 text-gray-600">{row.assignments}</td>
                          <td className="hidden sm:table-cell px-4 py-3.5 text-gray-600">{row.totalHours}h</td>
                          <td className="hidden sm:table-cell px-4 py-3.5 text-gray-500 text-xs">{compTypeLabel(row.compensation?.paymentType)}</td>
                          <td className="px-4 py-3.5 text-gray-800">{formatMoney(row.monthlyCost, row.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {Object.entries(monthlyCosts.totalsByCurrency || {}).map(([currency, value]) => (
                        <tr key={currency} className="border-t-2 border-gray-200 bg-gray-50">
                          <td className="px-5 py-3 font-semibold text-gray-700" colSpan={4}>Total {monthLabel}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 text-base">{formatMoney(value, currency)}</td>
                        </tr>
                      ))}
                    </tfoot>
                  </table>
                </>
              )}
            </div>
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
                ) : (() => {
                  const visibleRows = balances.filter((b) => b.employeeStatus === 'active' || b.balance !== 0);
                  const totalPendingByCurrency = visibleRows.reduce((acc, row) => {
                    if (row.balance > 0) acc[row.currency] = Number(((acc[row.currency] || 0) + row.balance).toFixed(2));
                    return acc;
                  }, {});
                  return (
                    <>
                      <div className="sm:hidden divide-y divide-gray-100">
                        {visibleRows.map((row) => {
                          const isConfirming = confirmingPayment === String(row.employeeId);
                          const empObj = employees.find((e) => String(e._id) === String(row.employeeId));
                          return (
                            <div key={String(row.employeeId)} className="px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-gray-900 truncate">{row.employeeName}</p>
                                <p className={`font-bold ${row.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {formatMoney(row.balance, row.currency)}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400">
                                Último pago: {row.lastPaidAt
                                  ? new Date(row.lastPaidAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : '—'}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {empObj && (
                                  <button
                                    onClick={() => setAssignmentsModal(empObj)}
                                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  >
                                    Ver turnos
                                  </button>
                                )}
                                {isConfirming ? (
                                  <>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">¿{formatMoney(row.balance, row.currency)}?</span>
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
                                  </>
                                ) : (
                                  <button
                                    disabled={row.balance <= 0}
                                    onClick={() => setConfirmingPayment(String(row.employeeId))}
                                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Pagado
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {Object.entries(totalPendingByCurrency).map(([currency, value]) => (
                          <div key={currency} className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Total pendiente</p>
                            <p className="text-base font-bold text-gray-900">{formatMoney(value, currency)}</p>
                          </div>
                        ))}
                      </div>

                      <table className="hidden sm:table w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Último pago</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pendiente</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((row, i, arr) => {
                            const isConfirming = confirmingPayment === String(row.employeeId);
                            const empObj = employees.find((e) => String(e._id) === String(row.employeeId));
                            return (
                              <tr key={String(row.employeeId)} className={`hover:bg-gray-50/60 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                <td className="px-5 py-3.5">
                                  <span className="font-medium text-gray-800">{row.employeeName}</span>
                                </td>
                                <td className="px-4 py-3.5 text-gray-400 text-xs">
                                  {row.lastPaidAt
                                    ? new Date(row.lastPaidAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`font-bold text-base ${row.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {formatMoney(row.balance, row.currency)}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {empObj && (
                                      <button
                                        onClick={() => setAssignmentsModal(empObj)}
                                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                      >
                                        Ver turnos
                                      </button>
                                    )}
                                    {isConfirming ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500 whitespace-nowrap">¿{formatMoney(row.balance, row.currency)}?</span>
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
                                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      >
                                        Pagado
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {Object.keys(totalPendingByCurrency).length > 0 && (
                          <tfoot>
                            {Object.entries(totalPendingByCurrency).map(([currency, value]) => (
                              <tr key={currency} className="border-t-2 border-gray-200 bg-gray-50">
                                <td className="px-5 py-3 font-semibold text-gray-700" colSpan={2}>Total pendiente</td>
                                <td className="px-4 py-3 font-bold text-gray-900 text-base">{formatMoney(value, currency)}</td>
                                <td className="px-4 py-3" />
                              </tr>
                            ))}
                          </tfoot>
                        )}
                      </table>
                    </>
                  );
                })()}
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
      {assignmentsModal && (
        <EmployeeAssignmentsModal
          employee={assignmentsModal}
          onClose={() => setAssignmentsModal(null)}
          onDeleted={() => { loadBalances(); loadAssignments(); }}
        />
      )}
    </div>
  );
}
