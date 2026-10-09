
import { moneyCurrency } from '../../lib/format';



/** Error / notice line inside a screen or sheet (no border). */
export function Notice({ children, tone = 'error' }) {
  if (!children) return null;
  const cls = tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-900';
  return <p className={`rounded-xl px-3 py-2 text-sm ${cls}`}>{children}</p>;
}

/** Cancel + main button for the bottom of a sheet. Pass `form` to submit a form that lives in the body. */
export function SheetFooter({ onCancel, onSave, saving, label = 'Guardar', form, disabled, cancelLabel = 'Cancelar', aside }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-xs text-gray-500">{aside}</div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={onCancel} disabled={saving}
          className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">{cancelLabel}</button>
        <button type={form ? 'submit' : 'button'} form={form} onClick={form ? undefined : onSave} disabled={saving || disabled}
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Guardando…' : label}
        </button>
      </div>
    </div>
  );
}

/** Initials of a person's name (max two letters). */
export const initialsOf = (name) => String(name || '').split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const mondayOf = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const normalizeDateOnly = (value) => {
  const text = String(value || '');
  return text.length >= 10 ? text.slice(0, 10) : '';
};

export const toDayOfWeek = (isoDate) => new Date(`${isoDate}T12:00:00`).getDay();

export const weekDays = (weekStart) => [...Array(7)].map((_, i) => {
  const date = addDays(weekStart, i);
  const ui = new Date(`${date}T12:00:00`);
  return {
    date,
    short: ui.toLocaleDateString('es-ES', { weekday: 'short' }),
    day: ui.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    fullLabel: ui.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }),
  };
});

/** The hours the staff work a shift: they may arrive before opening and leave after closing. */
export const staffTimes = (shift) => ({
  start: shift?.staffStartTime || shift?.startTime || '',
  end: shift?.staffEndTime || shift?.endTime || '',
});

export const compareShiftTime = (a, b) => (a.startTime || '').localeCompare(b.startTime || '');

export const shiftAppliesToDate = (shift, date) => {
  const day = toDayOfWeek(date);
  if (!Array.isArray(shift.days) || !shift.days.includes(day)) return false;
  if (shift.startDate && date < shift.startDate) return false;
  if (shift.endDate && date > shift.endDate) return false;
  return true;
};

export const formatMoney = (value, currency = 'EUR') => (Number.isFinite(Number(value)) ? moneyCurrency(value, currency) : '');

export const currencySymbol = (currency = 'EUR') => {
  const sample = formatMoney(0, currency);
  const symbol = sample.replace(/[0-9\s.,-]/g, '').trim();
  return symbol || currency;
};

export const compLabel = (comp) => {
  if (!comp) return null;
  const suffix = comp.paymentType === 'hourly' ? '/h' : comp.paymentType === 'per_shift' ? '/turno' : '/mes';
  return `${formatMoney(comp.baseAmount, comp.currency)}${suffix}`;
};

export const compTypeLabel = (type) => {
  if (type === 'hourly') return 'Por hora';
  if (type === 'per_shift') return 'Por turno';
  if (type === 'monthly_fixed') return 'Precio mensual';
  return type || '-';
};

export const CHIP_LIMIT = 8;

export const PERSON_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#a855f7', // purple
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#22c55e', // green
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#eab308', // yellow
  '#64748b', // slate
  '#0891b2', // dark cyan
  '#e11d48', // crimson
];

export const hslToHex = (h, s, l) => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lig - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const colorFromSlot = (slot) => {
  if (slot < PERSON_COLORS.length) return PERSON_COLORS[slot];
  const hue = Math.round((slot * 137.508) % 360); // golden-angle distribution
  return hslToHex(hue, 72, 48);
};
export { inputCls, labelCls } from '../../ui/form';
