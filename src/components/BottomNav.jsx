import { NavLink, useLocation } from 'react-router-dom';
import { useNav } from '../lib/nav';
import Icon from '../ui/Icon';

function Tab({ to, label, icon, end, forceActive }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-medium transition-colors ${
        (forceActive ?? isActive) ? 'text-violet-700' : 'text-gray-500 active:text-gray-900'}`}>
      {({ isActive }) => {
        const on = forceActive ?? isActive;
        return (
          <>
            <Icon name={icon} className="w-6 h-6" strokeWidth={on ? 2 : 1.6} />
            <span className={on ? 'font-semibold' : ''}>{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

/**
 * Phone and tablet bar (below 1024 px): Hoy · Agenda/Reservas · + · Clientes · Más,
 * the same in citas and restaurante. The + creates a cita or a reserva.
 */
export default function BottomNav({ onNew }) {
  const { primary, newLabel } = useNav();
  const { pathname } = useLocation();
  const inPrimary = primary.some((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to)));
  const [first, second, third] = primary;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal">
      <div className="grid grid-cols-5 h-16 max-w-xl mx-auto">
        {first ? <Tab {...first} /> : <span />}
        {second ? <Tab {...second} /> : <span />}
        <div className="flex items-center justify-center">
          <button type="button" onClick={onNew} aria-label={newLabel}
            className="w-14 h-14 -mt-6 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center active:scale-95 transition-transform ring-4 ring-white">
            <Icon name="plus" className="w-7 h-7" strokeWidth={2.2} />
          </button>
        </div>
        {third ? <Tab {...third} /> : <span />}
        <Tab to="/mas" label="Más" icon="more" forceActive={!inPrimary || pathname === '/mas'} />
      </div>
    </nav>
  );
}
