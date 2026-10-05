import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import {
  PageHeader, PrimaryButton, Tabs, Section, SectionLink, FigureLine, Empty, Toggle,
} from '../ui/kit';
import { euros } from './agenda/utils';

// ── Color palette (static — color key stored in DB → Tailwind bg class) ───────

const COLOR_DOT = {
  orange: 'bg-orange-400', blue: 'bg-blue-400',   cyan: 'bg-cyan-400',
  purple: 'bg-purple-400', yellow: 'bg-yellow-400', pink: 'bg-pink-400',
  red:    'bg-red-400',    indigo: 'bg-indigo-400', violet: 'bg-violet-500',
  slate:  'bg-slate-400',  emerald: 'bg-emerald-400', teal: 'bg-teal-400',
};

const COLOR_PALETTE = [
  { value: 'orange',  label: 'Naranja',    cls: 'bg-orange-400'  },
  { value: 'blue',    label: 'Azul',       cls: 'bg-blue-400'    },
  { value: 'cyan',    label: 'Cian',       cls: 'bg-cyan-400'    },
  { value: 'purple',  label: 'Púrpura',    cls: 'bg-purple-400'  },
  { value: 'yellow',  label: 'Amarillo',   cls: 'bg-yellow-400'  },
  { value: 'pink',    label: 'Rosa',       cls: 'bg-pink-400'    },
  { value: 'red',     label: 'Rojo',       cls: 'bg-red-400'     },
  { value: 'indigo',  label: 'Índigo',     cls: 'bg-indigo-400'  },
  { value: 'violet',  label: 'Violeta',    cls: 'bg-violet-500'  },
  { value: 'slate',   label: 'Gris',       cls: 'bg-slate-400'   },
  { value: 'emerald', label: 'Verde',      cls: 'bg-emerald-400' },
  { value: 'teal',    label: 'Teal',       cls: 'bg-teal-400'    },
];

// Lookup helpers — always receive the dynamic categories array
function catDot(cats, value) {
  const c = cats?.find((x) => x.value === value);
  return COLOR_DOT[c?.color] || 'bg-slate-400';
}
const BUILT_IN_LABELS = { staff: 'Personal', commissions: 'Comisiones' };
function catLabel(cats, value) {
  return cats?.find((x) => x.value === value)?.label || BUILT_IN_LABELS[value] || value;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// Uses local date parts to avoid UTC offset shifting the date (e.g. Spain CEST = UTC+2)
function toIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekRange(anchor = new Date()) {
  const today = new Date(anchor);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today); mon.setDate(today.getDate() + diff);
  const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
  return { from: toIso(mon), to: toIso(sun) };
}

function getMonthRange(anchor = new Date()) {
  const today = new Date(anchor);
  return {
    from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
    to:   toIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The same kind of period, `direction` steps away (-1 = the previous one).
function shiftRange(period, dateRange, direction) {
  if (period === 'month') {
    const anchor = parseIso(dateRange.from);
    anchor.setMonth(anchor.getMonth() + direction);
    return getMonthRange(anchor);
  }
  if (period === 'week') {
    const anchor = parseIso(dateRange.from);
    anchor.setDate(anchor.getDate() + (7 * direction));
    return getWeekRange(anchor);
  }
  const from = parseIso(dateRange.from);
  const to = parseIso(dateRange.to);
  const days = Math.round((to - from) / 86400000) + 1;
  from.setDate(from.getDate() + (days * direction));
  to.setDate(to.getDate() + (days * direction));
  return { from: toIso(from), to: toIso(to) };
}

// "1 oct" (with the year when it isn't this year)
function fmtShort(iso, withYear = false) {
  if (!iso) return '—';
  const d = parseIso(iso);
  const showYear = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(showYear ? { year: 'numeric' } : {}) }).replace('.', '');
}

// "mié 1 oct"
function fmtDay(iso) {
  if (!iso) return '—';
  return parseIso(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[.,]/g, '');
}

function fmtRange({ from, to }) {
  if (!from || !to) return '';
  return `${fmtShort(from)} – ${fmtShort(to, true)}`;
}

