import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmLeave } from '../lib/unsavedChanges';
import { useAuth } from '../context/AuthContext';
import { NegocioSection } from './settings/NegocioSection';
import { SalasSection } from './settings/SalasSection';
import { MesasSection } from './settings/MesasSection';
import { TurnosSection } from './settings/TurnosSection';
import { VacacionesSection } from './settings/VacacionesSection';
import { LimitesSection } from './settings/LimitesSection';
import { PublicoSection } from './settings/PublicoSection';
import { BillingSection } from './settings/BillingSection';
import { PagosSection } from './settings/PagosSection';
import { ProfessionalsSettings, ServicesSettings, HoursSettings } from './agenda/AgendaSettings';
import { BookingLinkSettings } from './agenda/BookingLinkSettings';
import FollowUpSettings from './agenda/FollowUpSettings';
import { useSetMobileHeader } from '../context/MobileHeaderContext';

const svg = (d) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d={d} clipRule="evenodd" /></svg>
);

// Tabs for appointment businesses (salons, therapists...). Restaurant tabs are in TABS.
const APPOINTMENT_TABS = [
  { key: 'profesionales', label: 'Profesionales', desc: 'Quién atiende y en qué horario',
    icon: svg('M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z') },
  { key: 'servicios', label: 'Servicios', desc: 'Qué se reserva, duración y precio',
    icon: svg('M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm2 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 7.25Zm0 3a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z') },
  { key: 'horario', label: 'Horario y cierres', desc: 'Apertura, festivos y vacaciones',
    icon: svg('M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .199.079.39.22.53l3 3a.75.75 0 1 0 1.06-1.06l-2.78-2.78V5Z') },
  { key: 'enlace', label: 'Enlace de reservas', desc: 'Tu página para que los clientes reserven',
    icon: svg('M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Zm-4.464 11.536a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3Z') },
  { key: 'avisos', label: 'Avisos a clientes', desc: 'Recordatorios, te toca volver y opiniones',
    icon: svg('M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6Zm0 16a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 10 18Z') },
];
const APPOINTMENT_KEEP = ['negocio', 'suscripcion'];

