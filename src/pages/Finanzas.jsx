import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import {
  PageHeader, PrimaryButton, GhostButton, Tabs, Segmented, Section, SectionLink, FigureLine, BigFigure, Empty, Toggle,
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

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today); mon.setDate(today.getDate() + diff);
  const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
  return { from: toIso(mon), to: toIso(sun) };
}

function getMonthRange() {
  const today = new Date();
  return {
    from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
    to:   toIso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
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

const PERIODS = [['week', 'Semana'], ['month', 'Mes'], ['custom', 'Fechas']];

function PeriodSelector({ period, onChange }) {
  return <Segmented size="sm" value={period} options={PERIODS} onChange={onChange} />;
}

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

// ── Resumen tab ───────────────────────────────────────────────────────────────

function InlineRevenueEdit({ date, value, source, onSave }) {
  const [modal, setModal] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setModal(true)}
        className={`inline-flex flex-col items-end px-2 py-1 -mr-2 rounded-lg transition-colors ${value !== null ? 'hover:bg-gray-100' : 'hover:bg-violet-50'}`}>
        {value !== null
          ? <span className="text-sm font-semibold tabular-nums text-gray-900">{fmtEur(value)}</span>
          : <span className="text-[13px] font-semibold text-violet-700">Añadir</span>}
        {source && <span className="text-[11px] text-gray-400 leading-4">{source === 'till' ? 'caja' : 'a mano'}</span>}
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

function ResumenTab({ dateRange, categories, refreshTrigger, onTodayRevenue }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setPage(0);
    try {
      const { data: d } = await api.get(`/revenue/dashboard?from=${dateRange.from}&to=${dateRange.to}`);
      setData(d);
    } catch { /* handled below */ }
    finally { setLoading(false); }
  }, [dateRange.from, dateRange.to]);

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
  const maxExpense = data.expensesByCategory[0]?.amount || 1;
  const totalExpensesSum = data.expensesByCategory.reduce((s, c) => s + c.amount, 0) || 1;

  // The income the profit is computed from (real, estimated or a mix).
  const income = (data.estimatedProfit || 0) + (data.totalExpenses || 0);
  const barMax = Math.max(income, data.totalExpenses || 0, 1);
  const basis = data.profitBasis === 'actual'
    ? (appt ? 'Con lo cobrado en caja' : 'Con los ingresos reales')
    : data.profitBasis === 'mixed' ? 'Con lo cobrado en caja y las citas de los días sin cobros'
      : appt ? 'Con lo facturado en citas' : 'Con la estimación por reservas';

  const pageCount = Math.ceil(data.days.length / PAGE_SIZE);
  const slice = data.days.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={`space-y-9 ${loading ? 'opacity-60' : ''}`}>
      {/* Hero: profit, then where it comes from */}
      <section className="space-y-5">
        <BigFigure
          label="Beneficio estimado"
          value={fmtEur(data.estimatedProfit)}
          tone={data.estimatedProfit < 0 ? 'bad' : data.estimatedProfit > 0 ? 'good' : undefined}
          sub={basis}
        />
        <div className="space-y-2 max-w-xl">
          {[
            ['Ingresos', income, 'bg-emerald-500'],
            ['Gastos', data.totalExpenses, 'bg-rose-400'],
          ].map(([label, value, cls]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-[13px] text-gray-500">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${cls}`} style={{ width: `${Math.max(0, Math.min(100, (value / barMax) * 100))}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">{fmtEur(value)}</span>
            </div>
          ))}
        </div>
        <FigureLine items={appt ? [
          { label: data.appointments === 1 ? 'cita atendida' : 'citas atendidas', value: data.appointments },
          { label: 'en citas', value: fmtEur(data.estimatedRevenue) },
          { label: data.tips ? `cobrado en caja · +${fmtEur(data.tips)} propinas` : 'cobrado en caja', value: data.actualRevenue !== null ? fmtEur(data.actualRevenue) : '—' },
          { label: 'ticket medio', value: fmtEur(data.averageTicket) },
        ] : [
          { label: 'comensales', value: data.totalCovers },
          { label: 'estimado por reservas', value: fmtEur(data.estimatedRevenue) },
          { label: data.actualRevenue !== null ? 'reales' : 'reales (sin datos)', value: data.actualRevenue !== null ? fmtEur(data.actualRevenue) : '—' },
          { label: 'por comensal', value: <TicketAverageEdit value={data.ticketAverage} onSave={saveTicketAverage} /> },
        ]} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-12 gap-y-9 items-start">
        <div className="space-y-9 min-w-0">
          {/* Daily breakdown */}
          <Section title="Ingresos por día" aside={<SectionLink onClick={onTodayRevenue}>+ Ingreso de hoy</SectionLink>}>
            <p className="text-[13px] text-gray-500 mb-3">
              {appt ? 'Lo cobrado en Caja aparece solo. Toca un importe para corregir un día a mano.' : 'Toca «Añadir» para apuntar lo que entró de verdad ese día.'}
            </p>
            {data.days.length === 0 ? (
              <Empty>Sin días en este periodo.</Empty>
            ) : (
              <>
                <TableHead cols={[
                  ['Día', 'col-span-4'],
                  [appt ? 'Citas' : 'Comensales', 'col-span-2 text-right'],
                  [appt ? 'En citas' : 'Estimado', 'col-span-3 text-right'],
                  ['Real', 'col-span-3 text-right'],
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
                            {day.estimatedRevenue > 0 && ` · ${fmtEur(day.estimatedRevenue)} ${appt ? 'en citas' : 'estimado'}`}
                          </p>
                        </div>
                        <span className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-600">{count || '—'}</span>
                        <span className="hidden md:block md:col-span-3 text-right text-sm tabular-nums text-gray-600">{day.estimatedRevenue > 0 ? fmtEur(day.estimatedRevenue) : '—'}</span>
                        <div className="shrink-0 md:col-span-3 text-right">
                          <InlineRevenueEdit
                            date={day.date}
                            value={day.actualRevenue}
                            source={appt ? day.actualSource : null}
                            onSave={(v) => saveActual(day.date, v)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Pager page={page} pageCount={pageCount} setPage={setPage} />
              </>
            )}
          </Section>

          {appt && data.byStaff?.length > 0 && (
            <Section title="Por profesional">
              <p className="text-[13px] text-gray-500 mb-3">Facturado en citas atendidas y productos, menos su sueldo y comisión. Se configura en Personal.</p>
              <TableHead cols={[
                ['Profesional', 'col-span-3'],
                ['Citas', 'col-span-1 text-right'],
                ['Facturado', 'col-span-2 text-right'],
                ['Sueldo', 'col-span-2 text-right'],
                ['Comisión', 'col-span-2 text-right'],
                ['Queda', 'col-span-2 text-right'],
              ]} />
              <ul className="divide-y divide-gray-100">
                {data.byStaff.map((p) => {
                  const leaves = p.leaves ?? (p.billed - p.commission);
                  const billed = p.billed + (p.products || 0);
                  return (
                    <li key={p.id} className="px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4">
                      <div className="min-w-0 flex-1 md:col-span-3">
                        <p className="text-[15px] font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-[13px] text-gray-500 md:hidden">
                          {[
                            `${p.appointments || 0} ${p.appointments === 1 ? 'cita' : 'citas'}`,
                            `facturado ${fmtEur(billed)}`,
                            p.salary ? `sueldo ${fmtEur(p.salary)}` : null,
                            p.commission ? `comisión ${fmtEur(p.commission)}` : null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="hidden md:block md:col-span-1 text-right text-sm tabular-nums text-gray-600">{p.appointments || '—'}</span>
                      <span className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-900">{fmtEur(billed)}</span>
                      <span className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-600">{p.salary ? fmtEur(p.salary) : '—'}</span>
                      <span className="hidden md:block md:col-span-2 text-right text-sm tabular-nums text-gray-600">{p.commission ? fmtEur(p.commission) : '—'}</span>
                      <span className={`shrink-0 md:col-span-2 text-right text-sm font-semibold tabular-nums ${leaves >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>{fmtEur(leaves)}</span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>

        {/* Expenses by category */}
        <Section title="Gastos por categoría">
          {data.expensesByCategory.length === 0 ? (
            <p className="py-6 text-sm text-gray-500">Sin gastos en este periodo.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.expensesByCategory.map((cat) => (
                <li key={cat.category} className="py-3">
                  <div className="flex items-center gap-2.5">
                    <Dot cls={catDot(categories, cat.category)} />
                    <span className="min-w-0 flex-1 truncate text-[15px] text-gray-900">{catLabel(categories, cat.category)}</span>
                    <span className="text-xs tabular-nums text-gray-400">{Math.round((cat.amount / totalExpensesSum) * 100)} %</span>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums text-gray-900">{fmtEur(cat.amount)}</span>
                  </div>
                  <div className="mt-2 ml-5 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${catDot(categories, cat.category)}`}
                      style={{ width: `${Math.round((cat.amount / maxExpense) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
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
            {isStaff
              ? <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800">Vinculada a Personal</span>
              : cat.isDefault
                ? <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-600">Predeterminada</span>
                : <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800">Propia</span>}
            {isStaff ? <span className="w-8 shrink-0" /> : (
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
            {categories.filter((c) => c.value !== 'staff').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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

function GastosTab({ dateRange, suppliers, categories, refreshTrigger, onCreate }) {
  const navigate = useNavigate();
  const [subView, setSubView] = useState('list'); // 'list' | 'recurrentes'
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);       // null | { expense?, scope? }
  const [scopeDialog, setScopeDialog] = useState(null); // null | { mode: 'edit'|'delete', expense }
  const [deleting, setDeleting] = useState(null);

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

  if (subView === 'recurrentes') {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setSubView('list')}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
          <Icon name="left" className="w-4 h-4" strokeWidth={2} />Gastos
        </button>
        <RecurrentesTab categories={categories} suppliers={suppliers} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FigureLine items={[
          { label: 'en gastos', value: fmtEur(totalFiltered) },
          { label: expenses.length === 1 ? 'gasto' : 'gastos', value: expenses.length },
        ]} />
        <GhostButton onClick={() => setSubView('recurrentes')}>
          <Icon name="clock" className="w-4 h-4" />Recurrentes
        </GhostButton>
      </div>

      {loading && expenses.length === 0 ? <Loading /> : expenses.length === 0 ? (
        <Empty action={<SectionLink onClick={onCreate}>+ Apuntar un gasto</SectionLink>}>No hay gastos en este periodo.</Empty>
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
            {expenses.map((exp) => {
              const supplier = exp.supplierId?.name;
              const label = catLabel(categories, exp.category);
              return (
                <li key={exp._id}>
                  <div role="button" tabIndex={0} onClick={() => handleEditClick(exp)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditClick(exp); }}
                    className={`px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl cursor-pointer hover:bg-gray-50 ${deleting === exp._id ? 'opacity-50' : ''}`}>
                    <span className="hidden md:block md:col-span-2 text-sm text-gray-600 tabular-nums first-letter:uppercase">{fmtDay(exp.expenseDate)}</span>
                    {/* Mobile: one title + subtitle */}
                    <div className="min-w-0 flex-1 md:hidden">
                      <p className="text-[15px] font-medium text-gray-900 truncate flex items-center gap-2">
                        <Dot cls={catDot(categories, exp.category)} size="w-2 h-2" />
                        <span className="truncate">{supplier || label}</span>
                        {exp.isRecurring && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Mensual</span>}
                        {exp.sourceType === 'INVOICE' && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800 shrink-0">Factura</span>}
                      </p>
                      <p className="text-[13px] text-gray-500 truncate">
                        {[fmtShort(exp.expenseDate), supplier ? label : null, exp.sourceType === 'INVOICE' ? `Factura ${exp.invoiceId?.invoiceNumber || ''}`.trim() : exp.isRecurring ? 'Recurrente' : 'Manual', exp.notes].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="hidden md:flex md:col-span-3 items-center gap-2 min-w-0">
                      <Dot cls={catDot(categories, exp.category)} size="w-2 h-2" />
                      <span className="text-sm font-medium text-gray-900 truncate">{label}</span>
                      {exp.isRecurring && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800 shrink-0">Mensual</span>}
                      {exp.sourceType === 'INVOICE' && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-emerald-50 text-emerald-800 shrink-0">Factura</span>}
                    </div>
                    <span className="hidden md:block md:col-span-2 text-sm text-gray-600 truncate">{supplier || <span className="text-gray-300">—</span>}</span>
                    <span className="hidden md:block md:col-span-3 text-sm text-gray-500 truncate">{exp.notes || <span className="text-gray-300">—</span>}</span>
                    <div className="shrink-0 md:col-span-2 flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{fmtEur(exp.amount)}</span>
                      <RowMenu items={exp.sourceType === 'INVOICE'
                        ? [{ label: 'Ver factura', onClick: () => handleEditClick(exp) }]
                        : [{ label: 'Editar', onClick: () => handleEditClick(exp) }, { label: 'Eliminar', danger: true, disabled: deleting === exp._id, onClick: () => handleDeleteClick(exp) }]} />
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
  ['dashboard',  'Resumen'],
  ['expenses',   'Gastos'],
  ['categories', 'Categorías'],
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

  const usesPeriod = tab === 'dashboard' || tab === 'expenses';

  return (
    <div className="w-full space-y-6" style={{ overflowX: 'clip' }}>
      <PageHeader
        title="Finanzas"
        subtitle={usesPeriod ? fmtRange(dateRange) : 'Ingresos, gastos y beneficio'}
        actions={<PrimaryButton onClick={() => setQuickAction('expense')}>Nuevo gasto</PrimaryButton>}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Tabs value={tab} options={TABS} onChange={setTab} />
          {usesPeriod && <PeriodSelector period={period} onChange={handlePeriodChange} />}
        </div>
        {usesPeriod && period === 'custom' && (
          <div className="flex justify-end">
            <CustomRange dateRange={dateRange} onRangeChange={(r) => { setPeriod('custom'); setDateRange(r); }} />
          </div>
        )}
      </div>

      {tab === 'dashboard'  && <ResumenTab dateRange={dateRange} categories={categories} refreshTrigger={refresh} onTodayRevenue={() => setQuickAction('revenue')} />}
      {tab === 'expenses'   && <GastosTab dateRange={dateRange} suppliers={suppliers} categories={categories} refreshTrigger={refresh} onCreate={() => setQuickAction('expense')} />}
      {tab === 'categories' && <CategoryManagerModal inline onRefresh={loadCategories} />}

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
