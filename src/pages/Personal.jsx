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

function weekDays(weekStart) {
  return [...Array(7)].map((_, i) => {
    const date = addDays(weekStart, i);
    const ui = new Date(`${date}T12:00:00`);
    return {
      date,
      short: ui.toLocaleDateString('es-ES', { weekday: 'short' }),
      day: ui.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    };
  });
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
    <Modal title={`Condiciones de pago · ${employee.firstName}`} onClose={onClose}>
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

function AssignmentModal({ defaultData, employees, shifts, onClose, onSaved }) {
  const [form, setForm] = useState({
    employeeId: defaultData?.employeeId || '',
    date: defaultData?.date || todayIso(),
    shiftId: defaultData?.shiftId || '',
    startTime: defaultData?.startTime || '',
    endTime: defaultData?.endTime || '',
    roleLabel: defaultData?.roleLabel || '',
    notes: defaultData?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/staff/assignments', {
        ...form,
        shiftId: form.shiftId || null,
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la asignacion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nueva asignacion" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        <div>
          <label className={labelCls}>Empleado</label>
          <select className={inputCls} value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} required>
            <option value="">Seleccionar</option>
            {employees.filter((e) => e.status === 'active').map((e) => (
              <option key={e._id} value={e._id}>{`${e.firstName} ${e.lastName || ''}`.trim()}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className={labelCls}>Turno base (opcional)</label>
            <select className={inputCls} value={form.shiftId} onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))}>
              <option value="">Sin turno base</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>{`${s.name} (${s.startTime}-${s.endTime})`}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Hora inicio (opcional)</label>
            <input className={inputCls} type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Hora fin (opcional)</label>
            <input className={inputCls} type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Rol interno en ese turno</label>
          <input className={inputCls} value={form.roleLabel} onChange={(e) => setForm((f) => ({ ...f, roleLabel: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Crear asignacion'}
          </button>
        </div>
      </form>
    </Modal>
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

  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [costs, setCosts] = useState({ employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
  const [shifts, setShifts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employeeModal, setEmployeeModal] = useState(null);
  const [compModalEmployee, setCompModalEmployee] = useState(null);
  const [assignmentModalData, setAssignmentModalData] = useState(null);

  const loadCore = async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, shiftRes] = await Promise.all([
        api.get('/staff/employees?includeInactive=true'),
        api.get('/shifts'),
      ]);
      setEmployees(empRes.data || []);
      setShifts(shiftRes.data || []);
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
      setError(err?.response?.data?.message || 'No se pudieron cargar asignaciones/costes');
    }
  };

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    loadWeekData();
  }, [weekStart]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const assignmentsByEmployeeDate = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const key = `${a.employeeId?._id || a.employeeId}__${a.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assignments]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal</h2>
          <p className="text-sm text-gray-500">Gestion de empleados, planner semanal y costes estimados.</p>
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
                  {employees.map((e) => (
                    <tr key={e._id} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{`${e.firstName} ${e.lastName || ''}`.trim()}</p>
                        <p className="text-xs text-gray-500">{e.email || e.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.position || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {e.activeCompensation
                          ? `${e.activeCompensation.paymentType} · ${e.activeCompensation.baseAmount} ${e.activeCompensation.currency}`
                          : 'Sin definir'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${e.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {e.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setCompModalEmployee(e)} className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100">Pago</button>
                          <button onClick={() => setEmployeeModal(e)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Editar</button>
                          <button onClick={() => toggleEmployeeStatus(e)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                            {e.status === 'active' ? 'Desactivar' : 'Activar'}
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

      {!loading && tab !== 'employees' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">?</button>
              <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))} className={inputCls} />
              <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">?</button>
            </div>
            {tab === 'planner' && (
              <button onClick={() => setAssignmentModalData({ date: weekStart })} className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700">
                Nueva asignacion
              </button>
            )}
          </div>

          {tab === 'planner' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 w-56">Empleado</th>
                    {days.map((d) => (
                      <th key={d.date} className="text-left px-2 py-2">{`${d.short} ${d.day}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter((e) => e.status === 'active').map((e) => (
                    <tr key={e._id} className="border-b border-gray-50 align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{`${e.firstName} ${e.lastName || ''}`.trim()}</p>
                        <p className="text-xs text-gray-500">{e.position || '-'}</p>
                      </td>
                      {days.map((d) => {
                        const key = `${e._id}__${d.date}`;
                        const list = assignmentsByEmployeeDate[key] || [];
                        return (
                          <td key={d.date} className="px-2 py-2">
                            <div className="space-y-1 min-h-[52px]">
                              {list.map((a) => (
                                <div key={a._id} className="text-xs rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5">
                                  <p className="font-semibold text-violet-700 truncate">{a.shiftId?.name || `${a.startTime || '--:--'}-${a.endTime || '--:--'}`}</p>
                                  <div className="flex items-center justify-between gap-2 mt-1">
                                    <span className="text-[10px] text-violet-600 truncate">{a.roleLabel || 'Turno'}</span>
                                    <button onClick={() => removeAssignment(a._id)} className="text-[10px] text-rose-600 hover:underline">Eliminar</button>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => setAssignmentModalData({ employeeId: e._id, date: d.date })}
                                className="text-[11px] text-violet-600 hover:underline"
                              >
                                + Asignar
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'costs' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Total semanal</p>
                  {Object.entries(costs.totalsByCurrency || {}).length === 0
                    ? <p className="text-sm font-semibold text-gray-700">Sin datos</p>
                    : Object.entries(costs.totalsByCurrency || {}).map(([c, v]) => <p key={c} className="text-sm font-semibold text-gray-800">{`${v} ${c}`}</p>)}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Estimacion mensual</p>
                  {Object.entries(costs.monthlyEstimateByCurrency || {}).length === 0
                    ? <p className="text-sm font-semibold text-gray-700">Sin datos</p>
                    : Object.entries(costs.monthlyEstimateByCurrency || {}).map(([c, v]) => <p key={c} className="text-sm font-semibold text-gray-800">{`${v} ${c}`}</p>)}
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
                    {(costs.employeeCosts || []).map((r) => (
                      <tr key={r.employeeId} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.employeeName}</td>
                        <td className="px-3 py-2 text-gray-700">{r.assignments}</td>
                        <td className="px-3 py-2 text-gray-700">{r.totalHours}</td>
                        <td className="px-3 py-2 text-gray-700">{r.compensation?.paymentType || '-'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{`${r.weeklyCost} ${r.currency}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {assignmentModalData && (
        <AssignmentModal
          defaultData={assignmentModalData}
          employees={employees}
          shifts={shifts}
          onClose={() => setAssignmentModalData(null)}
          onSaved={async () => {
            setAssignmentModalData(null);
            await loadWeekData();
          }}
        />
      )}
    </div>
  );
}
