import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { confirmLeave } from '../lib/unsavedChanges';
import { useAuth } from '../context/AuthContext';
import { NegocioSection } from './settings/NegocioSection';
import TablesSummary from './settings/TablesSummary';
import { TurnosSection } from './settings/TurnosSection';
import { VacacionesSection } from './settings/VacacionesSection';
import { LimitesSection } from './settings/LimitesSection';
import { PublicoSection } from './settings/PublicoSection';
import { BillingSection } from './settings/BillingSection';
import { PagosSection } from './settings/PagosSection';
import { SpacesSettings, ServicesSettings, HoursSettings } from './agenda/AgendaSettings';
import { BookingLinkSettings } from './agenda/BookingLinkSettings';
import FollowUpSettings from './agenda/FollowUpSettings';
import PacksSettings from './agenda/PacksSettings';
import LoyaltySettings from './agenda/LoyaltySettings';
import PolicySettings from './agenda/PolicySettings';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Icon from '../ui/Icon';

// Same groups for citas and restaurante; inside, what each sector needs.
// key = the ?tab= of the section (kept so old links still work).
const GROUPS = {
  appointments: [
    { title: 'Negocio', items: [{ key: 'negocio', label: 'Datos del negocio', desc: 'Nombre, logo, dirección y contacto', icon: 'building' }] },
    { title: 'Qué se reserva', items: [
      { key: 'espacios', label: 'Salas y equipamiento', desc: 'Recursos adicionales para las reservas', icon: 'map' },
      { key: 'servicios', label: 'Servicios', desc: 'Duración, precio y quién lo hace', icon: 'list' },
    ] },
    { title: 'Cuándo', items: [{ key: 'horario', label: 'Horario y cierres', desc: 'Cuándo abres, festivos y vacaciones', icon: 'clock' }] },
    { title: 'Clientes', items: [
      { key: 'bonos', label: 'Bonos y packs', desc: 'Sesiones que vendes por adelantado', icon: 'receipt' },
      { key: 'fidelizacion', label: 'Fidelización', desc: 'Premio cada cierto número de visitas', icon: 'sparkle' },
    ] },
    { title: 'Reservas online', items: [
      { key: 'enlace', label: 'Tu página de reservas', desc: 'El enlace que compartes con tus clientes', icon: 'link' },
      { key: 'normas', label: 'Normas de reserva', desc: 'Hasta cuándo pueden cambiar o cancelar', icon: 'alert' },
      { key: 'avisos', label: 'Avisos a clientes', desc: 'Recordatorios, te toca volver y opiniones', icon: 'chat' },
    ] },
    { title: 'Facturación', items: [{ key: 'suscripcion', label: 'Suscripción', desc: 'Plan, uso y facturas', icon: 'cash', owner: true }] },
  ],
  restaurant: [
    { title: 'Negocio', items: [{ key: 'negocio', label: 'Datos del negocio', desc: 'Nombre, logo, dirección y contacto', icon: 'building' }] },
    { title: 'Reservas online', items: [
      { key: 'limites', label: 'Normas de reserva', desc: 'Antelación, personas máximas y duración', icon: 'alert' },
      { key: 'pagos', label: 'Señales y garantías', desc: 'Cobrar por adelantado o con tarjeta', icon: 'euro', owner: true },
    ] },
    { title: 'Facturación', items: [{ key: 'suscripcion', label: 'Suscripción', desc: 'Plan, uso y facturas', icon: 'cash', owner: true }] },
  ],
};

// Old tabs that now live inside another screen (links keep working).
const ALIASES = { salas: 'mesas', vacaciones: 'turnos' };
// Restaurant: these are no longer settings but part of Tu local / Clientes
const MOVED = { mesas: '/tables', salas: '/tables', turnos: '/horarios', vacaciones: '/horarios?tab=vacaciones', publico: '/pagina-reservas' };

function TablesAndRooms() {
  return <TablesSummary />;
}
function ShiftsAndClosures() {
  return <div className="space-y-10"><TurnosSection /><VacacionesSection /></div>;
}

