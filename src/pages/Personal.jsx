import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../lib/query';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../ui/Icon';
import PeriodNavigator from '../ui/PeriodNavigator';
import PublishBar from './personal/PublishBar';
import RequestsTab from './personal/RequestsTab';
import { timeOffLabel } from './personal/timeOff';
import { BigFigure, Empty, FigureLine, GhostButton, MenuButton, PrimaryButton, RowAction, Section, Segmented } from '../ui/kit';
import Page from '../ui/Page';
import { Notice, addDays, compTypeLabel, compareShiftTime, formatMoney, staffTimes, mondayOf, normalizeDateOnly, shiftAppliesToDate, todayIso, weekDays } from './personal/shared';
import { ShiftStaffChips, assignPersonColors } from './personal/ShiftStaffChips';
import { EmployeeRow, MoreIcon, StateText } from './personal/MobileEmployeeRow';
import { EmployeeFormModal } from './personal/EmployeeFormModal';
import EmployeeAccessModal from './personal/EmployeeAccessModal';
import { PositionFormModal } from './personal/PositionFormModal';
import { CompensationModal } from './personal/CompensationModal';
import { ShiftEditorModal } from './personal/ShiftEditorModal';
import { EmployeeAssignmentsModal } from './personal/EmployeeAssignmentsModal';
import { dateYear } from '../lib/format';
import { confirmDialog } from '../ui/confirm';
import { TableHead } from '../ui/list';

const TAB_LABELS = { planner: 'Planificación', employees: 'Empleados', costs: 'Costes', requests: 'Solicitudes' };
const TAB_ORDER = ['planner', 'employees', 'costs', 'requests'];
const SUBTITLES = {
  planner: 'Quién trabaja en cada turno de la semana.',
  employees: 'Tu equipo, sus puestos y cómo cobra cada uno.',
  costs: 'Lo que cuesta el personal y lo que queda por pagar.',
  requests: 'Días libres y cambios de turno que te pide tu equipo.',
};

