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
    isAppointments && isModuleEnabled('bookings') && { to: '/caja', label: 'Caja', icon: 'cash' },
    !isAppointments && isModuleEnabled('bookings') && { to: '/agenda', label: 'Agenda de citas', icon: 'clock' },
    !isAppointments && manager && { to: '/tables', label: 'Mesas y salas', icon: 'map' },
    !isAppointments && manager && { to: '/exceptions', label: 'Cierres y excepciones', icon: 'alert' },
    !isStaff && !locked && manager && { to: '/team', label: 'Equipo', icon: 'team' },
    isModuleEnabled('staff') && manager && { to: '/personal', label: 'Personal', icon: 'briefcase' },
    !isAppointments && !isStaff && !locked && manager && { to: '/analytics', label: 'Estadísticas', icon: 'chart' },
    isModuleEnabled('expenses') && hasRole('owner') && { to: '/finanzas', label: 'Finanzas', icon: 'euro' },
    isModuleEnabled('purchases') && manager && { to: '/compras', label: 'Compras', icon: 'cart' },
    !isStaff && isSubscribed && manager && { to: '/publicidad', label: 'Publicidad', icon: 'megaphone' },
  ].filter(Boolean);

  const account = [
    manager && { to: '/configuracion', label: 'Configuración', icon: 'cog' },
    { to: '/profile', label: 'Mi perfil', icon: 'user' },
  ].filter(Boolean);

  return { primary, manage, account, newLabel: isAppointments ? 'Nueva cita' : 'Nueva reserva' };
}
