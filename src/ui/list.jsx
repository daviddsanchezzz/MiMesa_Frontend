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

/**
 * One row of a list. leading: avatar or icon · title and subtitle (each on one line) · value on the right (amount, count)
 * · status under the title or beside the value · chevron when it opens something. Without onClick it is not a button.
 */
export function ListRow({ leading, title, subtitle, status, value, valueSub, trailing, chevron = false, onClick, className = '' }) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-gray-900">{title}</span>
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
  const base = `flex w-full items-center gap-3 py-3 text-left ${className}`;
  return (
    <li>
      {onClick
        ? <button type="button" onClick={onClick} className={`${base} active:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}>{body}</button>
        : <div className={base}>{body}</div>}
    </li>
  );
}

/** The <ul> that holds ListRows. */
export function List({ children, className = '' }) {
  return <ul className={`divide-y divide-gray-100 ${className}`}>{children}</ul>;
}
