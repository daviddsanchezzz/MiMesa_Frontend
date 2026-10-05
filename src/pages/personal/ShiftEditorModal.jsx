import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Icon from '../../ui/Icon';
import { Section } from '../../ui/kit';
import { assignPersonColors } from './ShiftStaffChips';
import { Notice, SheetFooter, initialsOf, staffTimes } from './shared';
import { timeOffLabel } from './timeOff';

export function ShiftEditorModal({ day, shift, assignments, timeOff = [], activeEmployees, positions, onClose, onRefresh }) {
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

  const addEmployeeDirectly = (position, employee, force = false) => {
    if (assignedEmployeeIds.has(String(employee._id))) return;
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setDraftAssignments((prev) => [...prev, {
      _id: tempId,
      __temp: true,
      __force: force,
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
        ...(assignment.__force ? { force: true } : {}),
      })));

      await onRefresh();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron guardar los cambios del turno');
    } finally {
      setSaving(false);
    }
  };

  const searchInput = (autoFocus) => (
    <label className="relative block">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" strokeLinecap="round" /></svg>
      <input
        className="w-full rounded-full bg-gray-100 border border-transparent pl-10 pr-4 py-2 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-violet-500/30"
        value={employeeQuery}
        onChange={(e) => setEmployeeQuery(e.target.value)}
        placeholder="Buscar…"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
      />
    </label>
  );

  // People who are away that day (approved) or have asked to be (pending)
  const absence = (emp) => timeOff.find((t) => String(t.employeeId) === String(emp._id) && day.date >= t.from && day.date <= t.to);

  const personChip = (emp, color, onAdd) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const away = absence(emp);
    const onClick = () => {
      if (away?.status === 'approved' && !window.confirm(`${emp.firstName} tiene ${timeOffLabel(away.type).toLowerCase()} este día. ¿Asignarle el turno igualmente?`)) return;
      onAdd(Boolean(away?.status === 'approved'));
    };
    return (
      <button key={emp._id} type="button" onClick={onClick} disabled={saving}
        className="inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-gray-50 hover:bg-violet-50 text-left transition-colors disabled:opacity-50">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ backgroundColor: color }}>
          {initialsOf(name)}
        </span>
        <span className="text-sm font-medium text-gray-800 truncate max-w-[9rem]">{emp.firstName}</span>
        {away && <span className="text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 px-1.5 py-px">{away.status === 'pending' ? 'Pide libre' : 'Ausente'}</span>}
        <Icon name="plus" className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
      </button>
    );
  };

  const assignedRow = (assignment, color) => {
    const emp = assignment.employeeId || {};
    const name = emp?.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Empleado';
    return (
      <li key={assignment._id} className="flex items-center gap-3 py-2">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ backgroundColor: color }}>
          {initialsOf(name)}
        </span>
        <span className="text-[15px] text-gray-900 flex-1 min-w-0 truncate">{name}</span>
        {assignment.__temp && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800">Nuevo</span>}
        <button type="button" onClick={() => removeFromDraft(assignment._id)} disabled={saving} aria-label={`Quitar a ${name}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 disabled:cursor-not-allowed">
          <Icon name="x" className="w-4 h-4" strokeWidth={2} />
        </button>
      </li>
    );
  };

  return (
    <Modal
      title={shift.name}
      subtitle={
        <span className="first-letter:uppercase">
          {day.fullLabel} · {staffTimes(shift).start}–{staffTimes(shift).end}{(staffTimes(shift).start !== shift.startTime || staffTimes(shift).end !== shift.endTime) && ` (servicio ${shift.startTime}–${shift.endTime})`}
          {reservationStats && reservationStats.count > 0 && (
            <span className="text-violet-700 font-semibold">
              {' '}· {reservationStats.count} {reservationStats.count === 1 ? 'reserva' : 'reservas'}, {reservationStats.covers} {reservationStats.covers === 1 ? 'comensal' : 'comensales'}
            </span>
          )}
        </span>
      }
      onClose={onClose}
      size="lg"
      footer={(
        <SheetFooter onCancel={onClose} onSave={saveChanges} saving={saving} disabled={!hasChanges} cancelLabel="Cerrar"
          aside={`${totalAssigned} ${totalAssigned === 1 ? 'persona asignada' : 'personas asignadas'}`} />
      )}
    >
      <div className="space-y-7">
        <Notice>{error}</Notice>

        <Section title="En este turno">
          {totalAssigned === 0 && (
            <p className="text-sm text-gray-500 py-2">Todavía no hay nadie. Añade personal abajo.</p>
          )}
          {activePositions.length === 0 ? (
            <ul className="divide-y divide-gray-100">
              {draftAssignments.map((assignment) => {
                const emp = assignment.employeeId || {};
                const name = emp?.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Empleado';
                return assignedRow(assignment, noPositionPersonColors?.get(name) || '#64748B');
              })}
            </ul>
          ) : (
            <div className="space-y-3">
              {assignmentsByPosition.filter((col) => col.assignments.length > 0).map((column) => (
                <div key={column.key}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 pt-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
                    {column.label}
                    <span className="text-gray-400 font-normal">{column.assignments.length}</span>
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {column.assignments.map((assignment) => assignedRow(assignment, column.color))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Añadir personal">
          {activePositions.length === 0 ? (
            /* No positions configured — show all employees directly */
            <div className="space-y-3 pt-1">
              {searchInput(false)}
              {(() => {
                const q = employeeQuery.trim().toLowerCase();
                const list = availableEmployees.filter((e) => !q || `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(q));
                if (list.length === 0) return <p className="text-sm text-gray-500 py-2">{q ? 'Sin resultados' : 'No queda nadie por asignar'}</p>;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((emp) => {
                      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                      return personChip(emp, noPositionPersonColors?.get(name) || '#64748B', (force) => addEmployeeDirectly(null, emp, force));
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-[13px] text-gray-500">Elige el puesto y toca a quién añadir.</p>
              <div className="flex flex-wrap gap-1.5">
                {activePositions.map((position) => {
                  const isSelected = String(selectedPositionId) === String(position._id);
                  return (
                    <button
                      key={position._id}
                      type="button"
                      onClick={() => {
                        setSelectedPositionId(isSelected ? '' : String(position._id));
                        setSelectedEmployeeId('');
                        setEmployeeQuery('');
                      }}
                      disabled={saving}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                      {position.name}
                    </button>
                  );
                })}
              </div>

              {selectedPositionId && (
                <div className="space-y-3">
                  {searchInput(true)}
                  {filteredEligibleEmployees.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      {employeeQuery ? 'Sin resultados' : 'No queda nadie con este puesto por asignar'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {filteredEligibleEmployees.map((emp) => {
                        const pos = activePositions.find((p) => String(p._id) === String(selectedPositionId));
                        return personChip(emp, pos?.color || '#64748B', (force) => addEmployeeDirectly(pos, emp, force));
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}
