import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { currencySymbol, formatMoney } from './shared';

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
