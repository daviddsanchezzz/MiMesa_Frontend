import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Notice, currencySymbol, formatMoney } from './shared';

export function EmployeeAssignmentsModal({ employee, onClose, onDeleted }) {
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
        setErrorMsg('El precio debe ser un número mayor o igual a 0');
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
    <Modal title={`Turnos de ${fullName}`} subtitle={`${assignments.length} ${assignments.length === 1 ? 'turno' : 'turnos'} en total`} onClose={onClose} size="lg">
      <div className="space-y-3">
        <Notice>{errorMsg}</Notice>
        {loadingList && <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />}
        {!loadingList && assignments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin turnos registrados</p>
        )}
        {!loadingList && assignments.length > 0 && (
          <ul className="divide-y divide-gray-100 -my-1">
            {assignments.map((a) => {
              const shift = a.shiftId;
              const dateLabel = new Date(`${a.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
              const autoPrice = autoPriceForAssignment(a);
              const isSavingPrice = savingPriceId === a._id;
              const isEditingPrice = editingAssignmentId === a._id;
              const effectivePrice = a.customPrice ?? autoPrice;
              const linkCls = 'text-[13px] font-semibold disabled:opacity-40';
              return (
                <li key={a._id} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-gray-900 truncate first-letter:uppercase">{dateLabel}</p>
                      <p className="text-[13px] text-gray-500 truncate">
                        {shift?.name || '—'}{shift?.startTime && shift?.endTime ? ` · ${shift.startTime}–${shift.endTime}` : ''}
                      </p>
                    </div>
                    {!isEditingPrice && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-gray-900">{effectivePrice === null ? '—' : formatMoney(effectivePrice, currency)}</p>
                        {a.customPrice === null && autoPrice !== null && <p className="text-[11px] text-gray-400">Automático</p>}
                        {a.customPrice !== null && a.customPrice !== undefined && <p className="text-[11px] text-gray-400">Precio a mano</p>}
                      </div>
                    )}
                  </div>
                  {isEditingPrice ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          disabled={isSavingPrice}
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-500">{currencySign}</span>
                      </div>
                      <button onClick={() => saveAssignmentPrice(a._id, editingPriceValue)} disabled={isSavingPrice} className={`${linkCls} text-violet-700 hover:text-violet-900`}>Guardar</button>
                      {autoPrice !== null && (
                        <button type="button" onClick={() => saveAssignmentPrice(a._id, null)} disabled={isSavingPrice} className={`${linkCls} text-gray-600 hover:text-gray-900`}>Usar automático</button>
                      )}
                      <button onClick={cancelEditingPrice} disabled={isSavingPrice} className={`${linkCls} text-gray-500 hover:text-gray-800`}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-4">
                      <button onClick={() => startEditingPrice(a)} disabled={isSavingPrice || deletingId === a._id} className={`${linkCls} text-gray-600 hover:text-gray-900`}>Cambiar precio</button>
                      <button onClick={() => deleteAssignment(a._id)} disabled={deletingId === a._id || isSavingPrice} className={`${linkCls} text-rose-600 hover:text-rose-700`}>Eliminar</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
