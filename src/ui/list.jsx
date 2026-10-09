import Icon from './Icon';

/**
 * Lists and tables. One row look for every list of the app:
 *   <ListRow leading={<Avatar/>} title="Anma" subtitle="Manolo · 678…" value="18" status={<StatusDot…/>} onClick={…} />
 * and, on desktop, a table header above rows laid out on 12 columns:
 *   <TableHead at="md"><span className="col-span-4">Proveedor</span>…</TableHead>
 */

/** Column titles of a table; they show from the breakpoint `at` (md or lg) upwards, the phone shows rows. */
export function TableHead({ at = 'md', gap = 4, className = '', children }) {
  const grid = at === 'lg' ? 'hidden lg:grid' : 'hidden md:grid';
  return (
    <div className={`${grid} grid-cols-12 ${gap === 2 ? 'gap-2' : 'gap-4'} px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${className}`}>
      {children}
    </div>
  );
}

/** The circle or square with an initial or an icon at the start of a row. */
export function Avatar({ children, icon, color, size = 40, round = false, className = '' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center font-semibold text-gray-600 ${round ? 'rounded-full' : 'rounded-xl'} ${color ? '' : 'bg-gray-100'} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4, ...(color ? { backgroundColor: color.bg, color: color.fg } : {}) }}>
      {icon ? <Icon name={icon} className="h-[45%] w-[45%]" /> : children}
    </span>
  );
}

const DOT = { green: 'bg-emerald-500', amber: 'bg-amber-400', rose: 'bg-rose-400', violet: 'bg-violet-500', gray: 'bg-gray-300' };

/** A coloured dot with its word ("● Confirmada"). */
export function StatusDot({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 ${className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone] || DOT.gray}`} aria-hidden="true" />{children}
    </span>
  );
}

const CHIP = { gray: 'bg-gray-100 text-gray-600', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', violet: 'bg-violet-50 text-violet-700' };

/** A small pill of colour ("Habitual", "+12 %", "Pro"). */
export function Chip({ tone = 'gray', children, className = '' }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${CHIP[tone] || CHIP.gray} ${className}`}>{children}</span>;
}

const SPAN = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', 5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8', 9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12' };

/** The inside of a row (also used by DataTable on the phone). */
export function RowBody({ leading, title, subtitle, status, value, valueSub, trailing, chevron = false, muted = false }) {
  return (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-medium ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-gray-500">{subtitle}</span>}
        {status && <span className="mt-1 block">{status}</span>}
      </span>
      {(value !== undefined && value !== null) && (
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-semibold tabular-nums text-gray-900">{value}</span>
          {valueSub && <span className="block text-[12px] text-gray-500">{valueSub}</span>}
        </span>
      )}
      {trailing}
      {chevron && <Icon name="right" className="h-4 w-4 shrink-0 text-gray-300" strokeWidth={2} />}
    </>
  );
}

/**
 * One row of a list. leading: avatar or icon · title and subtitle (each on one line) · value on the right (amount, count)
 * · status under the title or beside the value · chevron when it opens something. Without onClick it is not a button.
 */
export function ListRow({ onClick, className = '', ...parts }) {
  const base = `flex w-full items-center gap-3 py-3 text-left ${className}`;
  return (
    <li>
      {onClick
        ? <button type="button" onClick={onClick} className={`${base} active:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}><RowBody {...parts} /></button>
        : <div className={base}><RowBody {...parts} /></div>}
    </li>
  );
}

/**
 * A table on desktop and a list on the phone, from one definition.
 *   columns: [{ label, span (of 12), align: 'right', render: (row) => node }]
 *   mobile:  (row) => props of a row ({ leading, title, subtitle, status, value, chevron… })
 *   onRowClick opens the row; cells that hold their own buttons should stop propagation.
 */
export function DataTable({ columns, rows, rowKey, mobile, onRowClick, at = 'md', head = true }) {
  const desk = at === 'lg' ? { hide: 'lg:hidden', show: 'hidden lg:grid' } : { hide: 'md:hidden', show: 'hidden md:grid' };
  return (
    <div>
      {head && (
        <TableHead at={at}>
          {columns.map((c) => <span key={c.label || c.span} className={`${SPAN[c.span]} ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</span>)}
        </TableHead>
      )}
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => {
          const open = onRowClick ? () => onRowClick(row) : undefined;
          return (
            <li key={rowKey(row)}>
              <div role={open ? 'button' : undefined} tabIndex={open ? 0 : undefined} onClick={open} onKeyDown={open ? (e) => { if (e.key === 'Enter') open(); } : undefined}
                className={`rounded-xl px-2 ${open ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}`}>
                <div className={`${desk.hide} flex items-center gap-3 py-3`}><RowBody {...mobile(row)} /></div>
                <div className={`${desk.show} grid-cols-12 items-center gap-4 py-3`}>
                  {columns.map((c) => (
                    <div key={c.label || c.span} className={`${SPAN[c.span]} min-w-0 text-sm text-gray-700 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(row)}</div>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The <ul> that holds ListRows. */
export function List({ children, className = '' }) {
  return <ul className={`divide-y divide-gray-100 ${className}`}>{children}</ul>;
}
