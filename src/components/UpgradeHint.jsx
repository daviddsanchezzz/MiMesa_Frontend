import { Link } from 'react-router-dom';

// Short note that a feature needs another plan, with the way to get it.
export default function UpgradeHint({ children, plan = 'Pro', className = '' }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 ${className}`}>
      <p className="text-sm text-violet-900">
        <span className="mr-1.5 inline-block rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white align-middle">{plan}</span>
        {children}
      </p>
      <Link to="/configuracion?tab=suscripcion" className="text-sm font-semibold text-violet-700 hover:text-violet-900 whitespace-nowrap">Ver planes</Link>
    </div>
  );
}
