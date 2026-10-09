import { Link } from 'react-router-dom';
import Icon from './Icon';

/**
 * How a screen of figures uses the width, the same on every dashboard (Finanzas, Compras, Estadísticas, Caja):
 *   <Hero …/>                      the figure that opens the screen
 *   <Columns aside={…}>…</Columns> what you read (main) next to what you do (aside)
 * On the phone everything stacks: with `asideFirst` the aside goes above the main block.
 */
export function Columns({ aside, asideFirst = false, children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start ${className}`}>
      <div className="min-w-0 space-y-8">{children}</div>
      {aside && <aside className={`min-w-0 space-y-8 ${asideFirst ? 'order-first lg:order-none' : ''}`}>{aside}</aside>}
    </div>
  );
}

/** Blocks of main side by side from a wide screen up (two columns), stacked below that. */
export function Split({ children, className = '' }) {
  return <div className={`space-y-8 xl:grid xl:grid-cols-2 xl:gap-x-14 xl:gap-y-8 xl:items-start xl:space-y-0 ${className}`}>{children}</div>;
}

/**
 * The things you do from a screen ("Subir factura", "Añadir gasto"): a row of buttons on the phone,
 * a flat list in the aside on desktop. Items: { icon, label, to | onClick, primary? }.
 */
export function ActionList({ items, title }) {
  const list = items.filter(Boolean);
  return (
    <div>
      {title && <h2 className="mb-1 hidden text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400 lg:block">{title}</h2>}
      <div className="flex gap-2.5 lg:flex-col lg:gap-0 lg:divide-y lg:divide-gray-100">
        {list.map((it) => {
          const inner = (
            <>
              <Icon name={it.icon} className="h-[18px] w-[18px] text-violet-600" />
              <span className="lg:flex-1 lg:text-left">{it.label}</span>
              <Icon name="right" className="hidden h-4 w-4 text-gray-300 lg:block" strokeWidth={2} />
            </>
          );
          const cls = `inline-flex flex-1 items-center justify-center gap-2 h-11 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-50 lg:h-auto lg:flex-none lg:justify-start lg:gap-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-3 lg:text-[15px] lg:font-medium`;
          return it.to
            ? <Link key={it.label} to={it.to} className={cls}>{inner}</Link>
            : <button key={it.label} type="button" onClick={it.onClick} className={cls}>{inner}</button>;
        })}
      </div>
    </div>
  );
}

const TINT = { amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600', gray: 'bg-gray-100 text-gray-600' };

/** Something that needs you ("1 factura por revisar"): a flat row with a tinted icon, no box. */
export function Attention({ icon, tone = 'amber', title, hint, to, onClick }) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TINT[tone]}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold text-gray-900">{title}</span>
        {hint && <span className="block text-[13px] text-gray-500">{hint}</span>}
      </span>
      <Icon name="right" className="h-4 w-4 shrink-0 text-gray-300" strokeWidth={2} />
    </>
  );
  const cls = 'flex w-full items-center gap-3 py-2.5 hover:opacity-80';
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}
