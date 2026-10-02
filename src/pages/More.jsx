import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';

const Chevron = () => <span className="text-gray-300 text-xl">›</span>;
function Row({ to, title, subtitle }) { return <Link to={to} className="min-h-[64px] px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{title}</p>{subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}</div><Chevron /></Link>; }
function Group({ title, children }) { return <section><h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{title}</h2><div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">{children}</div></section>; }

export default function More() {
  useSetMobileHeader({ title: 'Más', actions: null });
  const { hasRole, isModuleEnabled, isSubscribed } = useAuth();
  return <div className="max-w-3xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-gray-900">Más</h1><p className="text-sm text-gray-500 mt-0.5">Gestión del negocio y ajustes</p></div>
    {isSubscribed && <Group title="Negocio">{hasRole('owner') && isModuleEnabled('expenses') && <><Row to="/finanzas" title="Caja" subtitle="Ingresos y resumen diario" /><Row to="/finanzas" title="Finanzas" subtitle="Gastos, proveedores y resultados" /></>}{hasRole('manager') && isModuleEnabled('purchases') && <Row to="/compras" title="Compras" subtitle="Pedidos y productos" />}</Group>}
    {isSubscribed && isModuleEnabled('staff') && hasRole('manager') && <Group title="Equipo"><Row to="/equipo" title="Equipo" subtitle="Profesionales, servicios, horarios y accesos" /><Row to="/rendimiento" title="Rendimiento" subtitle="Facturación, salarios, comisiones y margen" /></Group>}
    {isSubscribed && hasRole('manager') && <Group title="Crecimiento"><Row to="/publicidad" title="Publicidad" subtitle="Promociones y campañas" /><Row to="/analytics" title="Estadísticas" subtitle="Evolución del negocio" /></Group>}
    {hasRole('manager') && <Group title="Cuenta / Ajustes"><Row to="/configuracion" title="Configuración" subtitle="Operativa y ajustes del negocio" /><Row to="/profile" title="Perfil" subtitle="Cuenta, notificaciones y negocios" /></Group>}
  </div>;
}
