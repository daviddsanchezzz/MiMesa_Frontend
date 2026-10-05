import { useState } from 'react';
import Icon from './Icon';
import { fmtRange, getMonthRange, getWeekRange, parseIso, shiftRange, toIso } from '../lib/periods';

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

const ALL_PERIODS = [['week', 'Semana'], ['month', 'Mes'], ['custom', 'Personalizado']];

/** Period state for a screen: week / month / custom range, and the arrows to move it. */
export function usePeriod(initial = 'month') {
  const [period, setPeriod] = useState(initial);
  const [dateRange, setDateRange] = useState(initial === 'week' ? getWeekRange() : getMonthRange());
  return {
    period, dateRange,
    onPeriodChange: (p) => {
      setPeriod(p);
      if (p === 'week') setDateRange(getWeekRange());
      if (p === 'month') setDateRange(getMonthRange());
    },
    onShift: (direction) => setDateRange(shiftRange(period, dateRange, direction)),
    onRangeChange: (range) => { setPeriod('custom'); setDateRange(range); },
  };
}

/**
 * Desktop: the content of a page sits in a centred column instead of stretching across a wide
 * screen. Put it on the root of the page: everything but the sticky bar follows (the bar keeps
 * its full-width background, and its content is aligned with the page by StickyBar itself).
 */
export const PAGE_BODY = 'lg:[&>:not(.sticky)]:w-full lg:[&>:not(.sticky)]:max-w-[1500px] lg:[&>:not(.sticky)]:mx-auto';
export const PAGE_BODY_NARROW = 'lg:[&>:not(.sticky)]:w-full lg:[&>:not(.sticky)]:max-w-2xl lg:[&>:not(.sticky)]:mx-auto';

/** Keeps the period selector (and tabs) in view while the page scrolls underneath. */
export function StickyBar({ children, narrow = false }) {
  return (
    <div className="sticky top-[-1rem] lg:top-[-1.75rem] !mt-[-1rem] lg:!mt-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 pt-4 lg:pt-7 pb-3 bg-white border-b border-gray-100">
      <div className={`space-y-3 lg:w-full ${narrow ? 'lg:max-w-2xl' : 'lg:max-w-[1500px]'} lg:mx-auto`}>{children}</div>
    </div>
  );
}

/**
 * The date selector of every screen: ‹ Octubre de 2026 📅 ›, with a menu to pick week, month or
 * a custom range. `periods` limits the menu (one entry = no menu); `canNext` stops going into the future.
 */
export default function PeriodNavigator({ period, dateRange, onPeriodChange, onShift, onRangeChange, periods = ['week', 'month', 'custom'], canNext = true }) {
  const [open, setOpen] = useState(false);
  const options = ALL_PERIODS.filter(([key]) => periods.includes(key));
  const hasMenu = options.length > 1;
  return (
    <div className="relative">
      <div className="flex items-center justify-center gap-1">
        <button type="button" onClick={() => onShift(-1)} aria-label="Periodo anterior"
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <Icon name="left" className="w-4 h-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => hasMenu && setOpen((value) => !value)} disabled={!hasMenu}
          className="min-w-[180px] h-9 px-3 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 enabled:hover:bg-gray-100">
          {periodLabel(period, dateRange)}
          {hasMenu && <Icon name="calendar" className="w-4 h-4 text-gray-500" />}
        </button>
        <button type="button" onClick={() => onShift(1)} aria-label="Periodo siguiente" disabled={!canNext}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
          <Icon name="right" className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className={`grid gap-1 rounded-xl bg-gray-100 p-1 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {options.map(([key, label]) => (
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


/**
 * The same pill as PeriodNavigator for a single day (Caja): ‹ Lunes 5 de octubre 📅 ›, with a date
 * picker behind the calendar icon and "Hoy" when you are looking at another day.
 */
export function DayNavigator({ date, today, onChange, label, canNext = true }) {
  const shift = (n) => {
    const d = parseIso(date);
    d.setDate(d.getDate() + n);
    onChange(toIso(d));
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => shift(-1)} aria-label="Día anterior"
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
        <Icon name="left" className="w-4 h-4" strokeWidth={2} />
      </button>
      <label className="relative min-w-[180px] h-9 px-3 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 cursor-pointer">
        <span className="first-letter:uppercase">{label}</span>
        <Icon name="calendar" className="w-4 h-4 text-gray-500" />
        <input type="date" value={date} max={canNext ? undefined : today} aria-label="Elegir día"
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* ignore */ } }}
          className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
      <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Día siguiente"
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
        <Icon name="right" className="w-4 h-4" strokeWidth={2} />
      </button>
      {date !== today && (
        <button type="button" onClick={() => onChange(today)} className="ml-1 h-8 px-3 rounded-full text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100">Hoy</button>
      )}
    </div>
  );
}