// Amounts here are euros (not cents): 12 € · 12,50 € · −1.099,20 €
function fmtEur(n) {
  if (n === null || n === undefined) return '—';
  return euros(Math.round(Number(n) * 100)).replace('-', '−');
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function Loading() {
  return <p className="py-6 text-sm text-gray-400">Cargando…</p>;
}

function FormField({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const selectCls = inputCls + ' bg-white';
const amountCls = 'w-full rounded-xl border border-gray-300 px-3.5 py-3 text-2xl font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const btnSubmit = 'inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60';
const btnCancel = 'inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100';
const btnDanger = 'inline-flex items-center justify-center h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60';
const errorCls = 'text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2';

// Hairline table header: [[label, 'col-span-x text-right'], …]
function TableHead({ cols }) {
  return (
    <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {cols.map(([label, cls]) => <span key={label || cls} className={cls}>{label}</span>)}
    </div>
  );
}

/** ⋯ button with a small menu (Editar · Eliminar). */
function RowMenu({ items, label = 'Más opciones' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={label}
        className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg leading-none">⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48">
            {items.filter(Boolean).map((it) => (
              <button key={it.label} type="button" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 ${it.danger ? 'text-rose-600' : 'text-gray-700'}`}>
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Dot({ cls, size = 'w-2.5 h-2.5' }) {
  return <span className={`${size} rounded-full shrink-0 ${cls}`} aria-hidden="true" />;
}

function Pager({ page, pageCount, setPage }) {
  if (pageCount <= 1) return null;
  const btn = 'inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center justify-between pt-2">
      <button type="button" className={btn} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
        <Icon name="left" className="w-3.5 h-3.5" strokeWidth={2} />Anterior
      </button>
      <span className="text-xs text-gray-400 tabular-nums">{page + 1} de {pageCount}</span>
      <button type="button" className={btn} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>
        Siguiente<Icon name="right" className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────

function CustomRange({ dateRange, onRangeChange }) {
  const cls = 'rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-0 flex-1 sm:flex-none appearance-none bg-white';
  return (
    <div className="flex items-center gap-2">
      <input type="date" aria-label="Desde" value={dateRange.from} onChange={(e) => onRangeChange({ ...dateRange, from: e.target.value })} className={cls} />
      <span className="text-gray-400 text-sm">–</span>
      <input type="date" aria-label="Hasta" value={dateRange.to} onChange={(e) => onRangeChange({ ...dateRange, to: e.target.value })} className={cls} />
    </div>
  );
}

function periodLabel(period, dateRange) {
  if (period === 'month') {
    const text = parseIso(dateRange.from).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return fmtRange(dateRange);
}

function PeriodNavigator({ period, dateRange, onPeriodChange, onShift, onRangeChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center justify-center gap-1">
        <button type="button" onClick={() => onShift(-1)} aria-label="Periodo anterior"
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <Icon name="left" className="w-4 h-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)}
          className="min-w-[180px] h-9 px-3 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
          {periodLabel(period, dateRange)}
          <Icon name="calendar" className="w-4 h-4 text-gray-500" />
        </button>
        <button type="button" onClick={() => onShift(1)} aria-label="Periodo siguiente"
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <Icon name="right" className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
              {[['week', 'Semana'], ['month', 'Mes'], ['custom', 'Personalizado']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => { onPeriodChange(key); if (key !== 'custom') setOpen(false); }}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold ${period === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="mt-3">
                <CustomRange dateRange={dateRange} onRangeChange={onRangeChange} />
                <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full h-9 rounded-xl bg-violet-600 text-sm font-semibold text-white">Aplicar</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Resumen tab ───────────────────────────────────────────────────────────────

function InlineRevenueEdit({ date, value, source, onSave }) {
  const [modal, setModal] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setModal(true)}
        className={`inline-flex flex-col items-end px-2 py-1 -mr-2 rounded-lg transition-colors ${value !== null ? 'hover:bg-gray-100' : 'hover:bg-violet-50'}`}>
        {value !== null
          ? <span className="text-sm font-semibold tabular-nums text-gray-900">{fmtEur(value)}</span>
          : <span className="text-[13px] font-semibold text-violet-700">+ Registrar ingreso</span>}
        {value !== null && <span className="text-[11px] text-gray-400 leading-4">{source === 'manual' ? 'A mano' : 'Cobrado'}</span>}
      </button>
      {modal && (
        <RevenueModal
          date={date}
          initialValue={value}
          onClose={() => setModal(false)}
          onSave={(v) => { onSave(v); setModal(false); }}
        />
      )}
    </>
  );
}

function TicketAverageEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));

  const save = () => {
    setEditing(false);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) onSave(num);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number" min="0" step="0.5"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 px-2 py-0.5 text-base font-semibold tabular-nums border border-violet-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    );
  }
  return (
    <button type="button" onClick={() => { setVal(String(value)); setEditing(true); }}
      className="font-semibold tabular-nums text-gray-900 underline decoration-dashed decoration-gray-300 underline-offset-4 hover:decoration-violet-500"
      title="Cambiar el ticket medio">
      {fmtEur(value)}
    </button>
  );
}

const PAGE_SIZE = 10;

// Built-in categories (they have no row in /categories) still get their own colour in the bar.
const BUILT_IN_BAR = { staff: 'bg-violet-400', commissions: 'bg-pink-400' };
function barColor(cats, value) {
  const c = cats?.find((x) => x.value === value);
  return c ? (COLOR_DOT[c.color] || 'bg-slate-400') : (BUILT_IN_BAR[value] || 'bg-slate-400');
}

const MONTH_NAME = (iso) => parseIso(iso).toLocaleDateString('es-ES', { month: 'long' });
function previousLabel(period, dateRange) {
  if (period === 'month') return MONTH_NAME(shiftRange('month', dateRange, -1).from);
  return period === 'week' ? 'la semana anterior' : 'el periodo anterior';
}

// What the period brought in. Appointments: what was billed. Restaurants: the actual takings when
// entered, the estimate otherwise (the API folds that into estimatedProfit).
function incomeOf(d) {
  if (!d) return null;
  return d.mode === 'appointments' ? (d.estimatedRevenue || 0) : (d.estimatedProfit || 0) + (d.totalExpenses || 0);
}

/** ▲ 12 % — green when the movement is good, red when not. */
function Delta({ now, before, goodWhen = 'up', suffix = '' }) {
  if (before === null || before === undefined || !before) return null;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  if (!Number.isFinite(pct) || pct === 0) return null;
  const up = pct > 0;
  const good = goodWhen === 'up' ? up : !up;
  return (
    <span className={`text-[11px] font-semibold tabular-nums ${good ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)} %{suffix}
    </span>
  );
}

function Stat({ label, value, delta, hint }) {
  return (
    <div className="min-w-0 flex-1 px-3.5 first:pl-0 last:pr-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-gray-900 truncate">{value}</p>
      <div className="mt-0.5 min-h-4 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-400">{delta}{hint}</div>
    </div>
  );
}

function ActionPill({ icon, children, onClick, to }) {
  const cls = 'flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 active:bg-gray-50 hover:bg-gray-50';
  const inner = <><Icon name={icon} className="w-[18px] h-[18px] text-violet-600" />{children}</>;
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function ResumenTab({ period, dateRange, categories, refreshTrigger, onTodayRevenue, onViewExpenses, onAddExpense }) {
  const [data, setData] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [toReview, setToReview] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDays, setShowDays] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setPage(0);
    const prev = shiftRange(period, dateRange, -1);
    try {
      const [{ data: d }, prevRes, invRes] = await Promise.all([
        api.get(`/revenue/dashboard?from=${dateRange.from}&to=${dateRange.to}`),
        api.get(`/revenue/dashboard?from=${prev.from}&to=${prev.to}`).catch(() => null),
        api.get('/invoices').catch(() => null),
      ]);
      setData(d);
      setPrevious(prevRes?.data || null);
      setToReview((invRes?.data || []).filter((i) => i.status === 'REVIEW' || i.status === 'FAILED').length);
    } catch { /* handled below */ }
    finally { setLoading(false); }
  }, [period, dateRange.from, dateRange.to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshTrigger > 0) load(); }, [refreshTrigger]); // eslint-disable-line

  const saveActual = async (date, actualRevenue) => {
    try {
      await api.put('/revenue/actual', { date, actualRevenue });
      load();
    } catch { /* ignore */ }
  };

  const saveTicketAverage = async (ticketAverage) => {
    try {
      await api.put('/revenue/ticket-average', { ticketAverage });
      load();
    } catch { /* ignore */ }
  };

  if (loading && !data) return <Loading />;
  if (!data) return <Empty>No se pudieron cargar los datos.</Empty>;

  const appt = data.mode === 'appointments';
  const income = incomeOf(data);
  const expenses = data.totalExpenses || 0;
  const profit = income - expenses;
  const prevIncome = incomeOf(previous);
  const prevExpenses = previous ? previous.totalExpenses || 0 : null;
  const prevProfit = previous ? prevIncome - prevExpenses : null;
  const vs = previousLabel(period, dateRange);
  const margin = income > 0 ? Math.round((profit / income) * 100) : null;
  const verb = appt ? 'facturado' : 'ingresado';
  const empty = income === 0 && expenses === 0;
  const diff = previous && (prevIncome || prevExpenses) ? profit - prevProfit : null;

  const sentence = empty
    ? 'Aún no hay movimientos en este periodo.'
    : profit >= 0
      ? `Has ${verb} ${fmtEur(income)} y gastado ${fmtEur(expenses)}: te quedan ${fmtEur(profit)}${margin !== null ? ` (${margin} % de margen)` : ''}.`
      : `Has gastado ${fmtEur(expenses)} y ${verb} ${fmtEur(income)}: te faltan ${fmtEur(-profit)} para cubrir los gastos.`;

  const visibleDays = data.days.filter((day) => {
    const count = appt ? day.appointments : day.covers;
    return day.date === toIso() || count > 0 || day.estimatedRevenue > 0 || day.actualRevenue !== null;
  });
  const pageCount = Math.ceil(visibleDays.length / PAGE_SIZE);
  const slice = visibleDays.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const cats = data.expensesByCategory;
  const topCats = cats.slice(0, 5);
  const otherAmount = cats.slice(5).reduce((sum, item) => sum + item.amount, 0);
  const catRows = [...topCats.map((c) => ({ key: c.category, label: catLabel(categories, c.category), cls: barColor(categories, c.category), amount: c.amount })),
    ...(otherAmount > 0 ? [{ key: '__other', label: 'Otros', cls: 'bg-slate-300', amount: otherAmount }] : [])];
  const catTotal = catRows.reduce((s, r) => s + r.amount, 0) || 1;

  return (
    <div className={`space-y-7 ${loading ? 'opacity-60' : ''}`}>
      {/* Hero: how much is left, in one sentence */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Te queda</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className={`text-4xl font-semibold tracking-tight tabular-nums ${profit < 0 ? 'text-rose-600' : profit > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
            {fmtEur(profit)}
          </p>
          {diff !== null && diff !== 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              {diff > 0 ? '▲ +' : '▼ −'}{fmtEur(Math.abs(diff)).replace('−', '')} vs {vs}
            </span>
          )}
        </div>
        <p className="mt-2 text-[15px] leading-6 text-gray-600">{sentence}</p>

        <div className="mt-5 flex divide-x divide-gray-100 border-t border-gray-100 pt-4">
          <Stat label={appt ? 'Facturado' : 'Ingresos'} value={fmtEur(income)} delta={<Delta now={income} before={prevIncome} />} hint={appt ? `${data.appointments} ${data.appointments === 1 ? 'cita' : 'citas'}` : null} />
          <Stat label="Gastos" value={fmtEur(expenses)} delta={<Delta now={expenses} before={prevExpenses} goodWhen="down" />} />
          {appt
            ? <Stat label="Cobrado" value={fmtEur(data.collectedRevenue || 0)} hint="en caja" />
            : <Stat label="Comensales" value={data.totalCovers} hint={<span><TicketAverageEdit value={data.ticketAverage} onSave={saveTicketAverage} /> / comensal</span>} />}
        </div>
      </section>

      <div className="flex gap-2.5">
        <ActionPill icon="camera" to="/compras/facturas/nueva">Subir factura</ActionPill>
        <ActionPill icon="plus" onClick={onAddExpense}>Añadir gasto</ActionPill>
      </div>

      {toReview > 0 && (
        <Link to="/compras/facturas" className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 active:bg-amber-100">
          <span className="w-9 h-9 rounded-xl bg-white text-amber-600 flex items-center justify-center shrink-0"><Icon name="receipt" className="w-5 h-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-gray-900">{toReview} {toReview === 1 ? 'factura por revisar' : 'facturas por revisar'}</span>
            <span className="block text-[13px] text-gray-600">Confírmalas para que cuenten en tus gastos.</span>
          </span>
          <Icon name="right" className="w-4 h-4 text-amber-500" strokeWidth={2} />
        </Link>
      )}

      {/* Where the money goes */}
      <Section title="En qué se va el dinero" aside={cats.length > 0 && <SectionLink onClick={onViewExpenses}>Ver gastos</SectionLink>}>
        {cats.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Sin gastos en este periodo.</p>
        ) : (
          <>
            <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Reparto de gastos por categoría">
              {catRows.map((r) => <span key={r.key} className={`${r.cls} first:rounded-l-full last:rounded-r-full`} style={{ width: `${(r.amount / catTotal) * 100}%` }} />)}
            </div>
            <ul className="mt-1 divide-y divide-gray-100">
              {catRows.map((r) => (
                <li key={r.key}>
                  <button type="button" onClick={onViewExpenses} className="w-full py-3 flex items-center gap-2.5 text-left">
                    <Dot cls={r.cls} />
                    <span className="min-w-0 flex-1 truncate text-[15px] text-gray-800">{r.label}</span>
                    <span className="text-xs tabular-nums text-gray-400">{Math.round((r.amount / catTotal) * 100)} %</span>
                    <span className="w-24 text-right text-[15px] font-semibold tabular-nums text-gray-900">{fmtEur(r.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {appt && <Link to="/personal" className="mt-2 inline-flex text-[13px] font-semibold text-violet-700 hover:text-violet-900">Ver rendimiento del equipo →</Link>}
      </Section>

      {/* Day by day, tucked away */}
      <Section title="Día a día" aside={<SectionLink onClick={() => setShowDays((v) => !v)}>{showDays ? 'Ocultar' : 'Ver detalle'}</SectionLink>}>
        {!showDays ? (
          <p className="py-1 text-[13px] text-gray-500">Lo facturado y lo cobrado cada día; desde aquí puedes corregir un cobro.</p>
        ) : visibleDays.length === 0 ? (
          <Empty>Sin días en este periodo.</Empty>
        ) : (
          <>
            <div className="flex justify-end pb-1"><SectionLink onClick={onTodayRevenue}>+ Ingreso de hoy</SectionLink></div>
            <TableHead cols={[
              ['Día', 'col-span-4'],
              [appt ? 'Citas' : 'Comensales', 'col-span-2 text-right'],
              [appt ? 'En citas' : 'Estimado', 'col-span-3 text-right'],
              ['Cobrado', 'col-span-3 text-right'],
            ]} />
            <ul className="divide-y divide-gray-100">
              {slice.map((day) => {
                const count = appt ? day.appointments : day.covers;
                return (
                  <li key={day.date} className="px-2 py-2 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4">
                    <div className="min-w-0 flex-1 md:col-span-4">
                      <p className="text-[15px] font-medium text-gray-900 first-letter:uppercase">{fmtDay(day.date)}</p>
                      <p className="text-[13px] text-gray-500 md:hidden">
                        {count ? `${count} ${appt ? (count === 1 ? 'cita' : 'citas') : 'comensales'}` : appt ? 'Sin citas' : 'Sin reservas'}
                        {day.estimatedRevenue > 0 && ` · ${fmtEur(day.estimatedRevenue)} ${appt ? 'facturados' : 'estimado'}`}
                      </p>
                    </div>
                    <span className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-600">{count || '—'}</span>
                    <span className="hidden md:block md:col-span-3 text-right text-sm tabular-nums text-gray-600">{day.estimatedRevenue > 0 ? fmtEur(day.estimatedRevenue) : '—'}</span>
                    <div className="shrink-0 md:col-span-3 text-right">
                      <InlineRevenueEdit date={day.date} value={day.actualRevenue} source={appt ? day.actualSource : null} onSave={(v) => saveActual(day.date, v)} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} pageCount={pageCount} setPage={setPage} />
          </>
        )}
      </Section>
    </div>
  );
}

// ── Recurring scope dialog ────────────────────────────────────────────────────

const SCOPE_OPTIONS = {
  edit: [
    { value: 'single', label: 'Solo este',            desc: 'Modifica únicamente este registro' },
    { value: 'future', label: 'Este y los siguientes', desc: 'Actualiza este y todos los futuros de la misma plantilla' },
    { value: 'all',    label: 'Todos',                desc: 'Actualiza todos los registros vinculados a esta plantilla' },
  ],
  delete: [
    { value: 'single', label: 'Solo este',            desc: 'Elimina únicamente este registro' },
    { value: 'future', label: 'Este y los siguientes', desc: 'Elimina este y los futuros; la plantilla se borrará' },
    { value: 'all',    label: 'Todos',                desc: 'Elimina todos los registros de la plantilla y la propia plantilla' },
  ],
};

function RecurringScopeDialog({ mode, onConfirm, onClose }) {
  const [scope, setScope] = useState('single');
  const isDelete = mode === 'delete';
  const options = SCOPE_OPTIONS[mode];

  return (
    <Modal
      title={isDelete ? 'Eliminar gasto recurrente' : 'Editar gasto recurrente'}
      subtitle="¿A qué registros se aplica?"
      onClose={onClose}
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnCancel}>Cancelar</button>
          <button type="button" onClick={() => onConfirm(scope)} className={isDelete ? btnDanger : btnSubmit}>
            {isDelete ? 'Eliminar' : 'Continuar'}
          </button>
        </div>
      )}
    >
      <ul className="divide-y divide-gray-100 -my-2">
        {options.map((opt) => (
          <li key={opt.value}>
            <label className="flex items-start gap-3 py-3 px-2 -mx-2 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="radio" name="scope" value={opt.value} checked={scope === opt.value}
                onChange={() => setScope(opt.value)}
                className="mt-1 accent-violet-600"
              />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-gray-900">{opt.label}</p>
                <p className="text-[13px] text-gray-500">{opt.desc}</p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          aria-label={c.label}
          onClick={() => onChange(c.value)}
          className={`w-6 h-6 rounded-full ${c.cls} transition-transform hover:scale-110 ${
            value === c.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
          }`}
        />
      ))}
    </div>
  );
}

function CategoryForm({ form, setForm, onSave, onCancel, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="py-3 space-y-3">
      <input autoFocus type="text" value={form.label}
        onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } if (e.key === 'Escape') onCancel?.(); }}
        className={inputCls + ' sm:max-w-sm'} placeholder="Nombre de la categoría" />
      <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
      <div className="flex gap-2">
        <button type="button" onClick={onSave} disabled={saving || !form.label.trim()} className={btnSubmit}>{saveLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className={btnCancel}>Cancelar</button>}
      </div>
    </div>
  );
}

function CategoryManagerModal({ onClose, onRefresh, inline = false }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ label: '', color: 'slate' });
  const [newForm, setNewForm] = useState({ label: '', color: 'slate' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCats(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditForm({ label: cat.label, color: cat.color || 'slate' });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/categories/${id}`, editForm);
      setEditingId(null);
      load();
      onRefresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Los gastos ya registrados conservarán el valor.')) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
      onRefresh();
    } catch { /* ignore */ }
  };

  const addNew = async (e) => {
    e?.preventDefault();
    if (!newForm.label.trim()) return;
    setSaving(true);
    try {
      await api.post('/categories', newForm);
      setNewForm({ label: '', color: 'slate' });
      setEditingId(null);
      load();
      onRefresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const list = loading ? <Loading /> : (
    <ul className="divide-y divide-gray-100">
      {inline && editingId === '__new__' && (
        <li>
          <CategoryForm form={newForm} setForm={setNewForm} onSave={addNew} onCancel={() => setEditingId(null)} saving={saving} saveLabel="Añadir" />
        </li>
      )}
      {cats.map((cat) => {
        const isStaff = cat.value === 'staff';
        const isAutomatic = isStaff || cat.value === 'commissions';
        if (editingId === cat._id) {
          return (
            <li key={cat._id}>
              <CategoryForm form={editForm} setForm={setEditForm} onSave={() => saveEdit(cat._id)} onCancel={() => setEditingId(null)} saving={saving} />
            </li>
          );
        }
        return (
          <li key={cat._id} className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-gray-50">
            <Dot cls={COLOR_DOT[cat.color] || 'bg-slate-400'} size="w-3 h-3" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">{cat.label}</span>
            {isAutomatic
              ? <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800">Automática</span>
              : !cat.isDefault
                ? <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800">Personalizada</span>
                : null}
            {isAutomatic ? <span className="w-8 shrink-0" /> : (
              <RowMenu items={[
                { label: 'Editar', onClick: () => startEdit(cat) },
                { label: 'Eliminar', danger: true, onClick: () => deleteCat(cat._id) },
              ]} />
            )}
          </li>
        );
      })}
    </ul>
  );

  // ── Inline view (used as a tab) ──────────────────────────────────────────────
  if (inline) {
    return (
      <Section title="Categorías de gasto"
        aside={<SectionLink onClick={() => { setEditingId('__new__'); setNewForm({ label: '', color: 'slate' }); }}>+ Nueva categoría</SectionLink>}>
        {list}
      </Section>
    );
  }

  // ── Modal view ───────────────────────────────────────────────────────────────
  return (
    <Modal title="Categorías" onClose={onClose} size="md">
      <div className="space-y-6">
        {list}
        <Section title="Nueva categoría">
          <CategoryForm form={newForm} setForm={setNewForm} onSave={addNew} saving={saving} saveLabel="Añadir categoría" />
        </Section>
      </div>
    </Modal>
  );
}

// ── Expense modal ─────────────────────────────────────────────────────────────

function ExpenseModal({ expense, suppliers, categories, onSave, onClose, scope = 'single' }) {
  const editing = !!expense?._id;
  const [form, setForm] = useState({
    category:    expense?.category || '',
    amount:      expense?.amount != null ? String(expense.amount) : '',
    expenseDate: expense?.expenseDate || toIso(),
    supplierId:  expense?.supplierId?._id || expense?.supplierId || '',
    notes:       expense?.notes || '',
    isRecurring: expense?.isRecurring || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find((s) => s._id === supplierId);
    setForm((f) => ({
      ...f,
      supplierId,
      category: supplier ? supplier.category : '',
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) return setError('Elige una categoría');
    const parsedAmount = parseFloat(String(form.amount).replace(',', '.'));
    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0) return setError('El importe debe ser mayor que 0');
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: parsedAmount };
      if (editing) {
        await api.put(`/expenses/${expense._id}`, { ...payload, scope });
      } else {
        await api.post('/expenses', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      onClose={onClose}
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnCancel}>Cancelar</button>
          <button type="submit" form="expense-form" disabled={saving} className={btnSubmit}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </div>
      )}
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        <FormField label="Importe (€)" required>
          <input autoFocus type="number" min="0.01" step="0.01" value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={amountCls} inputMode="decimal" placeholder="0,00" />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Fecha" required>
            <input type="date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)}
              className={inputCls + ' appearance-none bg-white'} />
          </FormField>
          <FormField label="Proveedor">
            <select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className={selectCls}>
              <option value="">Sin proveedor</option>
              {suppliers.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Categoría" required>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={selectCls}>
            <option value="">Elegir…</option>
            {categories.filter((c) => !['staff', 'commissions'].includes(c.value)).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="Notas">
          <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} placeholder="Opcional" />
        </FormField>

        {!editing && (
          <div className="flex items-center justify-between gap-3 py-1">
            <div>
              <p className="text-sm font-medium text-gray-900">Se repite cada mes</p>
              <p className="text-[13px] text-gray-500">Se apunta solo el mismo día de cada mes.</p>
            </div>
            <Toggle on={form.isRecurring} onChange={(v) => set('isRecurring', v)} label="Gasto recurrente mensual" />
          </div>
        )}

        {error && <p className={errorCls}>{error}</p>}
      </form>
    </Modal>
  );
}

// ── Gastos tab ────────────────────────────────────────────────────────────────

function GastosTab({ dateRange, suppliers, categories, refreshTrigger, onCreate, onCategoriesChanged }) {
  const navigate = useNavigate();
  const [subView, setSubView] = useState('list'); // 'list' | 'recurrentes' | 'categorias'
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);       // null | { expense?, scope? }
  const [scopeDialog, setScopeDialog] = useState(null); // null | { mode: 'edit'|'delete', expense }
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const { data } = await api.get(`/expenses?${params}`);
      setExpenses(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshTrigger > 0) load(); }, [refreshTrigger]); // eslint-disable-line

  // Delete with scope support
  const handleDelete = async (id, scope = 'single') => {
    setDeleting(id);
    try {
      await api.delete(`/expenses/${id}?scope=${scope}`);
      if (scope === 'single') {
        setExpenses((prev) => prev.filter((e) => e._id !== id));
      } else {
        load();
      }
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const handleEditClick = (exp) => {
    if (exp.sourceType === 'AUTOMATIC') return;
    if (exp.sourceType === 'INVOICE') {
      const invoiceId = exp.invoiceId?._id || exp.invoiceId || exp.sourceId;
      if (invoiceId) navigate(`/compras/facturas/${invoiceId}`);
      return;
    }
    if (exp.isRecurring) {
      setScopeDialog({ mode: 'edit', expense: exp });
    } else {
      setModal({ expense: exp });
    }
  };

  const handleDeleteClick = (exp) => {
    if (exp.isRecurring) {
      setScopeDialog({ mode: 'delete', expense: exp });
    } else {
      if (window.confirm('¿Eliminar este gasto?')) handleDelete(exp._id);
    }
  };

  const handleScopeConfirm = (scope) => {
    const { mode, expense } = scopeDialog;
    setScopeDialog(null);
    if (mode === 'edit') {
      setModal({ expense, scope });
    } else {
      handleDelete(expense._id, scope);
    }
  };

  const totalFiltered = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const automaticTotal = expenses.filter((e) => e.sourceType === 'AUTOMATIC').reduce((s, e) => s + (e.amount || 0), 0);
  const registeredTotal = totalFiltered - automaticTotal;
  const displayedExpenses = expenses.filter((expense) => {
    if (filter === 'automatic') return expense.sourceType === 'AUTOMATIC';
    if (filter === 'invoices') return expense.sourceType === 'INVOICE';
    if (filter === 'manual') return !['AUTOMATIC', 'INVOICE'].includes(expense.sourceType);
    return true;
  });

  if (subView === 'recurrentes' || subView === 'categorias') {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setSubView('list')}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
          <Icon name="left" className="w-4 h-4" strokeWidth={2} />Gastos
        </button>
        {subView === 'recurrentes'
          ? <RecurrentesTab categories={categories} suppliers={suppliers} />
          : <CategoryManagerModal inline onRefresh={onCategoriesChanged} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Gastos del periodo</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums text-gray-900">{fmtEur(totalFiltered)}</p>
            <p className="mt-1 text-[13px] text-gray-500 tabular-nums">Automáticos {fmtEur(automaticTotal)} · Registrados {fmtEur(registeredTotal)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button type="button" onClick={() => setSubView('recurrentes')} className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-600 hover:text-violet-700">
              <Icon name="clock" className="w-4 h-4" />Recurrentes →
            </button>
            <button type="button" onClick={() => setSubView('categorias')} className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-600 hover:text-violet-700">
              <Icon name="list" className="w-4 h-4" />Categorías →
            </button>
          </div>
        </div>
        {expenses.length > 0 && (
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {[
              ['all', 'Todos'], ['manual', 'Manuales'], ['invoices', 'Facturas'], ['automatic', 'Automáticos'],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && expenses.length === 0 ? <Loading /> : expenses.length === 0 ? (
        <Empty action={<SectionLink onClick={onCreate}>+ Añadir gasto</SectionLink>}>No hay gastos en este periodo.</Empty>
      ) : displayedExpenses.length === 0 ? (
        <Empty>No hay gastos de este tipo en el periodo.</Empty>
      ) : (
        <div className={loading ? 'opacity-60' : ''}>
          <TableHead cols={[
            ['Fecha', 'col-span-2'],
            ['Categoría', 'col-span-3'],
            ['Proveedor', 'col-span-2'],
            ['Notas', 'col-span-3'],
            ['Importe', 'col-span-2 text-right pr-10'],
          ]} />
          <ul className="divide-y divide-gray-100">
            {displayedExpenses.map((exp) => {
              const supplier = exp.supplierId?.name;
              const label = catLabel(categories, exp.category);
              const automatic = exp.sourceType === 'AUTOMATIC';
              return (
                <li key={exp._id}>
                  <div role={automatic ? undefined : 'button'} tabIndex={automatic ? undefined : 0} onClick={() => handleEditClick(exp)}
                    onKeyDown={automatic ? undefined : (e) => { if (e.key === 'Enter') handleEditClick(exp); }}
                    className={`px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl ${automatic ? '' : 'cursor-pointer hover:bg-gray-50'} ${deleting === exp._id ? 'opacity-50' : ''}`}>
                    <span className="hidden md:block md:col-span-2 text-sm text-gray-600 tabular-nums first-letter:uppercase">{fmtDay(exp.expenseDate)}</span>
                    {/* Mobile: one title + subtitle */}
                    <div className="min-w-0 flex-1 md:hidden">
                      <p className="text-[15px] font-medium text-gray-900 truncate flex items-center gap-2">
                        <Dot cls={catDot(categories, exp.category)} size="w-2 h-2" />
                        <span className="truncate">{supplier || label}</span>
                        {exp.isRecurring && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Mensual</span>}
                        {exp.sourceType === 'INVOICE' && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800 shrink-0">Factura</span>}
                        {automatic && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Automático</span>}
                      </p>
                      <p className="text-[13px] text-gray-500 truncate">
                        {[fmtShort(exp.expenseDate), supplier ? label : null, exp.sourceType === 'INVOICE' ? `Factura ${exp.invoiceId?.invoiceNumber || ''}`.trim() : automatic ? label : exp.isRecurring ? 'Recurrente' : 'Manual', exp.notes].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="hidden md:flex md:col-span-3 items-center gap-2 min-w-0">
                      <Dot cls={catDot(categories, exp.category)} size="w-2 h-2" />
                      <span className="text-sm font-medium text-gray-900 truncate">{label}</span>
                      {exp.isRecurring && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Mensual</span>}
                      {exp.sourceType === 'INVOICE' && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800 shrink-0">Factura</span>}
                      {automatic && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Automático</span>}
                    </div>
                    <span className="hidden md:block md:col-span-2 text-sm text-gray-600 truncate">{supplier || <span className="text-gray-300">—</span>}</span>
                    <span className="hidden md:block md:col-span-3 text-sm text-gray-500 truncate">{exp.notes || <span className="text-gray-300">—</span>}</span>
                    <div className="shrink-0 md:col-span-2 flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{fmtEur(exp.amount)}</span>
                      {!automatic && <RowMenu items={exp.sourceType === 'INVOICE'
                        ? [{ label: 'Ver factura', onClick: () => handleEditClick(exp) }]
                        : [{ label: 'Editar', onClick: () => handleEditClick(exp) }, { label: 'Eliminar', danger: true, disabled: deleting === exp._id, onClick: () => handleDeleteClick(exp) }]} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Scope picker — shown before edit/delete on recurring expenses */}
      {scopeDialog && (
        <RecurringScopeDialog
          mode={scopeDialog.mode}
          onConfirm={handleScopeConfirm}
          onClose={() => setScopeDialog(null)}
        />
      )}

      {modal !== null && (
        <ExpenseModal
          expense={modal.expense}
          scope={modal.scope}
          suppliers={suppliers}
          categories={categories}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Recurrentes (inside Gastos) ───────────────────────────────────────────────

function RecurrentesTab({ categories }) {
  const [gastos, setGastos]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses/templates');
      setGastos(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMensual = gastos.reduce((s, g) => s + (g.amount || 0), 0);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {gastos.length > 0 && (
        <FigureLine items={[
          { label: 'al mes', value: fmtEur(totalMensual) },
          { label: gastos.length === 1 ? 'gasto recurrente' : 'gastos recurrentes', value: gastos.length },
        ]} />
      )}

      <Section title="Gastos recurrentes">
        {gastos.length === 0 ? (
          <Empty>No hay gastos recurrentes. Marca «Se repite cada mes» al apuntar un gasto.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {gastos.map((g) => {
              const supplierName = g.supplierId?.name;
              return (
                <li key={g._id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[15px] font-semibold text-gray-900 leading-none tabular-nums">{g.dayOfMonth}</span>
                    <span className="text-[9px] font-semibold text-gray-500 leading-none mt-0.5 uppercase tracking-wide">día</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 truncate flex items-center gap-2">
                      <Dot cls={catDot(categories, g.category)} size="w-2 h-2" />
                      <span className="truncate">{catLabel(categories, g.category)}</span>
                    </p>
                    <p className="text-[13px] text-gray-500 truncate">
                      {[supplierName, g.notes].filter(Boolean).join(' · ') || 'Sin proveedor'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {fmtEur(g.amount)}<span className="text-[13px] font-normal text-gray-500"> /mes</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ── Supplier modal ────────────────────────────────────────────────────────────

function SupplierModal({ supplier, categories, onSave, onClose }) {
  const editing = !!supplier?._id;
  const [form, setForm] = useState({
    name: supplier?.name || '',
    category: supplier?.category || 'other',
    contactName: supplier?.contactName || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    notes: supplier?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/suppliers/${supplier._id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
      onClose={onClose}
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnCancel}>Cancelar</button>
          <button type="submit" form="supplier-form" disabled={saving} className={btnSubmit}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir proveedor'}
          </button>
        </div>
      )}
    >
      <form id="supplier-form" onSubmit={submit} className="space-y-4">
        <FormField label="Nombre" required>
          <input autoFocus type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
            className={inputCls} placeholder="Nombre del proveedor" />
        </FormField>
        <FormField label="Categoría">
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={selectCls}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <Section title="Contacto" className="pt-2">
          <div className="space-y-4">
            <FormField label="Persona de contacto">
              <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)}
                className={inputCls} placeholder="Nombre y apellidos" />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Teléfono">
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  className={inputCls} placeholder="612 345 678" />
              </FormField>
              <FormField label="Email">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={inputCls} placeholder="proveedor@ejemplo.com" />
              </FormField>
            </div>
            <FormField label="Notas">
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                className={inputCls} rows={2} placeholder="Condiciones de pago, días de entrega…" />
            </FormField>
          </div>
        </Section>
        {error && <p className={errorCls}>{error}</p>}
      </form>
    </Modal>
  );
}

// ── Proveedores tab ───────────────────────────────────────────────────────────

function ProveedoresTab({ suppliers, loadSuppliers, categories }) {
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); setSupplierDetail(null); return; }
    setExpanded(id);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/suppliers/${id}/expenses`);
      setSupplierDetail(data);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const toggleActive = async (supplier) => {
    try {
      await api.put(`/suppliers/${supplier._id}`, { isActive: !supplier.isActive });
      loadSuppliers();
    } catch { /* ignore */ }
  };

  return (
    <Section title="Proveedores" aside={<SectionLink onClick={() => setModal({})}>+ Nuevo proveedor</SectionLink>}>
      {suppliers.length === 0 ? (
        <Empty action={<SectionLink onClick={() => setModal({})}>+ Añadir el primero</SectionLink>}>Aún no hay proveedores.</Empty>
      ) : (
        <>
          <TableHead cols={[
            ['Nombre', 'col-span-4'],
            ['Categoría', 'col-span-3'],
            ['Contacto', 'col-span-3'],
            ['Activo', 'col-span-2 text-right pr-10'],
          ]} />
          <ul className="divide-y divide-gray-100">
            {suppliers.map((s) => {
              const open = expanded === s._id;
              const contact = [s.contactName, s.phone].filter(Boolean).join(' · ');
              return (
                <Fragment key={s._id}>
                  <li>
                    <div role="button" tabIndex={0} aria-expanded={open} onClick={() => toggleExpand(s._id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(s._id); }}
                      className="px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl cursor-pointer hover:bg-gray-50">
                      <div className="min-w-0 flex-1 md:col-span-4 flex items-center gap-2">
                        <Icon name="right" strokeWidth={2} className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                        <div className="min-w-0">
                          <p className={`text-[15px] font-medium truncate ${s.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{s.name}</p>
                          <p className="text-[13px] text-gray-500 truncate md:hidden">
                            {[catLabel(categories, s.category), contact].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <span className="hidden md:block md:col-span-3 text-sm text-gray-600 truncate">{catLabel(categories, s.category)}</span>
                      <span className="hidden md:block md:col-span-3 text-sm text-gray-600 truncate">{contact || <span className="text-gray-300">—</span>}</span>
                      <div className="shrink-0 md:col-span-2 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Toggle on={s.isActive} onChange={() => toggleActive(s)} label={s.isActive ? 'Activo' : 'Inactivo'} />
                        <RowMenu items={[
                          { label: 'Editar', onClick: () => setModal({ supplier: s }) },
                          { label: open ? 'Ocultar gastos' : 'Ver gastos', onClick: () => toggleExpand(s._id) },
                        ]} />
                      </div>
                    </div>
                  </li>
                  {open && (
                    <li className="pl-8 pr-2 pb-4 pt-1">
                      {detailLoading ? (
                        <p className="text-sm text-gray-400 py-2">Cargando gastos…</p>
                      ) : supplierDetail ? (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                            Últimos gastos · total <span className="text-gray-700 tabular-nums">{fmtEur(supplierDetail.total)}</span>
                          </p>
                          {supplierDetail.expenses.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">Sin gastos de este proveedor.</p>
                          ) : (
                            <ul className="divide-y divide-gray-100">
                              {supplierDetail.expenses.slice(0, 5).map((e) => (
                                <li key={e._id} className="flex items-center gap-3 py-2 text-sm">
                                  <span className="w-14 shrink-0 text-gray-500 tabular-nums">{fmtShort(e.expenseDate)}</span>
                                  <span className="flex-1 min-w-0 truncate text-gray-700">{catLabel(categories, e.category)}{e.notes && ` · ${e.notes}`}</span>
                                  <span className="font-semibold tabular-nums text-gray-900">{fmtEur(e.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {supplierDetail.expenses.length > 5 && (
                            <p className="text-xs text-gray-400 mt-1">Y {supplierDetail.expenses.length - 5} más en Gastos.</p>
                          )}
                        </>
                      ) : null}
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        </>
      )}

      {modal !== null && (
        <SupplierModal
          supplier={modal.supplier}
          categories={categories}
          onSave={() => { setModal(null); loadSuppliers(); setExpanded(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </Section>
  );
}

// ── Revenue modal (Ingreso de hoy + per-day clicks) ───────────────────────────

function RevenueModal({ date = toIso(), initialValue = null, onClose, onSave }) {
  const [amount, setAmount] = useState(initialValue !== null ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (valueToSave) => {
    setSaving(true); setError('');
    try {
      await api.put('/revenue/actual', { date, actualRevenue: valueToSave });
      onSave(valueToSave);
    } catch {
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const num = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num) || num <= 0) return setError('Escribe un importe válido');
    save(num);
  };

  const isToday = date === toIso();
  const hasValue = initialValue !== null && initialValue !== undefined;

  return (
    <Modal
      title={isToday ? 'Ingreso de hoy' : 'Ingreso del día'}
      subtitle={fmtDay(date)}
      onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-2">
          {hasValue ? (
            <button type="button" disabled={saving} onClick={() => save(null)}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50">
              Borrar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnCancel}>Cancelar</button>
            <button type="submit" form="revenue-form" disabled={saving} className={btnSubmit}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    >
      <form id="revenue-form" onSubmit={submit} className="space-y-3">
        <FormField label="Lo que entró ese día (€)" required>
          <input autoFocus type="text" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className={amountCls} placeholder="0,00" />
        </FormField>
        {error && <p className={errorCls}>{error}</p>}
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  ['dashboard', 'Resumen'],
  ['expenses',  'Gastos'],
];

export default function Finanzas() {
  const [tab, setTab] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState(getMonthRange());
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quickAction, setQuickAction] = useState(null); // null | 'revenue' | 'expense'
  const [refresh, setRefresh] = useState(0);

  useSetMobileHeader({ title: 'Finanzas', action: { label: 'Gasto', onClick: () => setQuickAction('expense') } });

  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch { /* ignore */ }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSuppliers(); loadCategories(); }, [loadSuppliers, loadCategories]);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (p === 'week') setDateRange(getWeekRange());
    if (p === 'month') setDateRange(getMonthRange());
  };

  const shiftPeriod = (direction) => setDateRange(shiftRange(period, dateRange, direction));

  const usesPeriod = true;

  return (
    <div className="w-full space-y-5" style={{ overflowX: 'clip' }}>
      <PageHeader
        title="Finanzas"
        subtitle="Cuánto ganas, en qué gastas y qué te queda."
        actions={<PrimaryButton onClick={() => setQuickAction('expense')}>Nuevo gasto</PrimaryButton>}
      />

      <div className="space-y-3">
        {usesPeriod && (
          <PeriodNavigator
            period={period}
            dateRange={dateRange}
            onPeriodChange={handlePeriodChange}
            onShift={shiftPeriod}
            onRangeChange={(range) => { setPeriod('custom'); setDateRange(range); }}
          />
        )}
        <Tabs full value={tab} options={TABS} onChange={setTab} />
      </div>

      {tab === 'dashboard' && <ResumenTab period={period} dateRange={dateRange} categories={categories} refreshTrigger={refresh} onTodayRevenue={() => setQuickAction('revenue')} onViewExpenses={() => setTab('expenses')} onAddExpense={() => setQuickAction('expense')} />}
      {tab === 'expenses'  && <GastosTab dateRange={dateRange} suppliers={suppliers} categories={categories} refreshTrigger={refresh} onCreate={() => setQuickAction('expense')} onCategoriesChanged={loadCategories} />}

      {quickAction === 'revenue' && (
        <RevenueModal
          onClose={() => setQuickAction(null)}
          onSave={() => { setQuickAction(null); setRefresh((n) => n + 1); }}
        />
      )}
      {quickAction === 'expense' && (
        <ExpenseModal
          suppliers={suppliers}
          categories={categories}
          onSave={() => { setQuickAction(null); setRefresh((n) => n + 1); }}
          onClose={() => setQuickAction(null)}
        />
      )}
    </div>
  );
}
