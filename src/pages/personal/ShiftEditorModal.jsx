import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { assignPersonColors } from './ShiftStaffChips';

export function ShiftEditorModal({ day, shift, assignments, activeEmployees, positions, onClose, onRefresh }) {
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
