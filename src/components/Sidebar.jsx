import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const IconTeam = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path fillRule="evenodd" d="M10 1.75a.75.75 0 0 1 .33.077l6.5 3.25a.75.75 0 0 1 .42.673v4.786a8.25 8.25 0 1 1-16.5 0V5.75a.75.75 0 0 1 .42-.673l6.5-3.25A.75.75 0 0 1 10 1.75Zm3.03 6.72a.75.75 0 1 0-1.06-1.06L9.25 10.13l-1.22-1.22a.75.75 0 1 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.25-3.25Z" clipRule="evenodd" />
  </svg>
);

const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
  </svg>
);

const IconTable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.272 2.272 0 0 1 1 14.74l-.01-9.5Zm8.26 9.52v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.615c0 .414.336.75.75.75h5.305a.75.75 0 0 0 .705-.74Zm1.5 0a.75.75 0 0 0 .705.74h5.245a.75.75 0 0 0 .75-.75v-.615a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625Zm6.75-3.63v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.245a.75.75 0 0 0 .75-.75Zm-8.25 0v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75ZM17.5 7.5v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75h5.245a.75.75 0 0 0 .75-.75Zm-8.25 0v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75Z" clipRule="evenodd" />
  </svg>
);

const IconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
  </svg>
);

const links = [
  { to: '/', label: 'Dashboard', icon: <IconHome /> },
  { to: '/reservations', label: 'Reservas', icon: <IconCalendar /> },
  { to: '/customers', label: 'Clientes', icon: <IconUsers /> },
];

const secondaryLinks = [
  { to: '/tables', label: 'Mesas', icon: <IconTable /> },
];

const configLinks = [
  { to: '/configuracion', label: 'Configuracion', icon: <IconSettings /> },
];

export default function Sidebar({ isOpen, onClose }) {
  const { business, memberships, logout, hasRole, switchBusiness, session } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const menuRef = useRef(null);
  const isStaff = business?.role === 'staff';

  const mainLinks = isStaff ? links.filter((link) => link.to !== '/customers') : links;
  const lowerLinks = isStaff
    ? []
    : [...secondaryLinks, ...(hasRole('manager') ? [{ to: '/team', label: 'Equipo', icon: <IconTeam /> }] : [])];
  const visibleConfigLinks = isStaff ? [] : configLinks;
  const navLinks = [...mainLinks, ...lowerLinks].filter((link) => !(isSmallScreen && link.to === '/tables'));

  const userName = session?.user?.name || business?.userName || business?.name || 'Usuario';
  const userEmail = session?.user?.email || business?.userEmail || business?.email || '';
  const initial = userName?.[0]?.toUpperCase() || 'U';

  const handleNavClick = () => {
    setMenuOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    const onDocumentClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsSmallScreen(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <aside
      className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-64 lg:w-56 bg-slate-900 flex flex-col shrink-0 select-none
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Tableo" className="w-8 h-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold leading-tight">Tableo</p>
            {memberships.length > 1 ? (
              <select
                value={business?.id ?? ''}
                onChange={(e) => { switchBusiness(e.target.value); handleNavClick(); }}
                className="mt-0.5 w-full bg-transparent text-slate-400 text-xs focus:outline-none cursor-pointer truncate"
              >
                {memberships.map((m) => (
                  <option key={m.businessId} value={m.businessId} className="bg-slate-800 text-slate-200">
                    {m.businessName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-slate-400 text-xs truncate leading-tight mt-0.5">{business?.name}</p>
            )}          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-2 pb-2">Menu</p>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-sm font-medium transition-all duration-100 ${
                  isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-3 pb-4 border-t border-slate-700/50 pt-3">
        {visibleConfigLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-slate-200 text-xs font-medium truncate">{userName}</p>
              <p className="text-slate-400 text-xs truncate">{userEmail}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500 shrink-0">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-lg">
              <button
                onClick={() => { navigate('/profile'); handleNavClick(); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Perfil
              </button>
              <button
                onClick={() => { logout(); if (onClose) onClose(); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

