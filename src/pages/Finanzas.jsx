import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

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
function catLabel(cats, value) {
  return cats?.find((x) => x.value === value)?.label || value;
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

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtEur(n) {
  if (n === null || n === undefined) return '—';
  return `€${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'violet', icon, badge }) {
  const colors = {
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  icon: 'text-violet-500'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    icon: 'text-rose-500'    },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-500'   },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     icon: 'text-sky-500'     },
  };
  const c = colors[color] || colors.violet;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center ${c.icon}`}>{icon}</div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {badge && <span className="self-start text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message, cta, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-400">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
      {cta && (
        <button onClick={onCta} className="mt-1 text-sm font-semibold text-violet-600 hover:text-violet-700">
          {cta}
        </button>
      )}
    </div>
  );
}

function ModalOverlay({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const selectCls = inputCls + ' bg-white';
const btnPrimary = 'px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors';
const btnGhost = 'px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors';

// ── Period selector ───────────────────────────────────────────────────────────

function PeriodSelector({ period, dateRange, onChange, onRangeChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { id: 'week',   label: 'Esta semana' },
        { id: 'month',  label: 'Este mes'    },
        { id: 'custom', label: 'Personalizado' },
      ].map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            period === p.id
              ? 'bg-violet-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {p.label}
        </button>
      ))}
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={(e) => onRangeChange({ ...dateRange, from: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={dateRange.to} onChange={(e) => onRangeChange({ ...dateRange, to: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      )}
      <span className="text-xs text-gray-400 ml-1">
        {fmtDate(dateRange.from)} — {fmtDate(dateRange.to)}
      </span>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function InlineRevenueEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value !== null ? String(value) : '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    const num = parseFloat(val);
    onSave(isNaN(num) || val === '' ? null : num);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="0.01"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 px-2 py-0.5 text-sm border border-violet-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-right"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-sm font-medium px-2 py-0.5 rounded-lg transition-colors text-right ${
        value !== null
          ? 'text-emerald-700 hover:bg-emerald-50'
          : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
      }`}
      title="Haz clic para introducir ingreso real"
    >
      {value !== null ? fmtEur(value) : '+ añadir'}
    </button>
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
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          type="number" min="0" step="0.5"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 px-2 py-0.5 text-sm border border-violet-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <span className="text-sm text-gray-500">€/comensal</span>
      </span>
    );
  }
  return (
    <button onClick={() => setEditing(true)}
      className="text-sm text-violet-600 font-semibold hover:underline underline-offset-2"
      title="Haz clic para editar el ticket medio">
      {fmtEur(value)}/comensal
    </button>
  );
}

const PAGE_SIZE = 10;

function DashboardTab({ dateRange, categories }) {
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

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="No se pudieron cargar los datos" />;

  const maxExpense = data.expensesByCategory[0]?.amount || 1;
  const totalExpensesSum = data.expensesByCategory.reduce((s, c) => s + c.amount, 0) || 1;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos estimados"
          value={fmtEur(data.estimatedRevenue)}
          sub={`${data.totalCovers} comensales`}
          color="sky"
          badge="desde reservas"
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 2a.75.75 0 0 1 .75.75v.258a33.186 33.186 0 0 1 6.668.83.75.75 0 0 1-.336 1.461 31.28 31.28 0 0 0-1.103-.232l1.702 7.545a.75.75 0 0 1-.387.832A4.981 4.981 0 0 1 15 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 0 1-.387-.832l1.77-7.849a31.743 31.743 0 0 0-3.339-.254v11.505a20.01 20.01 0 0 1 3.78.501.75.75 0 1 1-.339 1.46A18.51 18.51 0 0 0 10 17.5c-1.49 0-2.938.208-4.21.582a.75.75 0 0 1-.339-1.46 20.01 20.01 0 0 1 3.78-.501V5.509a31.743 31.743 0 0 0-3.339.254l1.77 7.85a.75.75 0 0 1-.387.831A4.981 4.981 0 0 1 5 14a4.981 4.981 0 0 1-2.294-.556.75.75 0 0 1-.387-.832L4.021 5.067c-.37.07-.738.148-1.103.232a.75.75 0 0 1-.336-1.462 33.186 33.186 0 0 1 6.668-.829V2.75A.75.75 0 0 1 10 2Z" /></svg>}
        />
        <KpiCard
          label="Ingresos reales"
          value={data.actualRevenue !== null ? fmtEur(data.actualRevenue) : '—'}
          sub={data.actualRevenue !== null ? 'introducido manualmente' : 'sin datos manuales'}
          color="emerald"
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>}
        />
        <KpiCard
          label="Gastos totales"
          value={fmtEur(data.totalExpenses)}
          sub={`${data.expensesByCategory.length} categorías`}
          color="rose"
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7ZM3.25 8A2.25 2.25 0 0 0 1 10.25v4.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-4.5A2.25 2.25 0 0 0 16.75 8H3.25Z" /></svg>}
        />
        <KpiCard
          label="Beneficio estimado"
          value={fmtEur(data.estimatedProfit)}
          sub={data.profitBasis === 'actual' ? 'basado en ingresos reales' : 'basado en estimación'}
          color={data.estimatedProfit >= 0 ? 'emerald' : 'rose'}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.577 4.878a.75.75 0 0 1 .919-.53l4.78 1.281a.75.75 0 0 1 .531.919l-1.281 4.78a.75.75 0 0 1-1.449-.387l.81-3.022a19.407 19.407 0 0 0-5.594 5.203.75.75 0 0 1-1.139.093L7 10.06l-4.72 4.72a.75.75 0 0 1-1.06-1.061l5.25-5.25a.75.75 0 0 1 1.06 0l3.074 3.073a20.923 20.923 0 0 1 5.545-4.931l-3.042-.815a.75.75 0 0 1-.53-.918Z" clipRule="evenodd" /></svg>}
        />
      </div>

      {/* Ticket average */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400">
          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
        </svg>
        Ticket medio estimado:&nbsp;
        <TicketAverageEdit value={data.ticketAverage} onSave={saveTicketAverage} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by category */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos por categoría</h3>
          {data.expensesByCategory.length === 0 ? (
            <p className="text-sm text-gray-400">Sin gastos en este período</p>
          ) : (
            <div className="space-y-3">
              {data.expensesByCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${catDot(categories, cat.category)}`} />
                      <span className="text-sm text-gray-600">{catLabel(categories, cat.category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{Math.round((cat.amount / totalExpensesSum) * 100)}%</span>
                      <span className="text-sm font-semibold text-gray-700">{fmtEur(cat.amount)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${catDot(categories, cat.category)}`}
                      style={{ width: `${Math.round((cat.amount / maxExpense) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Ingresos por día</h3>
          <p className="text-xs text-gray-400 mb-4">Haz clic en "+ añadir" para introducir el ingreso real del día</p>
          {data.days.length === 0 ? (
            <p className="text-sm text-gray-400">Sin días en este período</p>
          ) : (() => {
            const pageCount = Math.ceil(data.days.length / PAGE_SIZE);
            const slice = data.days.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium text-right">Comens.</th>
                        <th className="pb-2 font-medium text-right">Estimado</th>
                        <th className="pb-2 font-medium text-right">Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {slice.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50/50">
                          <td className="py-2 text-gray-600">{fmtDate(day.date)}</td>
                          <td className="py-2 text-right text-gray-500">{day.covers || '—'}</td>
                          <td className="py-2 text-right text-gray-500">{day.estimatedRevenue > 0 ? fmtEur(day.estimatedRevenue) : '—'}</td>
                          <td className="py-2 text-right">
                            <InlineRevenueEdit
                              value={day.actualRevenue}
                              onSave={(v) => saveActual(day.date, v)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                      </svg>
                      Anterior
                    </button>
                    <span className="text-xs text-gray-400">
                      Página {page + 1} de {pageCount}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={page >= pageCount - 1}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
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
    <ModalOverlay
      title={isDelete ? 'Eliminar gasto recurrente' : 'Editar gasto recurrente'}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">¿A qué registros quieres aplicar este cambio?</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                scope === opt.value
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-200 hover:border-violet-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio" name="scope" value={opt.value} checked={scope === opt.value}
                onChange={() => setScope(opt.value)}
                className="mt-0.5 text-violet-600 accent-violet-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={btnGhost}>Cancelar</button>
          <button
            onClick={() => onConfirm(scope)}
            className={isDelete
              ? 'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors'
              : btnPrimary}
          >
            {isDelete ? 'Eliminar' : 'Continuar'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Category manager modal ────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={`w-6 h-6 rounded-full ${c.cls} transition-transform hover:scale-110 ${
            value === c.value ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''
          }`}
        />
      ))}
    </div>
  );
}

function CategoryManagerModal({ onClose, onRefresh }) {
  const [type, setType] = useState('expense');
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ label: '', color: 'slate' });
  const [newForm, setNewForm] = useState({ label: '', color: 'slate' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/categories?type=${type}`);
      setCats(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [type]);

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
    e.preventDefault();
    if (!newForm.label.trim()) return;
    setSaving(true);
    try {
      await api.post('/categories', { ...newForm, type });
      setNewForm({ label: '', color: 'slate' });
      load();
      onRefresh();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const typeLabel = type === 'expense' ? 'gastos' : 'proveedores';

  return (
    <ModalOverlay title="Gestionar categorías" onClose={onClose}>
      {/* Type tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
        {[{ id: 'expense', label: 'Gastos' }, { id: 'supplier', label: 'Proveedores' }].map((t) => (
          <button
            key={t.id}
            onClick={() => { setType(t.id); setEditingId(null); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              type === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-1 mb-4">
          {cats.map((cat) => (
            <div key={cat._id} className="rounded-xl border border-gray-100 overflow-hidden">
              {editingId === cat._id ? (
                /* Edit row */
                <div className="p-3 space-y-3 bg-violet-50/60">
                  <input
                    autoFocus
                    type="text"
                    value={editForm.label}
                    onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                    className={inputCls}
                    placeholder="Nombre de la categoría"
                  />
                  <ColorPicker value={editForm.color} onChange={(c) => setEditForm((f) => ({ ...f, color: c }))} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(cat._id)} disabled={saving} className={btnPrimary + ' text-xs px-3 py-1.5'}>
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className={btnGhost + ' text-xs px-3 py-1.5'}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_DOT[cat.color] || 'bg-slate-400'}`} />
                  <span className="flex-1 text-sm text-gray-800">{cat.label}</span>
                  {cat.isDefault && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">predeterminada</span>}
                  <button onClick={() => startEdit(cat)} className="p-1 text-gray-400 hover:text-violet-600 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474ZM4.75 14.25h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0 0 1.5Z" />
                    </svg>
                  </button>
                  <button onClick={() => deleteCat(cat._id)} className="p-1 text-gray-400 hover:text-rose-500 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <form onSubmit={addNew} className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nueva categoría de {typeLabel}</p>
        <input
          type="text"
          value={newForm.label}
          onChange={(e) => setNewForm((f) => ({ ...f, label: e.target.value }))}
          className={inputCls}
          placeholder="Nombre..."
        />
        <ColorPicker value={newForm.color} onChange={(c) => setNewForm((f) => ({ ...f, color: c }))} />
        <button type="submit" disabled={saving || !newForm.label.trim()} className={btnPrimary + ' w-full'}>
          Añadir categoría
        </button>
      </form>
    </ModalOverlay>
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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) return setError('Selecciona una categoría');
    if (!form.amount || Number(form.amount) <= 0) return setError('El importe debe ser mayor que 0');
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/expenses/${expense._id}`, { ...form, scope });
      } else {
        await api.post('/expenses', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay title={editing ? 'Editar gasto' : 'Registrar gasto'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Importe (€)" required>
            <input autoFocus type="number" min="0.01" step="0.01" value={form.amount}
              onChange={(e) => set('amount', e.target.value)} className={inputCls} placeholder="0.00" />
          </FormField>
          <FormField label="Fecha" required>
            <input type="date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} className={inputCls} />
          </FormField>
        </div>
        <FormField label="Categoría" required>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={selectCls}>
            <option value="">Seleccionar...</option>
            {categories.filter((c) => c.value !== 'staff').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="Proveedor">
          <select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} className={selectCls}>
            <option value="">Sin proveedor</option>
            {suppliers.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </FormField>
        <FormField label="Notas">
          <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} placeholder="Descripción opcional" />
        </FormField>

        {/* Recurring section */}
        {!editing && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500" />
              <span className="text-sm text-gray-600">Gasto recurrente mensual</span>
            </label>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Gastos tab ────────────────────────────────────────────────────────────────

function GastosTab({ dateRange, suppliers, categories }) {
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
  }, [filters]);

  useEffect(() => { load(); }, [load]);

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
        <button
          onClick={() => setSubView('list')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Volver a gastos
        </button>
        <RecurrentesTab categories={categories} suppliers={suppliers} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSubView('recurrentes')}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-violet-500">
            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5H8.75v-2.75Z" clipRule="evenodd" />
          </svg>
          Gastos recurrentes
        </button>
        <button onClick={() => setModal({})} className={btnPrimary + ' flex items-center gap-1.5'}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Registrar gasto
        </button>
      </div>

      {loading ? <Spinner /> : expenses.length === 0 ? (
        <EmptyState
          message="No hay gastos en este período"
          cta="Registrar primer gasto"
          onCta={() => setModal({})}
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 hidden md:table-cell">Proveedor</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Notas</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Rec.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${catDot(categories, exp.category)}`} />
                        <span className="text-gray-700">{catLabel(categories, exp.category)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {exp.supplierId?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell max-w-xs truncate">
                      {exp.notes || <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{fmtEur(exp.amount)}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {exp.isRecurring && (
                        <span title="Recurrente" className="text-violet-400">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 inline">
                            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5H8.75v-2.75Z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditClick(exp)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474ZM4.75 14.25h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0 0 1.5Z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteClick(exp)} disabled={deleting === exp._id}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <p className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-700">{fmtEur(totalFiltered)}</span>
            </p>
          </div>
        </>
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

// ── Recurrentes tab ───────────────────────────────────────────────────────────

function RecurrentesTab({ categories, suppliers }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses/templates');
      setGastos(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (g) => {
    setToggling(g._id);
    try {
      await api.patch(`/expenses/templates/${g._id}`, { isActive: !g.isActive });
      setGastos((prev) => prev.map((x) => x._id === g._id ? { ...x, isActive: !x.isActive } : x));
    } catch { /* ignore */ }
    finally { setToggling(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este gasto recurrente? Los gastos ya generados se conservan.')) return;
    setDeleting(id);
    try {
      await api.delete(`/expenses/templates/${id}`);
      setGastos((prev) => prev.filter((g) => g._id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const active = gastos.filter((g) => g.isActive);
  const totalMensual = active.reduce((s, g) => s + (g.amount || 0), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      {gastos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Gastos activos</p>
            <p className="text-2xl font-bold text-violet-600">{active.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">de {gastos.length} configurados</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total mensual</p>
            <p className="text-2xl font-bold text-rose-500">{fmtEur(totalMensual)}</p>
            <p className="text-xs text-gray-400 mt-0.5">gastos activos</p>
          </div>
        </div>
      )}

      {gastos.length === 0 ? (
        <EmptyState message="Sin gastos recurrentes configurados. Marca un gasto como recurrente al crearlo." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {gastos.map((g) => {
              const supplierName = g.supplierId?.name;
              return (
                <div key={g._id} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/60 ${!g.isActive ? 'opacity-50' : ''}`}>

                  {/* Day badge */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-violet-600 leading-none">{g.dayOfMonth}</span>
                    <span className="text-[9px] font-medium text-violet-400 leading-none mt-0.5 uppercase tracking-wide">cada mes</span>
                  </div>

                  {/* Category + supplier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${catDot(categories, g.category)}`} />
                      <span className="text-sm font-semibold text-gray-900">{catLabel(categories, g.category)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {supplierName || (g.notes ? g.notes : <span className="text-gray-300">Sin proveedor</span>)}
                      {supplierName && g.notes && <span className="ml-1 text-gray-300">· {g.notes}</span>}
                    </p>
                  </div>

                  {/* Amount + frequency */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-gray-900">{fmtEur(g.amount)}</p>
                    <p className="text-xs text-gray-400">/ mes</p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(g)}
                      disabled={toggling === g._id}
                      title={g.isActive ? 'Pausar' : 'Reactivar'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        g.isActive
                          ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                    >
                      {g.isActive ? (
                        /* Pause icon */
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path d="M4.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-2ZM9.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-2Z" />
                        </svg>
                      ) : (
                        /* Play icon */
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(g._id)}
                      disabled={deleting === g._id}
                      title="Eliminar"
                      className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay title={editing ? 'Editar proveedor' : 'Añadir proveedor'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Nombre" required>
          <input autoFocus type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
            className={inputCls} placeholder="Nombre del proveedor" />
        </FormField>
        <FormField label="Categoría">
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={selectCls}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="Persona de contacto">
          <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)}
            className={inputCls} placeholder="Nombre y apellidos" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Teléfono">
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className={inputCls} placeholder="612 345 678" />
          </FormField>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className={inputCls} placeholder="proveedor@example.com" />
          </FormField>
        </div>
        <FormField label="Notas">
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            className={inputCls} rows={2} placeholder="Condiciones de pago, días de entrega..." />
        </FormField>
        {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Añadir proveedor'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Proveedores tab ───────────────────────────────────────────────────────────

function ProveedoresTab({ suppliers, loadSuppliers, categories, categories }) {
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal({})} className={btnPrimary + ' flex items-center gap-1.5'}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Añadir proveedor
        </button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          message="Sin proveedores registrados"
          cta="Añadir primer proveedor"
          onCta={() => setModal({})}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 hidden sm:table-cell">Categoría</th>
                <th className="px-4 py-3 hidden md:table-cell">Contacto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map((s) => (
                <>
                  <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpand(s._id)}
                        className="text-left font-medium text-gray-800 hover:text-violet-600 flex items-center gap-1.5 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded === s._id ? 'rotate-90' : ''}`}>
                          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                        {s.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {catLabel(categories, s.category)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-600">{s.contactName || <span className="text-gray-300">—</span>}</span>
                      {s.phone && <span className="text-gray-400 ml-2 text-xs">{s.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(s)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          s.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {s.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ supplier: s })}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors float-right"
                        title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474ZM4.75 14.25h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0 0 1.5Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expanded === s._id && (
                    <tr key={`${s._id}-detail`}>
                      <td colSpan={5} className="px-6 pb-4 bg-gray-50/50">
                        {detailLoading ? (
                          <p className="text-sm text-gray-400 py-3">Cargando gastos...</p>
                        ) : supplierDetail ? (
                          <div className="pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Últimos gastos — Total: <span className="text-gray-700">{fmtEur(supplierDetail.total)}</span>
                              </p>
                            </div>
                            {supplierDetail.expenses.length === 0 ? (
                              <p className="text-sm text-gray-400">Sin gastos registrados para este proveedor</p>
                            ) : (
                              <div className="space-y-1.5">
                                {supplierDetail.expenses.slice(0, 5).map((e) => (
                                  <div key={e._id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">{fmtDate(e.expenseDate)}</span>
                                    <span className="text-gray-600 flex-1 mx-4 truncate">{catLabel(categories, e.category)} {e.notes && `— ${e.notes}`}</span>
                                    <span className="font-medium text-gray-700">{fmtEur(e.amount)}</span>
                                  </div>
                                ))}
                                {supplierDetail.expenses.length > 5 && (
                                  <p className="text-xs text-gray-400">+{supplierDetail.expenses.length - 5} más en la pestaña Gastos</p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <SupplierModal
          supplier={modal.supplier}
          categories={categories}
          onSave={() => { setModal(null); loadSuppliers(); setExpanded(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Finanzas() {
  const [tab, setTab] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState(getMonthRange());
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryModal, setCategoryModal] = useState(false);

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

  const TABS = [
    { id: 'dashboard',  label: 'Dashboard'    },
    { id: 'expenses',   label: 'Gastos'       },
    { id: 'suppliers',  label: 'Proveedores'  },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Control de ingresos, gastos y rentabilidad</p>
        </div>
        <button
          onClick={() => setCategoryModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v2A1.5 1.5 0 0 1 12.5 7h-9A1.5 1.5 0 0 1 2 5.5v-2ZM2 10.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-2Z" />
          </svg>
          Categorías
        </button>
      </div>

      {/* Period selector — visible in dashboard and synced to other tabs */}
      {tab !== 'suppliers' && (
        <PeriodSelector
          period={period}
          dateRange={dateRange}
          onChange={handlePeriodChange}
          onRangeChange={(r) => { setPeriod('custom'); setDateRange(r); }}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab dateRange={dateRange} categories={categories} />}
      {tab === 'expenses'  && <GastosTab dateRange={dateRange} suppliers={suppliers} categories={categories} />}
      {tab === 'suppliers' && <ProveedoresTab suppliers={suppliers} loadSuppliers={loadSuppliers} categories={categories} />}

      {categoryModal && (
        <CategoryManagerModal
          onClose={() => setCategoryModal(false)}
          onRefresh={loadCategories}
        />
      )}
    </div>
  );
}
