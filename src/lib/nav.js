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

  // Restaurants: Tu local · Números · Equipo · Clientes. Citas: Negocio · Equipo · Crecimiento.
  // One place per thing: what is set once a year lives in Configuración, not here.
  const money = isAppointments ? 'Negocio' : 'Números';
  const manage = [
    isAppointments && isModuleEnabled('bookings') && { to: '/caja', label: 'Caja', hint: 'Cobros del día', icon: 'cash', section: 'Negocio' },
    // Tu local
    !isAppointments && isModuleEnabled('menu') && { to: '/carta', label: 'Carta', hint: 'Platos, precios y alérgenos', icon: 'list', section: 'Tu local' },
    !isAppointments && manager && { to: '/tables', label: 'Mesas y salas', hint: 'Zonas del local y su plano', icon: 'map', section: 'Tu local' },
    !isAppointments && manager && { to: '/horarios', label: 'Horarios y cierres', hint: 'Turnos, festivos y vacaciones', icon: 'clock', section: 'Tu local' },
    !isAppointments && isModuleEnabled('bookings') && { to: '/agenda', label: 'Agenda de citas', icon: 'clock', section: 'Tu local' },
    // Números
    isModuleEnabled('expenses') && hasRole('owner') && { to: '/finanzas', label: 'Finanzas', hint: 'Cuánto ganas, gastos y beneficio', icon: 'euro', section: money },
    isModuleEnabled('purchases') && manager && { to: '/compras', label: 'Compras', hint: 'Facturas, pedidos y proveedores', icon: 'cart', section: money },
    !isAppointments && !isStaff && !locked && manager && { to: '/analytics', label: 'Estadísticas', hint: 'Reservas, horas punta y clientes', icon: 'chart', section: money },
    isAppointments && isModuleEnabled('bookings') && manager && { to: '/analytics', label: 'Estadísticas', hint: 'Servicios, horas punta y clientes', icon: 'chart', section: 'Negocio' },
    // Equipo
    isAppointments && manager && { to: '/equipo', label: 'Equipo', hint: 'Profesionales, servicios, horarios y accesos', icon: 'team', section: 'Equipo' },
    isModuleEnabled('staff') && manager && { to: '/personal', label: isAppointments ? 'Rendimiento' : 'Personal', hint: isAppointments ? 'Facturación, costes y margen de cada profesional' : 'Turnos, ausencias y costes', icon: 'briefcase', section: 'Equipo' },
    // Whoever is linked to an employee of Personal sees their own shifts (staff always, to be told if they are not linked)
    !isAppointments && isModuleEnabled('staff') && (isStaff || business?.professionalId) && { to: '/mi-horario', label: 'Mi horario', hint: 'Tus turnos de la semana', icon: 'clock', section: 'Equipo' },
    !isAppointments && !isStaff && !locked && manager && { to: '/team', label: 'Accesos', hint: 'Quién puede entrar a la app', icon: 'team', section: 'Equipo' },
    // Clientes (citas: Crecimiento)
    !isStaff && isSubscribed && manager && { to: '/publicidad', label: 'Publicidad', hint: 'Emails y promociones', icon: 'megaphone', section: isAppointments ? 'Crecimiento' : 'Clientes' },
    !isAppointments && manager && { to: '/pagina-reservas', label: 'Tu página de reservas', hint: 'El enlace que ven tus clientes', icon: 'link', section: 'Clientes' },
  ].filter(Boolean);

  const sections = isAppointments ? ['Negocio', 'Equipo', 'Crecimiento'] : ['Tu local', 'Números', 'Equipo', 'Clientes'];

  const account = [
    manager && { to: '/configuracion', label: 'Configuración', icon: 'cog' },
    { to: '/profile', label: 'Mi perfil', icon: 'user' },
  ].filter(Boolean);

  // The + button: what you can create from anywhere, most urgent first
  const quick = [
    isAppointments && isModuleEnabled('bookings') && { key: 'sale', label: 'Cobrar', hint: 'Cliente sin reserva', icon: 'cash', tone: 'primary' },
    { key: 'booking', label: isAppointments ? 'Nueva cita' : 'Nueva reserva', hint: isAppointments ? 'Reservar un hueco en la agenda' : 'Apuntar una reserva', icon: 'calendar' },
    isModuleEnabled('expenses') && hasRole('owner') && { key: 'expense', label: 'Nuevo gasto', hint: 'Una factura, un pago o una compra', icon: 'euro' },
    !isStaff && !locked && { key: 'customer', label: 'Nuevo cliente', hint: 'Añadir su ficha', icon: 'users' },
  ].filter(Boolean);

  return { primary, manage, sections, account, quick, newLabel: 'Crear' };
}