function NavArrow({ dir, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center">
      <Icon name={dir} className="w-4 h-4" strokeWidth={2} />
    </button>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtHours = (h) => `${Number(Number(h || 0).toFixed(2)).toLocaleString('es-ES')} h`;
const heroCard = 'rounded-3xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
// Phone: a grouped card; from md up the rows are a plain table again.
const listCard = 'rounded-2xl border border-gray-200 bg-white overflow-hidden md:rounded-none md:border-0 md:bg-transparent md:overflow-visible';

/** The three numbers of a screen, side by side (phone only). */
function StatRow({ items }) {
  return (
    <div className={`${heroCard} flex divide-x divide-gray-100 py-3.5 md:hidden`}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="flex-1 min-w-0 px-2 text-center">
          <p className={`text-[17px] font-semibold tabular-nums truncate ${item.tone === 'warn' ? 'text-amber-600' : 'text-gray-900'}`}>{item.value}</p>
          <p className="text-[11px] text-gray-500 truncate">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Big number with its label, and a stat row under it (phone only). */
function HeroFigure({ label, value, sub, tone, stats }) {
  return (
    <div className={`${heroCard} p-5 md:hidden`}>
      <p className="text-[13px] text-gray-500">{label}</p>
      <p className={`mt-1 text-[32px] leading-9 font-semibold tracking-tight tabular-nums ${tone === 'warn' ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-[13px] text-gray-500">{sub}</p>}
      {stats && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex divide-x divide-gray-100">
          {stats.map((st) => (
            <div key={st.label} className="flex-1 min-w-0 px-2 first:pl-0 last:pr-0 text-center first:text-left last:text-right">
              <p className="text-[15px] font-semibold tabular-nums text-gray-900 truncate">{st.value}</p>
              <p className="text-[11px] text-gray-500">{st.label}</p>
            </div>
          ))}
        </div>
      )}
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
    if (role === 'owner') return ['employees', 'planner', 'costs', 'requests'];
    if (role === 'manager') return ['planner', 'requests'];
    return [];
  }, [role]);

  const [tab, setTab] = useState('planner');
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted && allowedTabs.includes(wanted)) setTab(wanted);
  }, [allowedTabs]);

  const [weekStart, setWeekStart] = useState(mondayOf(todayIso()));
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const ws = mondayOf(todayIso());
    const diff = Math.round((new Date(todayIso()) - new Date(ws)) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : 0;
  });
  
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [pubStatus, setPubStatus] = useState(null);
  const [openSwapIds, setOpenSwapIds] = useState(() => new Set());
  const [costs, setCosts] = useState({ employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} });
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeModal, setEmployeeModal] = useState(null);
  const [accessEmployee, setAccessEmployee] = useState(null);
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
  const plannerGridRef = useRef(null);
  const mobileDayButtonRefs = useRef({});
  const mobileDayScrollerRef = useRef(null);
  const weekDataRequestSeqRef = useRef(0);
  const EMPTY_COSTS = { employeeCosts: [], totalsByCurrency: {}, monthlyEstimateByCurrency: {} };

  const hasRequests = allowedTabs.includes('requests');
  const offQ = useData(['staff', 'time-off', 'manager'], () => api.get('/staff/time-off?status=all').then((r) => r.data.items), { enabled: hasRequests });
  const swapsQ = useData(['staff', 'swaps', 'manager'], () => api.get('/staff/swaps').then((r) => r.data.items), { enabled: hasRequests });
  const pendingRequests = (offQ.data || []).filter((t) => t.status === 'pending').length + (swapsQ.data || []).filter((x) => x.status === 'pending_manager').length;
  const tabOptions = TAB_ORDER.filter((key) => allowedTabs.includes(key)).map((key) => [key, key === 'requests' && pendingRequests > 0 ? `${TAB_LABELS[key]} ${pendingRequests}` : TAB_LABELS[key]]);

  const loadPubStatus = useCallback(async () => {
    if (!allowedTabs.includes('planner')) return;
    try { setPubStatus((await api.get(`/staff/schedule/status?weekStart=${weekStart}`)).data); } catch { setPubStatus(null); }
  }, [weekStart, allowedTabs]);
  useEffect(() => { loadPubStatus(); }, [loadPubStatus, assignments]);
  // Assignments of this week that have a shift change in progress
  useEffect(() => {
    if (!hasRequests) return;
    api.get(`/staff/swaps/by-week?weekStart=${weekStart}`)
      .then((r) => setOpenSwapIds(new Set((r.data.items || []).flatMap((i) => i.assignmentIds))))
      .catch(() => setOpenSwapIds(new Set()));
  }, [weekStart, assignments, hasRequests, offQ.dataUpdatedAt, swapsQ.dataUpdatedAt]);

  const newEmployeeOrPosition = () => (employeeSubTab === 'employees' ? setEmployeeModal({}) : setPositionModal({}));

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
      setTimeOff(aRes.data?.timeOff || []);
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
      setTimeOff(aRes.data?.timeOff || []);
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

  const exportPlanner = async (format) => {
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
    if (!await confirmDialog('¿Borrar todas las asignaciones de esta semana?')) return;
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
        const confirmed = await confirmDialog(
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
      if (tab === 'costs') await loadMonthlyCosts();
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

  const shiftGroups = (day, shift) => {
    const rawList = assignmentsByDayShift[`${day.date}__${shift._id}`] || [];
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
    const groups = Object.values(grouped)
      .sort((a, b) => {
        const oa = positionOrderByName.get(a.roleName) ?? 999;
        const ob = positionOrderByName.get(b.roleName) ?? 999;
        return oa !== ob ? oa - ob : a.roleName.localeCompare(b.roleName);
      })
      .map((g) => ({ ...g, names: [...g.names].sort((a, b) => a.localeCompare(b)) }));
    return { count: rawList.length, groups };
  };

  // One shift of one day: name and hours, then who works (chips). Tap to edit.
  const hasSwap = (day, shift) => (assignmentsByDayShift[`${day.date}__${shift._id}`] || []).some((a) => openSwapIds.has(String(a._id)));

  const renderShiftCell = (day, shift, cardKey) => {
    const { count, groups } = shiftGroups(day, shift);
    return (
      <button
        key={cardKey}
        type="button"
        onClick={() => setSlotEditor({ day, shift })}
        className="group w-full h-full text-left rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors flex flex-col gap-1.5"
      >
        <span className="flex items-baseline justify-between gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-gray-900 truncate">{shift.name}{hasSwap(day, shift) && <span title="Cambio de turno en curso" className="ml-1 text-violet-600">⇄</span>}</span>
          <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{staffTimes(shift).start}–{staffTimes(shift).end}</span>
        </span>
        {count === 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-violet-700">
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2} />Asignar
          </span>
        ) : (
          // w-0 min-w-full keeps chips from widening the column
          <span className="block w-0 min-w-full">
            <ShiftStaffChips personColorByName={staffColorByName} groups={groups} />
          </span>
        )}
      </button>
    );
  };

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

  const canEditWeek = role === 'owner' || role === 'manager';
  const plannerMenuItems = [
    canEditWeek && !isCopyingWeek && { label: 'Copiar semana anterior', onClick: copyPreviousWeekAssignments },
    canEditWeek && !isCopyingWeek && visibleWeekAssignments.length > 0 && { label: 'Borrar semana', onClick: clearWeekAssignments },
    !isExporting && { label: 'Descargar PNG', onClick: () => exportPlanner('png') },
    !isExporting && { label: 'Descargar PDF', onClick: () => exportPlanner('pdf') },
  ].filter(Boolean);
  const fmtDate = dateYear;
  const moneyByCurrency = (totals) => {
    const entries = Object.entries(totals || {});
    return entries.length ? entries.map(([cur, val]) => formatMoney(val, cur)).join(' · ') : formatMoney(0);
  };

  const headerAction = tab === 'employees' && allowedTabs.includes('employees')
    ? { label: employeeSubTab === 'employees' ? 'Nuevo empleado' : 'Nuevo puesto', short: employeeSubTab === 'employees' ? 'Empleado' : 'Puesto', onClick: newEmployeeOrPosition }
    : undefined;

  return (
    <Page title="Personal" subtitle={SUBTITLES[tab]} sticky primary={headerAction} mobileAction={false}
      tabs={{ value: tab, options: tabOptions, onChange: setTab }}
      mobileBar={tab === 'planner' && allowedTabs.includes('planner') && (
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <PeriodNavigator period="week" periods={['week']} dateRange={{ from: weekStart, to: addDays(weekStart, 6) }}
              onShift={(dir) => setWeekStart((v) => addDays(v, dir * 7))} onPeriodChange={() => {}} onRangeChange={() => {}} />
          </div>
          <MenuButton ariaLabel="Más opciones" className="w-9 h-9 justify-center border border-gray-200 text-gray-600"
            items={[weekStart !== mondayOf(todayIso()) && { label: 'Ir a esta semana', onClick: () => setWeekStart(mondayOf(todayIso())) }, ...plannerMenuItems].filter(Boolean)}>
            <MoreIcon />
          </MenuButton>
        </div>
      )}>

      <Notice>{error}</Notice>
      {loading && <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />}

      {/* -- PLANIFICACIÓN -- */}
      {!loading && tab === 'planner' && allowedTabs.includes('planner') && (
        <div className="space-y-5">
          {/* Week navigation + actions (desktop; the phone has it in the sticky bar) */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 min-w-0">
              <NavArrow dir="left" label="Semana anterior" onClick={() => setWeekStart((v) => addDays(v, -7))} />
              <label className="relative cursor-pointer">
                <span className="block px-1.5 text-[15px] font-semibold text-gray-900 whitespace-nowrap hover:text-violet-700">{weekLabel}</span>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => e.target.value && setWeekStart(mondayOf(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  tabIndex={-1}
                  aria-label="Elegir semana"
                />
              </label>
              <NavArrow dir="right" label="Semana siguiente" onClick={() => setWeekStart((v) => addDays(v, 7))} />
              <button type="button" onClick={() => setWeekStart(mondayOf(todayIso()))} disabled={weekStart === mondayOf(todayIso())}
                className="h-9 px-3 rounded-full text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:text-gray-300 disabled:hover:bg-transparent">
                Hoy
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEditWeek && (
                <div className="hidden lg:flex items-center gap-2">
                  <GhostButton onClick={copyPreviousWeekAssignments} disabled={isCopyingWeek}>
                    {isCopyingWeek ? 'Copiando…' : 'Copiar semana anterior'}
                  </GhostButton>
                  <button type="button" onClick={clearWeekAssignments} disabled={isCopyingWeek || !visibleWeekAssignments.length}
                    className="h-9 px-2 text-[13px] font-semibold text-rose-600 hover:text-rose-700 disabled:text-gray-300">
                    Borrar semana
                  </button>
                </div>
              )}
              <div className="hidden lg:block">
                <MenuButton ariaLabel="Descargar" className="h-9 px-3.5 border border-gray-200"
                  items={isExporting ? [] : [
                    { label: 'PNG (imagen)', onClick: () => exportPlanner('png') },
                    { label: 'PDF', onClick: () => exportPlanner('pdf') },
                  ]}>
                  {isExporting ? 'Preparando…' : 'Descargar'}
                  <Icon name="down" className="w-3.5 h-3.5" strokeWidth={2} />
                </MenuButton>
              </div>
            </div>
          </div>

          <StatRow items={[
            { label: visibleWeekAssignments.length === 1 ? 'turno' : 'turnos', value: visibleWeekAssignments.length },
            { label: activeEmployees.length === 1 ? 'empleado' : 'empleados', value: activeEmployees.length },
            weekCostSummary && { label: 'coste est.', value: weekCostSummary },
          ]} />
          <div className="hidden md:block"><FigureLine items={[
            { label: visibleWeekAssignments.length === 1 ? 'turno asignado' : 'turnos asignados', value: visibleWeekAssignments.length },
            { label: activeEmployees.length === 1 ? 'empleado activo' : 'empleados activos', value: activeEmployees.length },
            weekCostSummary && { label: 'coste estimado', value: weekCostSummary },
          ]} /></div>

          <PublishBar status={pubStatus} weekStart={weekStart} onChanged={loadPubStatus} />

          {shifts.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Todavía no hay turnos. Créalos en Configuración para poder asignar personal.
            </p>
          )}

          {/* Phone: pick a day, then its shifts as rows */}
          <div className="lg:hidden space-y-3">
            <div ref={mobileDayScrollerRef} className={`${heroCard} !rounded-2xl grid grid-cols-7 gap-1 p-1.5`}>
              {days.map((day, i) => {
                const selected = i === mobileDayIndex;
                const isToday = day.date === today;
                const busy = (shiftRowsByDay[day.date] || []).some((sh) => (assignmentsByDayShift[`${day.date}__${sh._id}`] || []).length > 0);
                return (
                  <button key={day.date} type="button" ref={(node) => { mobileDayButtonRefs.current[day.date] = node; }}
                    onClick={() => setMobileDayIndex(i)}
                    className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${selected ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>
                    <span className={`text-[11px] font-semibold uppercase ${selected ? 'text-gray-300' : isToday ? 'text-violet-700' : 'text-gray-400'}`}>{day.short.replace('.', '')}</span>
                    <span className={`text-[15px] font-semibold tabular-nums ${selected ? 'text-white' : isToday ? 'text-violet-700' : 'text-gray-900'}`}>{Number(day.date.slice(8, 10))}</span>
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${busy ? (selected ? 'bg-white' : 'bg-violet-500') : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
            {currentMobileDay && (() => {
              const absent = timeOff.filter((t) => currentMobileDay.date >= t.from && currentMobileDay.date <= t.to)
                .map((t) => {
                  const e = employees.find((x) => String(x._id) === String(t.employeeId));
                  return e ? { id: t._id || `${t.employeeId}-${t.from}`, name: e.firstName, label: timeOffLabel(t.type), pending: t.status === 'pending' } : null;
                }).filter(Boolean);
              return absent.length > 0 ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                  <b>Ausentes:</b> {absent.map((a) => `${a.name} (${a.pending ? 'pide ' : ''}${a.label.toLowerCase()})`).join(' · ')}
                </p>
              ) : null;
            })()}
            {currentMobileDay && (
              <Section title={currentMobileDay.fullLabel}>
                {(shiftRowsByDay[currentMobileDay.date] || []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">Sin turnos este día.</p>
                ) : (
                  <ul className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                    {(shiftRowsByDay[currentMobileDay.date] || []).map((shift) => {
                      const { count, groups } = shiftGroups(currentMobileDay, shift);
                      return (
                        <li key={shift._id}>
                          <button type="button" onClick={() => setSlotEditor({ day: currentMobileDay, shift })}
                            className="w-full flex items-start gap-3 px-3 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100">
                            <span className="w-12 shrink-0 text-right pt-px">
                              <span className="block text-[15px] font-semibold tabular-nums text-gray-900 leading-5">{staffTimes(shift).start}</span>
                              <span className="block text-[11px] text-gray-400 tabular-nums leading-4">{staffTimes(shift).end}</span>
                            </span>
                            <span className="w-[3px] self-stretch rounded-full shrink-0 bg-violet-200" aria-hidden="true" />
                            <span className="min-w-0 flex-1 space-y-1.5">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[15px] font-medium text-gray-900 truncate">{shift.name}</span>
                                <span className={`text-[13px] shrink-0 ${count === 0 ? 'font-semibold text-violet-700' : 'text-gray-500'}`}>
                                  {hasSwap(currentMobileDay, shift) && <span className="mr-1.5 rounded-full bg-violet-50 px-1.5 py-px text-[10px] font-semibold text-violet-700">⇄ Cambio</span>}
                                  {count === 0 ? 'Asignar' : plural(count, 'persona', 'personas')}
                                </span>
                              </span>
                              {count > 0 && <span className="block"><ShiftStaffChips personColorByName={staffColorByName} groups={groups} /></span>}
                            </span>
                            <Icon name="right" className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" strokeWidth={2} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            )}
          </div>

          {/* Desktop: the week in day columns; each shift row lines up across days */}
          {(() => {
            const maxShifts = Math.max(0, ...days.map((d) => (shiftRowsByDay[d.date] || []).length));
            return (
              <div className="hidden lg:block">
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {days.map((day, i) => {
                    const isToday = day.date === today;
                    return (
                      <div key={`h-${day.date}`} className={`flex items-baseline gap-1.5 px-2 pb-2 border-b-2 ${isToday ? 'border-violet-600' : 'border-gray-200'} ${i > 0 ? 'ml-px' : ''}`}>
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-violet-700' : 'text-gray-400'}`}>{day.short.replace('.', '')}</span>
                        <span className={`text-[15px] font-semibold tabular-nums ${isToday ? 'text-violet-700' : 'text-gray-900'}`}>{day.day}</span>
                      </div>
                    );
                  })}
                  {Array.from({ length: maxShifts }, (_, row) =>
                    days.map((day, i) => {
                      const shift = (shiftRowsByDay[day.date] || [])[row];
                      const cellCls = `p-1 min-h-[76px] ${row > 0 ? 'border-t border-gray-100' : ''} ${i > 0 ? 'border-l border-gray-100' : ''} ${day.date === today ? 'bg-violet-50/30' : ''}`;
                      return (
                        <div key={`${day.date}-${row}`} className={cellCls}>
                          {shift && renderShiftCell(day, shift, `${day.date}__${shift._id}`)}
                        </div>
                      );
                    }),
                  )}
                </div>
                {maxShifts > 0 && <p className="mt-2 text-xs text-gray-400">Toca un turno para asignar o quitar personal.</p>}
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
                              <p style={{ fontSize: '26px', fontWeight: 600, color: '#9ca3af', margin: '0 0 20px', letterSpacing: '-0.01em' }}>{staffTimes(shift).start}–{staffTimes(shift).end}</p>
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

      {/* -- EMPLEADOS -- */}
      {!loading && tab === 'employees' && allowedTabs.includes('employees') && (
        <div className="space-y-5">
          {(() => {
            const subOptions = [['employees', `Empleados · ${employeeStats.total}`], ['positions', `Puestos · ${positions.length}`]];
            return (
              <>
                <div className="md:hidden"><Segmented full value={employeeSubTab} onChange={setEmployeeSubTab} options={subOptions} /></div>
                <div className="hidden md:block"><Segmented size="sm" value={employeeSubTab} onChange={setEmployeeSubTab} options={subOptions} /></div>
              </>
            );
          })()}

          {employeeSubTab === 'employees' && (
            <>
              <StatRow items={[
                { label: 'activos', value: employeeStats.active },
                { label: 'con acceso', value: employees.filter((e) => e.member).length },
                { label: 'sin pago', value: employeeStats.noPay, tone: employeeStats.noPay > 0 ? 'warn' : undefined },
              ]} />
              <div className="space-y-3">
                <label className="relative block">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" strokeLinecap="round" /></svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o teléfono"
                    className="w-full rounded-full bg-gray-100 border border-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-violet-500/30" />
                </label>
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    ['all', `Todos ${employeeStats.total}`],
                    ['active', `Activos ${employeeStats.active}`],
                    ['inactive', `Inactivos ${employeeStats.inactive}`],
                    employeeStats.noPay > 0 && ['no_pay', `Sin pago ${employeeStats.noPay}`],
                  ].filter(Boolean).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setStatusFilter(key)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEmployees.length === 0 ? (
                <Empty action={!search && employees.length === 0 && <PrimaryButton onClick={() => setEmployeeModal({})}>Nuevo empleado</PrimaryButton>}>
                  {search ? 'No hay resultados para tu búsqueda.' : employees.length === 0 ? 'Todavía no hay empleados.' : 'No hay empleados con este filtro.'}
                </Empty>
              ) : (
                <div className={listCard}>
                  <TableHead>
                    <span className="col-span-4">Empleado</span>
                    <span className="col-span-3">Puestos</span>
                    <span className="col-span-2">Cómo cobra</span>
                    <span className="col-span-2">Estado</span>
                    <span className="col-span-1" />
                  </TableHead>
                  <ul className="divide-y divide-gray-100">
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow
                        key={employee._id}
                        employee={employee}
                        onEdit={() => setEmployeeModal(employee)}
                        onPago={() => setCompModalEmployee(employee)}
                        onToggle={() => toggleEmployeeStatus(employee)}
                        onAccess={() => setAccessEmployee(employee)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {employeeSubTab === 'positions' && (
            <>
              <p className="text-[13px] text-gray-500">
                {positions.filter((p) => p.status === 'active').length} activos
                {positions.filter((p) => p.status === 'inactive').length > 0 && ` · ${positions.filter((p) => p.status === 'inactive').length} inactivos`}
                {positions.length > 1 && ' · El orden es el de la planificación.'}
              </p>
              {positions.length === 0 ? (
                <Empty action={<PrimaryButton onClick={() => setPositionModal({})}>Nuevo puesto</PrimaryButton>}>Sin puestos definidos.</Empty>
              ) : (
                <div className={listCard}>
                  <TableHead>
                    <span className="col-span-5">Puesto</span>
                    <span className="col-span-3">Empleados activos</span>
                    <span className="col-span-2">Estado</span>
                    <span className="col-span-2" />
                  </TableHead>
                  <ul className="divide-y divide-gray-100">
                    {positions.map((position, i) => {
                      const count = employeeCountByPosition.get(String(position._id)) || 0;
                      const active = position.status === 'active';
                      return (
                        <li key={position._id}>
                          <div className="flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 px-3 md:px-2 py-3 md:rounded-xl hover:bg-gray-50">
                            <button type="button" onClick={() => setPositionModal(position)} className="md:col-span-5 flex items-center gap-3 min-w-0 flex-1 text-left">
                              <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${position.color || '#64748B'}1f` }}>
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: position.color || '#64748B' }} />
                              </span>
                              <span className="min-w-0">
                                <span className={`block text-[15px] font-medium truncate ${active ? 'text-gray-900' : 'text-gray-500'}`}>{position.name}</span>
                                <span className="md:hidden block text-[13px] text-gray-500">
                                  {count > 0 ? `${count} ${count === 1 ? 'empleado' : 'empleados'}` : 'Sin empleados'}{!active && ' · Inactivo'}
                                </span>
                              </span>
                            </button>
                            <span className="hidden md:block col-span-3 text-sm text-gray-700 tabular-nums">
                              {count > 0 ? `${count} ${count === 1 ? 'empleado' : 'empleados'}` : <span className="text-gray-300">—</span>}
                            </span>
                            <span className="hidden md:block col-span-2"><StateText active={active} /></span>
                            <div className="md:col-span-2 flex items-center justify-end gap-0.5 shrink-0">
                              <button type="button" onClick={() => movePosition(i, i - 1)} disabled={i === 0} title="Subir" aria-label="Subir"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent">
                                <Icon name="down" className="w-4 h-4 rotate-180" strokeWidth={2} />
                              </button>
                              <button type="button" onClick={() => movePosition(i, i + 1)} disabled={i === positions.length - 1} title="Bajar" aria-label="Bajar"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent">
                                <Icon name="down" className="w-4 h-4" strokeWidth={2} />
                              </button>
                              <MenuButton ariaLabel="Más opciones" className="w-9 h-9 justify-center text-gray-500"
                                items={[
                                  { label: 'Editar', onClick: () => setPositionModal(position) },
                                  { label: active ? 'Desactivar' : 'Activar', onClick: () => togglePositionStatus(position) },
                                ]}>
                                <MoreIcon />
                              </MenuButton>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* -- SOLICITUDES -- */}
      {!loading && tab === 'requests' && allowedTabs.includes('requests') && (
        <RequestsTab employees={employees} shifts={shifts} positions={positions} onChanged={loadWeekData} />
      )}

      {/* -- COSTES -- */}
      {!loading && tab === 'costs' && allowedTabs.includes('costs') && (
        <div className="space-y-6">
          <div className="md:hidden space-y-3">
            <Segmented full value={costsSubTab} onChange={setCostsSubTab} options={[['monthly', 'Mes'], ['balance', 'Balance acumulado']]} />
            {costsSubTab === 'monthly' && (
              <PeriodNavigator period="month" periods={['month']} dateRange={{ from: `${costMonth}-01`, to: `${costMonth}-01` }}
                onShift={(dir) => setCostMonth((v) => addMonths(v, dir))} onPeriodChange={() => {}} onRangeChange={() => {}} />
            )}
          </div>
          <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
            <Segmented size="sm" value={costsSubTab} onChange={setCostsSubTab} options={[['monthly', 'Mes'], ['balance', 'Balance acumulado']]} />
            {costsSubTab === 'monthly' && (
              <div className="flex items-center gap-0.5">
                <NavArrow dir="left" label="Mes anterior" onClick={() => setCostMonth((v) => addMonths(v, -1))} />
                <label className="relative cursor-pointer">
                  <span className="block px-1.5 text-[15px] font-semibold text-gray-900 hover:text-violet-700 min-w-[8.5rem] text-center">{monthLabel}</span>
                  <input
                    type="month"
                    value={costMonth}
                    onChange={(e) => e.target.value && setCostMonth(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    tabIndex={-1}
                    aria-label="Elegir mes"
                  />
                </label>
                <NavArrow dir="right" label="Mes siguiente" onClick={() => setCostMonth((v) => addMonths(v, 1))} />
              </div>
            )}
          </div>

          {costsLoading && <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />}

          {/* Monthly */}
          {!costsLoading && costsSubTab === 'monthly' && (
            (monthlyCosts.employeeCosts || []).length === 0 ? (
              <Empty>Sin turnos en {monthLabel}.</Empty>
            ) : (() => {
              const rows = monthlyCosts.employeeCosts || [];
              const totalShifts = rows.reduce((n, r) => n + (Number(r.assignments) || 0), 0);
              const totalHours = rows.reduce((n, r) => n + (Number(r.totalHours) || 0), 0);
              return (
                <>
                  <HeroFigure label={`Coste de ${monthLabel}`} value={moneyByCurrency(monthlyCosts.totalsByCurrency)}
                    stats={[{ label: totalShifts === 1 ? 'turno' : 'turnos', value: totalShifts }, { label: 'horas', value: fmtHours(totalHours) }, { label: rows.length === 1 ? 'empleado' : 'empleados', value: rows.length }]} />
                  <div className="hidden md:block"><BigFigure label={`Coste de ${monthLabel}`} value={moneyByCurrency(monthlyCosts.totalsByCurrency)}
                    sub={`${totalShifts} ${totalShifts === 1 ? 'turno' : 'turnos'} · ${Number(totalHours.toFixed(2)).toLocaleString('es-ES')} h · ${rows.length} ${rows.length === 1 ? 'empleado' : 'empleados'}`} /></div>
                  <Section title="Por empleado">
                    <div className={listCard}>
                    <TableHead>
                      <span className="col-span-4">Empleado</span>
                      <span className="col-span-3">Cómo cobra</span>
                      <span className="col-span-1 text-right">Turnos</span>
                      <span className="col-span-2 text-right">Horas</span>
                      <span className="col-span-2 text-right">Coste</span>
                    </TableHead>
                    <ul className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <li key={String(row.employeeId)} className="flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 px-4 md:px-2 py-3.5 md:py-3">
                          <div className="md:col-span-4 min-w-0 flex-1">
                            <p className="text-[15px] font-medium text-gray-900 truncate">{row.employeeName}</p>
                            <p className="md:hidden text-[13px] text-gray-500 truncate">{plural(row.assignments, 'turno', 'turnos')} · {fmtHours(row.totalHours)}{row.compensation?.paymentType ? ` · ${compTypeLabel(row.compensation.paymentType)}` : ''}</p>
                          </div>
                          <span className="hidden md:block col-span-3 text-sm text-gray-600">{compTypeLabel(row.compensation?.paymentType)}</span>
                          <span className="hidden md:block col-span-1 text-right text-sm tabular-nums text-gray-700">{row.assignments}</span>
                          <span className="hidden md:block col-span-2 text-right text-sm tabular-nums text-gray-700">{fmtHours(row.totalHours)}</span>
                          <span className="md:col-span-2 text-right text-sm font-semibold tabular-nums text-gray-900 shrink-0">{formatMoney(row.monthlyCost, row.currency)}</span>
                        </li>
                      ))}
                    </ul>
                    </div>
                  </Section>
                </>
              );
            })()
          )}

          {/* Balance */}
          {!costsLoading && costsSubTab === 'balance' && (() => {
            const visibleRows = balances.filter((b) => b.employeeStatus === 'active' || b.balance !== 0);
            if (visibleRows.length === 0) return <Empty>Sin datos de balance.</Empty>;
            const totalPendingByCurrency = visibleRows.reduce((acc, row) => {
              if (row.balance > 0) acc[row.currency] = Number(((acc[row.currency] || 0) + row.balance).toFixed(2));
              return acc;
            }, {});
            const pendingCount = visibleRows.filter((r) => r.balance > 0).length;
            return (
              <>
                <HeroFigure label="Pendiente de pagar" value={moneyByCurrency(totalPendingByCurrency)}
                  tone={pendingCount > 0 ? 'warn' : undefined}
                  sub={pendingCount > 0 ? `${plural(pendingCount, 'empleado', 'empleados')} con saldo` : 'Todo pagado'} />
                <div className="hidden md:block"><BigFigure label="Pendiente de pagar" value={moneyByCurrency(totalPendingByCurrency)}
                  tone={pendingCount > 0 ? 'warn' : undefined}
                  sub={pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'empleado' : 'empleados'} con saldo` : 'Todo pagado'} /></div>
                <Section title="Por empleado" aside={<span className="text-xs text-gray-500 hidden sm:inline">Lo generado menos los pagos registrados</span>}>
                  <div className={listCard}>
                  <TableHead>
                    <span className="col-span-4">Empleado</span>
                    <span className="col-span-3">Último pago</span>
                    <span className="col-span-2 text-right">Pendiente</span>
                    <span className="col-span-3" />
                  </TableHead>
                  <ul className="divide-y divide-gray-100">
                    {visibleRows.map((row) => {
                      const isConfirming = confirmingPayment === String(row.employeeId);
                      const empObj = employees.find((e) => String(e._id) === String(row.employeeId));
                      return (
                        <li key={String(row.employeeId)} className="px-4 md:px-2 py-3.5 md:py-3 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                          <div className="md:col-span-4 flex items-center justify-between gap-3 min-w-0">
                            <div className="min-w-0">
                              <p className="text-[15px] font-medium text-gray-900 truncate">{row.employeeName}</p>
                              <p className="md:hidden text-[13px] text-gray-500">Último pago: {row.lastPaidAt ? fmtDate(row.lastPaidAt) : '—'}</p>
                            </div>
                            <span className={`md:hidden text-[15px] font-semibold tabular-nums shrink-0 ${row.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{formatMoney(row.balance, row.currency)}</span>
                          </div>
                          <span className="hidden md:block col-span-3 text-sm text-gray-500">{row.lastPaidAt ? fmtDate(row.lastPaidAt) : '—'}</span>
                          <span className={`hidden md:block col-span-2 text-right text-sm font-semibold tabular-nums ${row.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{formatMoney(row.balance, row.currency)}</span>
                          <div className="md:col-span-3 flex items-center md:justify-end gap-3 mt-2 md:mt-0 flex-wrap">
                            {empObj && (
                              <button type="button" onClick={() => setAssignmentsModal(empObj)} className="text-[13px] font-semibold text-gray-600 hover:text-gray-900">Ver turnos</button>
                            )}
                            {isConfirming ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-[13px] text-gray-600 whitespace-nowrap">¿Pagar {formatMoney(row.balance, row.currency)}?</span>
                                <RowAction tone="primary" onClick={() => registerPayment(String(row.employeeId), row.balance, row.currency)}>Confirmar</RowAction>
                                <button type="button" onClick={() => setConfirmingPayment(null)} className="text-[13px] font-semibold text-gray-500 hover:text-gray-800">Cancelar</button>
                              </span>
                            ) : (
                              <RowAction tone="good" disabled={row.balance <= 0} onClick={() => setConfirmingPayment(String(row.employeeId))}>Pagado</RowAction>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">Pulsa <b className="font-semibold">Pagado</b> para registrar el pago y dejar su saldo a cero.</p>
                </Section>
              </>
            );
          })()}
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
      {accessEmployee && (
        <EmployeeAccessModal
          employee={employees.find((e) => e._id === accessEmployee._id) || accessEmployee}
          onClose={() => setAccessEmployee(null)}
          onChanged={() => loadCore({ silent: true })}
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
          timeOff={timeOff}
          openSwapIds={openSwapIds}
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
    </Page>
  );
}
