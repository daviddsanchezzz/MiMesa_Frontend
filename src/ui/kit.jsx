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
      <span className="w-2 h-2 rounded-full shrink-0" style={t.dashed ? { border: `1.5px dashed ${t.color}` } : { backgroundColor: t.color }} />
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
export function TimeRow({ time, end, tone = 'confirmed', title, subtitle, badge, trailing, onClick, highlight = false, muted, sector }) {
  const isMuted = muted ?? ['cancelled', 'lost'].includes(tone);
  return (
    <li>
      <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={`group flex items-stretch gap-3 py-3 px-2 -mx-2 rounded-xl ${onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} ${highlight ? 'bg-violet-50/70 hover:bg-violet-50' : ''}`}>
        <div className="w-12 shrink-0 text-right pt-px">
          <p className={`text-[15px] font-semibold tabular-nums leading-5 ${isMuted ? 'text-gray-300 line-through' : 'text-gray-900'}`}>{time}</p>
          {end && <p className="text-[11px] text-gray-400 tabular-nums leading-4">{end}</p>}
        </div>
        <span className="w-[3px] rounded-full shrink-0" style={toneBar(tone)} aria-hidden="true" />
        <div className="min-w-0 flex-1 py-px">
          <div className="flex items-center gap-2 min-w-0">
            <p className={`text-[15px] font-medium leading-5 truncate ${isMuted ? 'text-gray-400' : 'text-gray-900'}`}>{title}</p>
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
export function FigureLine({ items }) {
  const shown = items.filter(Boolean);
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      {shown.map((it) => (
        <div key={it.label} className="flex items-baseline gap-1.5">
          <span className={`text-lg font-semibold tabular-nums ${it.tone === 'good' ? 'text-emerald-600' : it.tone === 'warn' ? 'text-amber-600' : 'text-gray-900'}`}>{it.value}</span>
          <span className="text-[13px] text-gray-500">{it.label}</span>
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
          className={`${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]'} rounded-full font-semibold transition-colors ${value === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
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
