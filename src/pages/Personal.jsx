import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { addDays, compLabel, compTypeLabel, compareShiftTime, formatMoney, mondayOf, normalizeDateOnly, shiftAppliesToDate, todayIso, weekDays } from './personal/shared';
import { ShiftStaffChips, assignPersonColors } from './personal/ShiftStaffChips';
import { MobileEmployeeRow } from './personal/MobileEmployeeRow';
import { EmployeeFormModal } from './personal/EmployeeFormModal';
import { PositionFormModal } from './personal/PositionFormModal';
import { CompensationModal } from './personal/CompensationModal';
import { ShiftEditorModal } from './personal/ShiftEditorModal';
import { EmployeeAssignmentsModal } from './personal/EmployeeAssignmentsModal';

const tabs = [
  {
    key: 'planner', label: 'Planificación',
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

  // Memoized: a new element on every render would make the header update in a loop.
  const headerTabs = useMemo(() => (allowedTabs.length > 1 ? (
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
    ) : null), [allowedTabs, tab]);
  useSetMobileHeader({ title: 'Personal', actions: headerTabs });
  
  

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
  const exportMenuDesktopRef = useRef(null);
  const exportMenuMobileRef = useRef(null);
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
  const staffColorByName = useMemo(() => {
    const names = activeEmployees
      .map((employee) => `${employee.firstName || ''} ${employee.lastName || ''}`.trim())
      .filter(Boolean);
    return assignPersonColors(names);
  }, [activeEmployees]);

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
    const handler = (e) => {
      const inDesktop = exportMenuDesktopRef.current?.contains(e.target);
      const inMobile = exportMenuMobileRef.current?.contains(e.target);
      if (!inDesktop && !inMobile) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  const exportPlanner = async (format) => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      // Wait until the off-screen export portal is mounted and has a ref.
      let attempts = 0;
      while (!plannerGridRef.current && attempts < 20) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => requestAnimationFrame(r));
        attempts += 1;
      }
      if (!plannerGridRef.current) throw new Error('No se pudo preparar la vista para exportar');

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(plannerGridRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const safeLabel = weekLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      if (format === 'png') {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('No se pudo generar el archivo PNG');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `planificacion_${safeLabel}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setError('No se pudo descargar la planificación. Inténtalo de nuevo.');
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
              personColorByName={staffColorByName}
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
          <p className="text-sm text-gray-500">Gestión de empleados, planificación semanal y costes estimados.</p>
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
                <div className="hidden lg:block relative" ref={exportMenuDesktopRef}>
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
                <div className="lg:hidden relative" ref={exportMenuMobileRef}>
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
              style={{ position: 'fixed', left: '-9999px', top: 0, width: '4200px', backgroundColor: '#ffffff', padding: '90px 100px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '28px' }}>
                {days.map((day) => {
                  const dayShifts = shiftRowsByDay[day.date] || [];
                  const isToday = day.date === todayIso();
                  return (
                    <div key={day.date} style={{ borderRadius: '24px', border: `2px solid ${isToday ? '#c4b5fd' : '#e5e7eb'}`, padding: '28px', backgroundColor: isToday ? '#f5f3ff' : '#f9fafb' }}>
                      <div style={{ paddingBottom: '20px', borderBottom: `2px solid ${isToday ? '#c4b5fd' : '#e5e7eb'}`, marginBottom: '20px' }}>
                        <p style={{ fontSize: '22px', fontWeight: 900, color: isToday ? '#8b5cf6' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>{day.short}</p>
                        <p style={{ fontSize: '48px', fontWeight: 900, color: isToday ? '#6d28d9' : '#111827', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>{day.day}</p>
                      </div>
                      {dayShifts.length === 0 ? (
                        <p style={{ fontSize: '22px', color: '#d1d5db', textAlign: 'center', paddingTop: '16px', margin: 0 }}>Sin turnos</p>
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
                          const groupValues = Object.values(grouped);
                          const noPos = groupValues.every(g => g.role === 'Sin puesto');
                          const allNames = groupValues.flatMap(g => [...g.names].sort((a, b) => a.localeCompare(b)));
                          const exportPersonColors = noPos ? assignPersonColors(allNames) : null;
                          const allPeople = groupValues
                            .sort((a, b) => {
                              const oa = positionOrderByName.get(a.role) ?? 999;
                              const ob = positionOrderByName.get(b.role) ?? 999;
                              return oa !== ob ? oa - ob : a.role.localeCompare(b.role);
                            })
                            .flatMap(g => [...g.names].sort((a, b) => a.localeCompare(b)).map(name => ({
                              name,
                              color: noPos ? (exportPersonColors?.get(name) || '#7c3aed') : g.color,
                            })));
                          return (
                            <div key={shift._id} style={{ backgroundColor: '#fff', borderRadius: '20px', border: '2px solid #e5e7eb', padding: '28px', marginBottom: '14px' }}>
                              <p style={{ fontSize: '34px', fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>{shift.name}</p>
                              <p style={{ fontSize: '26px', fontWeight: 600, color: '#9ca3af', margin: '0 0 20px', letterSpacing: '-0.01em' }}>{shift.startTime}–{shift.endTime}</p>
                              {rawList.length === 0 ? (
                                <p style={{ fontSize: '24px', color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>Sin empleados</p>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                  {allPeople.map(({ name, color }, i) => (
                                    <span key={i} style={{ display: 'inline-block', padding: '14px 30px', borderRadius: '14px', fontSize: '34px', fontWeight: 700, backgroundColor: color + '28', color, lineHeight: '34px', verticalAlign: 'middle' }}>
                                      {name.split(' ')[0]}
                                    </span>
                                  ))}
                                </div>
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
          assignments={assignmentsByDayShift[`${slotEditor.day.date}__${slotEditor.shift._id}`]}
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
