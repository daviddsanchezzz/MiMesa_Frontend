import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../lib/nav';
import Icon from '../ui/Icon';
import BusinessLogo from '../ui/BusinessLogo';

function Item({ to, label, icon, end, collapsed, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} title={collapsed ? label : undefined}
      className={({ isActive }) => `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'}`}>
      {({ isActive }) => (
        <>
          <Icon name={icon} className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-gray-400'}`} strokeWidth={isActive ? 1.9 : 1.6} />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}
/**
 * Desktop menu (from 1024 px): light, the same order as the phone bar — Hoy,
 * Agenda/Reservas, Clientes — then the rest of the business, then the account.
 */
export default function Sidebar({ collapsed = false, onDesktopToggleCollapse, devMode = false, onNew }) {
  const { business, memberships, logout, switchBusiness, session } = useAuth();
  const { primary, manage, account, newLabel } = useNav();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const devSidebar = devMode || business?.isDev || false;

  const userName = session?.user?.name || business?.userName || business?.name || 'Usuario';
  const userEmail = session?.user?.email || business?.userEmail || business?.email || '';
  const initial = userName?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const onDocumentClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  return (
    <aside className={`relative ${collapsed ? 'w-[72px]' : 'w-60'} bg-white border-r border-gray-200 flex flex-col shrink-0 select-none`}>
      <div className={`px-3 pt-4 pb-3 flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
        {!devSidebar && business?.logoUrl ? (
          <BusinessLogo business={business} size={40} />
        ) : (
          <img src="/logo.svg" alt="Vetra" className="w-9 h-9 shrink-0" />
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 break-words">{devSidebar ? 'Vetra' : business?.name || 'Vetra'}</p>
            <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{devSidebar ? 'Panel de desarrollo' : 'con Vetra'}</p>
          </div>
        )}
        {onDesktopToggleCollapse && (
          <button type="button" onClick={onDesktopToggleCollapse}
            className={`${collapsed ? 'absolute -right-3 top-6 bg-white border border-gray-200 shadow-sm z-10' : ''} w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors`}
            aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}>
            <Icon name={collapsed ? 'right' : 'left'} className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {!devSidebar && (
        <div className="px-3 pb-2">
          <button type="button" onClick={onNew} title={collapsed ? newLabel : undefined}
            className={`w-full flex items-center justify-center ${collapsed ? '' : 'gap-2'} h-10 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-sm font-semibold transition-colors shadow-sm`}>
            <Icon name="plus" className="w-5 h-5" strokeWidth={2} />
            {!collapsed && newLabel}
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 py-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {devSidebar ? (
          <button type="button" onClick={() => navigate('/dev')}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname === '/dev' ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 font-medium hover:bg-gray-50'}`}>
            <Icon name="briefcase" className="w-5 h-5 text-violet-600" />
            {!collapsed && 'Clientes'}
          </button>
        ) : (
          <>
            <div className="space-y-0.5">
              {primary.map((l) => <Item key={l.to} {...l} collapsed={collapsed} />)}
            </div>
            {manage.length > 0 && (
              <div className="mt-5 space-y-0.5">
                {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Negocio</p>}
                {collapsed && <div className="mx-3 mb-2 h-px bg-gray-100" />}
                {manage.map((l) => <Item key={l.to} {...l} collapsed={collapsed} />)}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="px-3 pb-3 pt-2 border-t border-gray-100">
        {!devSidebar && account.filter((l) => l.to !== '/profile').map((l) => <Item key={l.to} {...l} collapsed={collapsed} />)}

        <div ref={menuRef} className="relative mt-1">
          <button type="button" onClick={() => setMenuOpen((v) => !v)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors`}>
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">{initial}</div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
                <Icon name="down" className="w-4 h-4 text-gray-400" strokeWidth={2} />
              </>
            )}
          </button>

          {menuOpen && (
            <div className={`absolute ${collapsed ? 'left-full ml-2 bottom-0 w-56' : 'left-0 right-0 bottom-full mb-2'} bg-white border border-gray-200 rounded-xl p-1 shadow-lg z-50`}>
              {!devSidebar && memberships.length > 1 && (
                <>
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Negocio activo</p>
                  <div className="max-h-48 overflow-y-auto mb-1">
                    {memberships.map((m) => {
                      const active = m.businessId === business?.id;
                      return (
                        <button key={m.businessId} type="button"
                          onClick={async () => { setMenuOpen(false); if (active) return; await switchBusiness(m.businessId); navigate('/'); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-violet-50 text-violet-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                          <span className="block truncate">{m.businessName}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                </>
              )}
              {!devSidebar && (
                <button type="button" onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Mi perfil</button>
              )}
              <button type="button" onClick={() => logout()}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50">Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
