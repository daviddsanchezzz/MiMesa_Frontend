import { useAuth } from '../context/AuthContext';

/**
 * Where you can go, the same for citas and restaurante. The phone bar shows
 * `primary` (Hoy, Agenda/Reservas, Clientes) with + in the middle and «Más»;
 * the desktop sidebar shows `primary`, then `manage`, then `account`.
 */
export function useNav() {
  const { business, hasRole, isSubscribed, isModuleEnabled, isAppointments } = useAuth();
  const isStaff = business?.role === 'staff';
  const manager = hasRole('manager');
  // Restaurants without a plan lose Clientes and the extras; appointment
  // businesses keep them (an agenda without customers is not usable).
  const locked = !isSubscribed && !isAppointments;

  const primary = [
    { to: '/', label: 'Hoy', icon: 'home', end: true },
    isAppointments
      ? { to: '/agenda', label: 'Agenda', icon: 'calendar' }
      : { to: '/reservations', label: 'Reservas', icon: 'calendar' },
    !isStaff && !locked && { to: '/customers', label: 'Clientes', icon: 'users' },
  ].filter(Boolean);

  const manage = [
    isAppointments && isModuleEnabled('bookings') && { to: '/caja', label: 'Caja', icon: 'cash', section: 'Negocio' },
    !isAppointments && isModuleEnabled('bookings') && { to: '/agenda', label: 'Agenda de citas', icon: 'clock', section: 'Negocio' },
    !isAppointments && manager && { to: '/tables', label: 'Mesas y salas', icon: 'map', section: 'Negocio' },
    !isAppointments && manager && { to: '/exceptions', label: 'Cierres y excepciones', icon: 'alert', section: 'Negocio' },
    isAppointments && manager && { to: '/equipo', label: 'Equipo', hint: 'Profesionales, servicios, horarios y accesos', icon: 'team', section: 'Equipo' },
    !isAppointments && !isStaff && !locked && manager && { to: '/team', label: 'Equipo', icon: 'team', section: 'Equipo' },
    isModuleEnabled('staff') && manager && { to: '/personal', label: isAppointments ? 'Rendimiento' : 'Personal', hint: isAppointments ? 'Facturación, costes y margen de cada profesional' : undefined, icon: 'briefcase', section: 'Equipo' },
    !isAppointments && !isStaff && !locked && manager && { to: '/analytics', label: 'Estadísticas', icon: 'chart', section: 'Negocio' },
    isModuleEnabled('expenses') && hasRole('owner') && { to: '/finanzas', label: 'Finanzas', icon: 'euro', section: 'Negocio' },
    isModuleEnabled('purchases') && manager && { to: '/compras', label: 'Compras', icon: 'cart', section: 'Negocio' },
    !isStaff && isSubscribed && manager && { to: '/publicidad', label: 'Publicidad', icon: 'megaphone', section: 'Crecimiento' },
  ].filter(Boolean);

  const account = [
    manager && { to: '/configuracion', label: 'Configuración', icon: 'cog' },
    { to: '/profile', label: 'Mi perfil', icon: 'user' },
  ].filter(Boolean);

  return { primary, manage, account, newLabel: isAppointments ? 'Nueva cita' : 'Nueva reserva' };
}