const TABS = [
  { key: 'negocio',     label: 'Negocio',      desc: 'Nombre y datos del establecimiento',   icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M4.5 1A2.5 2.5 0 0 0 2 3.5V5c0 .174.018.344.052.508A2 2 0 0 0 2 7v1a2 2 0 0 0 .052 1.492A2 2 0 0 0 2 11v1.5A2.5 2.5 0 0 0 4.5 15h7a2.5 2.5 0 0 0 2.5-2.5V11a2 2 0 0 0-.052-1.508A2 2 0 0 0 14 8V7a2 2 0 0 0-.052-1.492A2 2 0 0 0 14 4V3.5A2.5 2.5 0 0 0 11.5 1h-7Zm5 9.5H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Zm0-3H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Zm0-3H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Z" clipRule="evenodd"/></svg> },
  { key: 'salas',       label: 'Salas',        desc: 'Zonas y espacios del restaurante',      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3A1.5 1.5 0 0 1 7 3.5v3A1.5 1.5 0 0 1 5.5 8h-3A1.5 1.5 0 0 1 1 6.5v-3ZM9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v3A1.5 1.5 0 0 1 13.5 8h-3A1.5 1.5 0 0 1 9 6.5v-3ZM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3ZM9 10.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3Z"/></svg> },
  { key: 'mesas',       label: 'Mesas',        desc: 'Mesas y capacidades',                   icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5V5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 5V3.5ZM7.25 8a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V8Zm3 0a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V8Z"/></svg> },
  { key: 'turnos',      label: 'Turnos',       desc: 'Horarios de comida y cena',             icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v4.27l2.78 1.6a.75.75 0 1 1-.75 1.3L7.4 9.23A.75.75 0 0 1 7 8.5V4a.75.75 0 0 1 .75-.75H8Z" clipRule="evenodd"/></svg> },
  { key: 'vacaciones',  label: 'Vacaciones',   desc: 'Días cerrados y periodos de cierre',    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h3V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 14 6.75v2.5a.75.75 0 0 1-1.5 0v-2.5c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-.5a.75.75 0 0 1 1.5 0v.5A2.75 2.75 0 0 1 11.25 16h-6.5A2.75 2.75 0 0 1 2 13.25v-6.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2ZM11 10.72 9.78 9.5a.75.75 0 0 0-1.06 1.06l1.5 1.5c.3.3.77.3 1.06 0l3-3a.75.75 0 1 0-1.06-1.06L11 10.72Z"/></svg> },
  { key: 'limites',     label: 'Límites',      desc: 'Personas máximas por reserva',          icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2 5.25a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5H2ZM2 9.25a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5H2Z"/><path d="M4.5 3.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM4.5 9.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM10.5 9.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM10.5 3.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3Z" style={{fill:'none',stroke:'currentColor',strokeWidth:0}}/><path fillRule="evenodd" d="M3.5 6a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm-6 4.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" clipRule="evenodd"/></svg> },
  { key: 'publico',     label: 'Página pública', desc: 'Reservas online para clientes',       icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM3.661 4.098A5.476 5.476 0 0 1 6.79 2.86c-.344.984-.543 2.086-.575 3.14H3.188a5.507 5.507 0 0 1 .473-1.902ZM3.188 7.5h3.027c.032 1.054.231 2.156.575 3.14a5.476 5.476 0 0 1-3.129-1.238A5.507 5.507 0 0 1 3.188 7.5ZM7.715 7.5h.57c-.026.96-.19 1.906-.471 2.798-.283-.892-.447-1.838-.473-2.798h.374ZM7.715 6h.374c.026-.96.19-1.906.473-2.798.281.892.445 1.838.47 2.798h-.317Zm2.312 5.14c.344-.984.543-2.086.575-3.14h3.027a5.507 5.507 0 0 1-.473 1.902 5.476 5.476 0 0 1-3.129 1.238ZM12.812 6h-3.027a9.54 9.54 0 0 0-.575-3.14 5.476 5.476 0 0 1 3.129 1.238A5.507 5.507 0 0 1 12.812 6Z"/></svg> },
  { key: 'suscripcion', label: 'Suscripción',   desc: 'Plan, uso mensual y facturación',      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v1A1.5 1.5 0 0 0 2.5 7h11A1.5 1.5 0 0 0 15 5.5v-1A1.5 1.5 0 0 0 13.5 3h-11ZM1 9.5A1.5 1.5 0 0 1 2.5 8h11A1.5 1.5 0 0 1 15 9.5v1a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 10.5v-1ZM4.5 10a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1ZM3 10.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5Z"/></svg> },
  { key: 'pagos',       label: 'Pagos',        desc: 'Depósitos y garantías en reservas',     icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M4 1a.75.75 0 0 1 .75.75V3h6.5V1.75a.75.75 0 0 1 1.5 0V3H13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h.25V1.75A.75.75 0 0 1 4 1Zm-.5 6.5A.5.5 0 0 1 4 7h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Zm0 2.5A.5.5 0 0 1 4 9.5h5a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Zm0 2.5A.5.5 0 0 1 4 12h3a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Z" clipRule="evenodd"/></svg> },
];

const OWNER_ONLY_TABS = new Set(['suscripcion', 'pagos']);

export default function Settings() {
  useSetMobileHeader({ title: 'Configuración' });
  const { hasRole, isAppointments } = useAuth();
  const isOwner = hasRole('owner');
  const tabsForType = isAppointments
    ? [TABS.find((t) => t.key === 'negocio'), ...APPOINTMENT_TABS, ...TABS.filter((t) => APPOINTMENT_KEEP.includes(t.key) && t.key !== 'negocio')]
    : TABS;
  const visibleTabs = tabsForType.filter(t => !OWNER_ONLY_TABS.has(t.key) || isOwner);

  const [searchParams] = useSearchParams();
  const urlTab = visibleTabs.find(t => t.key === searchParams.get('tab'))?.key;
  const [tab, setTabRaw] = useState(urlTab ?? 'negocio');
  const setTab = (key) => { if (key !== tab && confirmLeave()) setTabRaw(key); };
  // Links such as /configuracion?tab=negocio from inside Configuración
  useEffect(() => { if (urlTab) setTabRaw(urlTab); }, [urlTab]);
  const current = visibleTabs.find(t => t.key === tab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="hidden xl:block text-xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-400 mt-0.5">Administra la operativa y ajustes del negocio.</p>
      </div>

      {/* ── Mobile: styled select ── */}
      <div className="lg:hidden">
        <div className="relative">
          <select
            value={tab}
            onChange={e => setTab(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {visibleTabs.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400">
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">{current?.desc}</p>
      </div>

      {/* ── Desktop: sidebar + content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 items-start">
        <nav className="hidden lg:flex flex-col lg:sticky lg:top-6">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                tab === t.key
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
              }`}
            >
              <span className={`transition-colors ${tab === t.key ? 'text-violet-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'negocio'     && <NegocioSection />}
          {tab === 'salas'       && <SalasSection />}
          {tab === 'mesas'       && <MesasSection />}
          {tab === 'turnos'      && <TurnosSection />}
          {tab === 'vacaciones'  && <VacacionesSection />}
          {tab === 'limites'     && <LimitesSection />}
          {tab === 'publico'     && <PublicoSection />}
          {tab === 'suscripcion' && <BillingSection />}
          {tab === 'pagos'       && <PagosSection />}
          {tab === 'profesionales' && <ProfessionalsSettings />}
          {tab === 'servicios'   && <ServicesSettings />}
          {tab === 'horario'     && <HoursSettings />}
          {tab === 'enlace'      && <BookingLinkSettings />}
          {tab === 'avisos'      && <FollowUpSettings />}
        </div>
      </div>
    </div>
  );
}
