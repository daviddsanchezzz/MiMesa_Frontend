import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { TONES, toneBar, toneLabel } from '../lib/status';

/**
 * Shared pieces for every screen, citas and restaurante alike. Sections are
 * separated by space and a title, rows by a hairline; boxes only for things
 * that float (sheets, warnings).
 */

export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={className}>
      {(title || aside) && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          {title && <h3 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionLink({ to, onClick, children }) {
  const cls = 'text-[13px] font-semibold text-violet-700 hover:text-violet-900';
  return to ? <Link to={to} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

/** A coloured dot and the state in words. */
export function StatusText({ tone, sector, className = '' }) {
  const t = TONES[tone] || TONES.confirmed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`} style={{ color: t.ink }}>
      {tone === 'done' ? <span aria-hidden="true" className="font-bold">✓</span> : <span className="w-2 h-2 rounded-full shrink-0" style={t.dashed ? { border: `1.5px dashed ${t.color}` } : { backgroundColor: t.color }} />}
      {toneLabel(tone, sector)}
    </span>
  );
}

/** Small round button for the one action a row needs (Sentar, Llegó, Cobrar…). */
export function RowAction({ children, onClick, tone = 'neutral', disabled }) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    primary: 'bg-violet-600 text-white hover:bg-violet-700',
    good: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    warn: 'bg-amber-50 text-amber-900 hover:bg-amber-100',
  };
  return (
    <button type="button" disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

/**
 * One appointment or reservation: the time big on the left, a line in the
 * colour of its state, who and what, and on the right whatever helps most
 * (people, professional, a one-tap action).
 */
export function TimeRow({ time, end, tone = 'confirmed', title, subtitle, badge, trailing, onClick, highlight = false, muted, sector, wide = false }) {
  const isMuted = muted ?? ['cancelled', 'lost'].includes(tone);
  return (
    <li>
      <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={`group flex items-stretch gap-3 py-3 px-2 -mx-2 rounded-xl ${onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} ${highlight ? 'bg-violet-50/70 hover:bg-violet-50' : ''}`}>
        <div className={`${wide ? 'w-[74px]' : 'w-12'} shrink-0 text-right pt-px`}>
          <p className={`${wide ? 'text-[13px]' : 'text-[15px]'} font-semibold tabular-nums leading-5 whitespace-nowrap ${isMuted ? 'text-gray-300 line-through' : 'text-gray-900'}`}>{time}</p>
          {end && <p className="text-[11px] text-gray-400 tabular-nums leading-4">{end}</p>}
        </div>
        <span className="w-[3px] rounded-full shrink-0" style={toneBar(tone)} aria-hidden="true" />
        <div className="min-w-0 flex-1 py-px">
          <div className="flex items-center gap-2 min-w-0">
            <p className={`text-[15px] font-medium leading-5 truncate ${isMuted ? 'text-gray-400' : 'text-gray-900'}`}>{title}</p>
            {tone === 'done' && <span aria-hidden="true" className="shrink-0 text-sm font-semibold" style={{ color: TONES.done.ink }}>✓</span>}
            {badge}
          </div>
          {subtitle && <p className="text-[13px] text-gray-500 leading-5 truncate">{subtitle}</p>}
          <span className="sr-only">{toneLabel(tone, sector)}</span>
        </div>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
    </li>
  );
}

/** Lines of things to do: icon, text, one action. */
export function TodoRow({ icon, tint = 'gray', children, action }) {
  const tints = {
    gray: 'bg-gray-100 text-gray-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
    green: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center ${tints[tint]}`}><Icon name={icon} className="w-[18px] h-[18px]" /></span>
      <div className="min-w-0 flex-1 text-sm text-gray-700 leading-snug">{children}</div>
      {action}
    </li>
  );
}

export function TodoLink({ to, onClick, children }) {
  const cls = 'shrink-0 inline-flex items-center gap-0.5 text-[13px] font-semibold text-gray-900 hover:text-violet-700';
  const inner = <>{children}<Icon name="right" className="w-3.5 h-3.5" strokeWidth={2} /></>;
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

/** Figures in one line: "11 citas · 308 € · 72 % ocupado". */
/** Inline figures. With `stacked`, mobile shows them as equal columns (big number, label below); lg+ stays inline. */
export function FigureLine({ items, stacked = false }) {
  const shown = items.filter(Boolean);
  const tone = (t) => (t === 'good' ? 'text-emerald-600' : t === 'warn' ? 'text-amber-600' : 'text-gray-900');
  return (
    <div className={stacked
      ? 'flex divide-x divide-gray-200 lg:divide-x-0 lg:flex-wrap lg:items-baseline lg:gap-x-5 lg:gap-y-1'
      : 'flex flex-wrap items-baseline gap-x-5 gap-y-1'}>
      {shown.map((it) => (
        <div key={it.label} className={stacked
          ? 'flex-1 min-w-0 flex flex-col px-3 first:pl-0 last:pr-0 lg:flex-none lg:flex-row lg:items-baseline lg:gap-1.5 lg:p-0'
          : 'flex items-baseline gap-1.5'}>
          <span className={`font-semibold tabular-nums ${stacked ? 'text-2xl tracking-tight lg:text-lg lg:tracking-normal' : 'text-lg'} ${tone(it.tone)}`}>{it.value}</span>
          <span className={`text-gray-500 ${stacked ? 'text-xs leading-tight mt-0.5 lg:mt-0 lg:text-[13px]' : 'text-[13px]'}`}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-gray-500">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Pills to switch views (Lista · Línea · Plano). */
export function Segmented({ value, options, onChange, size = 'md' }) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-gray-100" role="tablist">
      {options.map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}
          className={`${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]'} rounded-full font-semibold whitespace-nowrap transition-colors ${value === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function greeting(name) {
  const h = new Date().getHours();
  const hello = h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  const first = /[a-zA-ZÀ-ÿ]/.test(name || '') ? name.trim().split(/\s+/)[0] : '';
  return first ? `${hello}, ${first}` : hello;
}

/** A small button that opens a list of choices (no native select: no iOS zoom, same look everywhere). */
export function MenuButton({ children, items, align = 'right', className = '', ariaLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100 ${className}`}>
        {children}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute z-40 top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} min-w-[12rem] bg-white border border-gray-200 rounded-xl shadow-lg py-1`}>
            {items.filter(Boolean).map((it) => (
              <button key={it.label} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className={`w-full flex items-center justify-between gap-3 text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 ${it.active ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {it.label}
                {it.active && <Icon name="check" className="w-4 h-4 text-violet-600" strokeWidth={2} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Top of a screen: the title (desktop only — on the phone the header bar
 * already shows it), one line of context and, on desktop, the main actions.
 * On the phone the main action goes in the header bar (useSetMobileHeader).
 */
export function PageHeader({ title, subtitle, actions, mobileActions = false, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 lg:mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className={`${mobileActions ? 'flex' : 'hidden lg:flex'} items-center gap-2 shrink-0`}>{actions}</div>}
    </div>
  );
}

/** The violet main button (desktop page actions, sheet footers). */
export function PrimaryButton({ children, onClick, type = 'button', disabled, icon = 'plus', className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 ${className}`}>
      {icon && <Icon name={icon} className="w-4 h-4" strokeWidth={2} />}{children}
    </button>
  );
}

/** Quiet secondary button (Exportar, Copiar semana…). */
export function GhostButton({ children, onClick, disabled, className = '' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

/** Sections of a screen (Pedidos · Productos · Proveedores): Segmented that scrolls on the phone. */
export function Tabs({ value, options, onChange }) {
  return (
    <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Segmented value={value} options={options} onChange={onChange} />
    </div>
  );
}

/** One big number with its label above and a line of context below (Caja, Finanzas). */
export function BigFigure({ label, value, sub, tone }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-3xl lg:text-4xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[13px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/** On/off switch. */
export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 ${on ? 'bg-violet-600' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}