const SECTIONS = {
  espacios: SpacesSettings,
  negocio: NegocioSection, mesas: TablesAndRooms, turnos: ShiftsAndClosures, normas: PolicySettings,
  limites: LimitesSection, publico: BookingLinkSettings, suscripcion: BillingSection, pagos: PagosSection,
  servicios: ServicesSettings, horario: HoursSettings, enlace: BookingLinkSettings, avisos: FollowUpSettings, bonos: PacksSettings, fidelizacion: LoyaltySettings,
};

/**
 * Configuración like a phone's settings: a grouped list; each setting opens
 * on its own screen. On desktop the list stays on the left.
 */
export default function Settings() {
  const { hasRole, isAppointments } = useAuth();
  const isOwner = hasRole('owner');
  const groups = GROUPS[isAppointments ? 'appointments' : 'restaurant']
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.owner || isOwner) }))
    .filter((g) => g.items.length);
  const all = groups.flatMap((g) => g.items);

  const [searchParams, setSearchParams] = useSearchParams();
  const askedTab = ALIASES[searchParams.get('tab')] || searchParams.get('tab');
  const urlTab = all.find((t) => t.key === askedTab)?.key || null;
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const tab = urlTab || (isDesktop ? 'negocio' : null);
  const open = (key) => {
    if (key === tab || !confirmLeave()) return;
    setSearchParams({ tab: key });
    window.scrollTo?.(0, 0);
    document.querySelector('main')?.scrollTo?.(0, 0);
  };
  const current = all.find((t) => t.key === tab);
  const Current = tab ? SECTIONS[tab] : null;
  // Phone: the header names the setting you are in; the back link returns to the list.
  useSetMobileHeader({ title: current && !isDesktop ? current.label : 'Configuración' });

  const list = (
    <nav className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-1 lg:px-3 mb-1.5 text-[13px] lg:text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g.title}</p>
          <ul className="rounded-2xl lg:rounded-none border lg:border-0 border-gray-200 divide-y lg:divide-y-0 divide-gray-100 overflow-hidden bg-white">
            {g.items.map((t) => {
              const active = isDesktop && t.key === tab;
              return (
                <li key={t.key}>
                  <button type="button" onClick={() => open(t.key)}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 lg:px-3 lg:py-2 lg:rounded-lg transition-colors ${active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                    <span className={`w-9 h-9 lg:w-auto lg:h-auto rounded-xl lg:rounded-none flex items-center justify-center bg-gray-100 lg:bg-transparent ${active ? 'text-violet-600' : 'text-gray-600 lg:text-gray-400'}`}>
                      <Icon name={t.icon} className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] lg:text-sm ${active ? 'font-semibold text-gray-900' : 'font-medium text-gray-900 lg:text-gray-600'}`}>{t.label}</span>
                      <span className="block text-xs text-gray-500 truncate lg:hidden">{t.desc}</span>
                    </span>
                    <Icon name="right" className="w-4 h-4 text-gray-300 lg:hidden" strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (isAppointments && askedTab === 'profesionales') return <Navigate to="/equipo" replace />;
  // What moved out of Configuración into its own screen (old links keep working)
  if (!isAppointments && MOVED[searchParams.get('tab')]) return <Navigate to={MOVED[searchParams.get('tab')]} replace />;
  return (
    <div className="w-full">
      <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900 mb-6">Configuración</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-10 items-start">
        <div className={`${tab && !isDesktop ? 'hidden' : ''} lg:block lg:sticky lg:top-6`}>{list}</div>
        {Current && (
          <div className="min-w-0">
            {!isDesktop && (
              <button type="button" onClick={() => confirmLeave() && setSearchParams({})}
                className="mb-2 -ml-1 inline-flex items-center gap-0.5 text-sm text-violet-700 font-medium">
                <Icon name="left" className="w-4 h-4" strokeWidth={2} />Ajustes
              </button>
            )}
            <div className="mb-5">
              <h2 className="hidden lg:block text-xl font-semibold text-gray-900">{current.label}</h2>
              <p className="text-sm text-gray-500 lg:mt-0.5">{current.desc}</p>
            </div>
            <Current />
          </div>
        )}
      </div>
    </div>
  );
}
