import { lazy, Suspense, useEffect, useState } from 'react';
import { MobileHeaderProvider, useMobileHeader } from './context/MobileHeaderContext';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query';
const QuickSaleModal = lazy(() => import('./pages/agenda/QuickSaleModal'));
const CustomerForm = lazy(() => import('./components/CustomerForm'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const RestaurantToday = lazy(() => import('./pages/today/RestaurantToday'));
const Tables = lazy(() => import('./pages/Tables'));
const Reservas = lazy(() => import('./pages/reservas/Reservas'));
const Customers = lazy(() => import('./pages/clients/Customers'));
const CustomerFile = lazy(() => import('./pages/clients/CustomerFile'));
const Settings = lazy(() => import('./pages/Settings'));
const Exceptions = lazy(() => import('./pages/Exceptions'));
const Team = lazy(() => import('./pages/Team'));
const Profile = lazy(() => import('./pages/Profile'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const DevDashboard = lazy(() => import('./pages/DevDashboard'));
import PaymentIssueBanner from './components/PaymentIssueBanner';
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const Publicidad = lazy(() => import('./pages/Publicidad'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Estadisticas = lazy(() => import('./pages/Estadisticas'));
const MySchedule = lazy(() => import('./pages/MySchedule'));
const Personal = lazy(() => import('./pages/Personal'));
const Finanzas = lazy(() => import('./pages/Finanzas'));
const Compras = lazy(() => import('./pages/Compras'));
const Costes = lazy(() => import('./pages/Costes'));
const Carta = lazy(() => import('./pages/Carta'));
const Horarios = lazy(() => import('./pages/Horarios'));
const MiWeb = lazy(() => import('./pages/MiWeb'));
const SettingPage = lazy(() => import('./pages/SettingPage'));
const ServicesSettings = lazy(() => import('./pages/agenda/AgendaSettings').then((m) => ({ default: m.ServicesSettings })));
const HoursSettings = lazy(() => import('./pages/agenda/AgendaSettings').then((m) => ({ default: m.HoursSettings })));
const PacksSettings = lazy(() => import('./pages/agenda/PacksSettings'));
const LoyaltySettings = lazy(() => import('./pages/agenda/LoyaltySettings'));
const PaginaReservas = lazy(() => import('./pages/PaginaReservas'));
const InvoiceUpload = lazy(() => import('./pages/invoices/InvoiceUpload'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));
const Agenda = lazy(() => import('./pages/Agenda'));
const AppointmentsToday = lazy(() => import('./pages/today/AppointmentsToday'));
const PublicReservation = lazy(() => import('./pages/PublicReservation'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const PublicSlugPage = lazy(() => import('./pages/PublicSlugPage'));
const LegacyPublicPage = lazy(() => import('./pages/LegacyPublicPage'));
const PublicBookingCancel = lazy(() => import('./pages/PublicBookingCancel'));
const PublicCancel = lazy(() => import('./pages/PublicCancel'));
const PublicUnsubscribe = lazy(() => import('./pages/PublicUnsubscribe'));
const Legal = lazy(() => import('./pages/Legal'));
const More = lazy(() => import('./pages/More'));
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import QuickActionMenu from './components/QuickActionMenu';
import { useNav } from './lib/nav';
import { MoreMenu } from './ui/kit';
import Icon from './ui/Icon';
import BusinessLogo from './ui/BusinessLogo';

const DESKTOP_QUERY = '(min-width: 1024px)';
import Modal from './components/Modal';
import ReservationForm from './components/ReservationForm';
import { Toaster } from 'sonner';
import { notify } from './lib/notify';
import { ConfirmHost } from './ui/confirm';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-white">
      <img src="/logo.svg" alt="" className="w-10 h-10 animate-pulse" />
    </div>
  );
}
// While a screen's code arrives the menu and bar stay put; only the content waits.
function PageFallback() {
  return <div className="h-40" aria-busy="true" />;
}

// After login, fetch the code of the everyday screens in the background so
// switching tabs never waits for a download.
let prefetched = false;
function prefetchScreens(isAppointments) {
  if (prefetched) return;
  prefetched = true;
  const go = () => {
    const list = isAppointments
      ? [() => import('./pages/Agenda'), () => import('./pages/today/AppointmentsToday'), () => import('./pages/Caja')]
      : [() => import('./pages/reservas/Reservas'), () => import('./pages/today/RestaurantToday'), () => import('./pages/Reservations')];
    [...list, () => import('./pages/clients/Customers'), () => import('./pages/clients/CustomerFile'), () => import('./pages/More'),
      () => import('./pages/Settings'), () => import('./pages/Profile')].forEach((load) => load().catch(() => {}));
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 3000 });
  else setTimeout(go, 1500);
}

function MobileHeader({ devMode, onLogout }) {
  const { title, actions, action, menu } = useMobileHeader();
  const { business } = useAuth();
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white/95 backdrop-blur border-b border-gray-100 shrink-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {business?.logoUrl
          ? <BusinessLogo business={business} size={30} />
          : <img src="/logo.svg" alt="Vetra" className="w-7 h-7 shrink-0" />}
        <p className="text-[17px] font-semibold text-gray-900 truncate">{title || business?.name || 'Vetra'}</p>
      </div>
      {devMode ? (
        <div className="flex items-center gap-1 -mr-2">
          {action && (
            <button type="button" onClick={action.onClick} aria-label={`Nuevo: ${action.label}`}
              className="flex items-center gap-1 text-violet-700 px-2 py-1.5 rounded-lg text-[15px] font-semibold active:bg-violet-50">
              <Icon name="plus" className="w-5 h-5" strokeWidth={2} />{action.label}
            </button>
          )}
          <button type="button" onClick={onLogout} aria-label="Cerrar sesión" className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 active:bg-gray-100">
            <Icon name="logout" className="w-5 h-5" />
          </button>
        </div>
      ) : actions ?? (action || menu ? (
        <div className="flex shrink-0 items-center gap-0.5 -mr-2">
          <MoreMenu items={menu} />
          {action && <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 flex items-center gap-1 text-violet-700 px-2 py-1.5 rounded-lg text-[15px] font-semibold active:bg-violet-50"
          aria-label={`Nuevo: ${action.label}`}
        >
          <Icon name="plus" className="w-5 h-5" strokeWidth={2} />
          {action.label}
        </button>}
        </div>
      ) : null)}
    </div>
  );
}

function ImpersonationBanner({ impersonation, onStop }) {
  if (!impersonation) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3">
      <div className="bg-amber-100/95 border border-amber-200 text-amber-900 rounded-full shadow-sm px-3 py-2 flex items-center gap-3">
        <p className="text-sm font-semibold whitespace-nowrap">
          Estas suplantando a {impersonation.userName || 'usuario'}
        </p>
        <button
          type="button"
          onClick={onStop}
          className="text-xs font-semibold bg-white/80 border border-amber-300 hover:bg-white rounded-full px-3 py-1 transition-colors"
        >
          Salir
        </button>
      </div>
    </div>
  );
}

function LayoutShell({ children, fullBleed = false, devMode = false }) {
  const location = useLocation();
  const professionalDetail = location.pathname === '/equipo' && new URLSearchParams(location.search).has('pro');
  const { business, loading, impersonation, stopImpersonation, isAppointments, logout } = useAuth();
  const containedScroll = ['/customers', '/equipo', '/agenda'].includes(location.pathname) || (location.pathname === '/personal' && isAppointments);
  const navigate = useNavigate();
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('sidebar:desktop-collapsed') === '1'; } catch { return false; }
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });
  const [newRsvModal, setNewRsvModal] = useState(false);
  const [quickMenu, setQuickMenu] = useState(false);
  const [quickModal, setQuickModal] = useState(null); // 'sale' | 'customer'
  const { quick } = useNav();

  const handleReservationCreated = () => {
    window.dispatchEvent(new CustomEvent('reservation:created'));
    notify.success('Reserva creada');
  };
  const openNew = () => (isAppointments ? navigate('/agenda?new=1') : setNewRsvModal(true));
  // The + opens the menu; with a single option there is nothing to choose
  const openQuick = () => (quick.length > 1 ? setQuickMenu(true) : openNew());
  const pickQuick = (key) => {
    setQuickMenu(false);
    if (key === 'booking') openNew();
    else if (key === 'expense') navigate('/finanzas?new=expense');
    else setQuickModal(key);
  };

  // Other screens can open "new reservation" (e.g. an empty slot in Reservas).
  useEffect(() => {
    const onOpen = () => openNew();
    window.addEventListener('app:new', onOpen);
    return () => window.removeEventListener('app:new', onOpen);
  });

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('sidebar:desktop-collapsed', desktopSidebarCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [desktopSidebarCollapsed]);

  if (loading) return <LoadingScreen />;
  if (!business) return <Navigate to="/login" replace />;
  if (!business.id && !business.isDev) return <Navigate to="/onboarding" replace />;

  const showBottomNav = !isDesktop && !devMode;
  if (!devMode) prefetchScreens(isAppointments);

  return (
    <MobileHeaderProvider>
    <div className="flex h-[100dvh] bg-white overflow-hidden relative">
      <ImpersonationBanner
        impersonation={impersonation}
        onStop={async () => {
          await stopImpersonation();
          window.location.href = '/dev';
        }}
      />
      {isDesktop && (
        <Sidebar
          collapsed={desktopSidebarCollapsed}
          onDesktopToggleCollapse={() => setDesktopSidebarCollapsed((v) => !v)}
          devMode={devMode}
          onNew={openQuick}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!['/agenda', '/reservations'].includes(location.pathname) && <MobileHeader devMode={devMode} onLogout={() => logout()} />}
        <main className={containedScroll
          ? `flex-1 min-h-0 overflow-hidden flex flex-col px-4 ${location.pathname === '/agenda' ? 'pt-[calc(1rem+env(safe-area-inset-top))]' : professionalDetail ? 'pt-2' : 'pt-4'} lg:px-8 lg:pt-4 ${showBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''} ${impersonation ? 'pt-16 lg:pt-20' : ''}`
          : fullBleed
          ? `flex-1 overflow-hidden flex flex-col ${showBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}`
          : `flex-1 overflow-auto px-4 ${['/agenda', '/reservations'].includes(location.pathname) ? 'pt-[calc(1rem+env(safe-area-inset-top))]' : 'pt-4'} lg:px-8 lg:pt-7 ${showBottomNav ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-10'} ${impersonation ? 'pt-16 lg:pt-20' : ''}`}>
          {!devMode && !fullBleed && <PaymentIssueBanner />}
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
        </main>
      </div>
      {showBottomNav && <BottomNav onNew={openQuick} />}
      {!devMode && quickMenu && <QuickActionMenu actions={quick} onPick={pickQuick} onClose={() => setQuickMenu(false)} />}
      {!devMode && quickModal === 'sale' && (
        <Suspense fallback={null}><QuickSaleModal onClose={() => setQuickModal(null)} onDone={() => setQuickModal(null)} /></Suspense>
      )}
      {!devMode && quickModal === 'customer' && (
        <Modal title="Nuevo cliente" onClose={() => setQuickModal(null)}>
          <Suspense fallback={null}>
            <CustomerForm onSave={() => { setQuickModal(null); notify.success('Cliente añadido'); }} onCancel={() => setQuickModal(null)} />
          </Suspense>
        </Modal>
      )}
      {!devMode && newRsvModal && (
        <Modal title="Nueva reserva" onClose={() => setNewRsvModal(false)} size="md">
          <ReservationForm
            onSave={() => {
              setNewRsvModal(false);
              handleReservationCreated();
            }}
            onCancel={() => setNewRsvModal(false)}
          />
        </Modal>
      )}
      <ConfirmHost />
      <Toaster
        position={isDesktop ? 'bottom-right' : 'top-center'}
        richColors
        closeButton
        toastOptions={{ duration: 3200 }}
      />
    </div>
    </MobileHeaderProvider>
  );
}

function PrivateLayout({ children }) {
  return <LayoutShell>{children}</LayoutShell>;
}

// Full-bleed layout: no padding, for map/canvas views
function FullBleedLayout({ children }) {
  return <LayoutShell fullBleed>{children}</LayoutShell>;
}

function DevLayout({ children }) {
  return <LayoutShell devMode>{children}</LayoutShell>;
}

function PublicRoute({ children }) {
  const { business, loading } = useAuth();
  if (loading) return null;
  if (business) return <Navigate to="/" replace />;
  return children;
}

function DevRoute({ children }) {
  const { isDev, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isDev) return <Navigate to="/" replace />;
  return children;
}

function DevRedirect({ children }) {
  const { isDev, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isDev) return <Navigate to="/dev" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { business, loading, session } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (business?.id || business?.isDev) return <Navigate to="/" replace />;
  return children;
}

function RoleRoute({ minRole, children }) {
  const { loading, hasRole } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!hasRole(minRole)) return <Navigate to="/" replace />;
  return children;
}

// Pages that only make sense for restaurants (tables, rooms, shifts...).
function RestaurantRoute({ children }) {
  const { loading, isAppointments } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAppointments) return <Navigate to="/" replace />;
  return children;
}

// Estadísticas: one address, a screen per kind of business.
function StatsPage() {
  const { isAppointments } = useAuth();
  return isAppointments ? <Estadisticas /> : <Analytics />;
}

const Caja = lazy(() => import('./pages/Caja'));
const AppointmentTeam = lazy(() => import('./pages/team/AppointmentTeam'));
const ProfessionalTeam = lazy(() => import('./pages/team/ProfessionalTeam'));

// Personal: appointment businesses see pay and results per professional.
function PersonalPage() {
  const { isAppointments } = useAuth();
  return isAppointments ? <AppointmentTeam /> : <Personal />;
}
function TeamPage() {
  const { isAppointments } = useAuth();
  return isAppointments ? <Navigate to="/equipo" replace /> : <Team />;
}
function HomeDashboard() {
  const { isAppointments } = useAuth();
  return isAppointments ? <AppointmentsToday /> : <RestaurantToday />;
}

function ModuleRoute({ moduleKey, children }) {
  const { loading, isModuleEnabled } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isModuleEnabled(moduleKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public booking page: vetrareserve.com/{slug}; inside the app, /r/{slug} */}
          <Route path="/r/:slug" element={<PublicSlugPage />} />
          <Route path="/r/:slug/cancelar" element={<PublicSlugPage cancel />} />
          {/* Old addresses: move to the slug address, or work as before */}
          <Route path="/public/:businessId/reserve" element={<LegacyPublicPage><PublicReservation /></LegacyPublicPage>} />
          <Route path="/public/:businessId/cita" element={<LegacyPublicPage><PublicBooking /></LegacyPublicPage>} />
          <Route path="/public/:businessId/cita/cancelar" element={<PublicBookingCancel />} />
          <Route path="/public/cancel"       element={<PublicCancel />} />
          <Route path="/public/unsubscribe"  element={<PublicUnsubscribe />} />
          <Route path="/legal/:doc"          element={<Legal />} />
          {/* Auth — public only (redirect to / if already logged in) */}
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
          {/* Auth flows — always public */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/invite"          element={<AcceptInvite />} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/bienvenida" element={<RoleRoute minRole="manager"><SetupWizard /></RoleRoute>} />
          <Route path="/dev"        element={<DevRoute><DevLayout><DevDashboard /></DevLayout></DevRoute>} />
          <Route path="/"             element={<DevRedirect><PrivateLayout><HomeDashboard /></PrivateLayout></DevRedirect>} />
          <Route path="/rooms"        element={<Navigate to="/tables" replace />} />
          <Route path="/tables"       element={<RestaurantRoute><RoleRoute minRole="manager"><FullBleedLayout><Tables /></FullBleedLayout></RoleRoute></RestaurantRoute>} />
          <Route path="/reservations" element={<RestaurantRoute><PrivateLayout><Reservas /></PrivateLayout></RestaurantRoute>} />
          <Route path="/customers"    element={<RoleRoute minRole="manager"><PrivateLayout><Customers /></PrivateLayout></RoleRoute>} />
          <Route path="/customers/:id" element={<RoleRoute minRole="manager"><PrivateLayout><CustomerFile /></PrivateLayout></RoleRoute>} />
          <Route path="/exceptions"   element={<Navigate to="/horarios?tab=cierres" replace />} />
          <Route path="/web"          element={<RestaurantRoute><ModuleRoute moduleKey="web"><RoleRoute minRole="manager"><PrivateLayout><MiWeb /></PrivateLayout></RoleRoute></ModuleRoute></RestaurantRoute>} />
          <Route path="/horarios"     element={<RestaurantRoute><RoleRoute minRole="manager"><PrivateLayout><Horarios /></PrivateLayout></RoleRoute></RestaurantRoute>} />
          <Route path="/pagina-reservas" element={<RoleRoute minRole="manager"><PrivateLayout><PaginaReservas /></PrivateLayout></RoleRoute>} />
          <Route path="/servicios"    element={<ModuleRoute moduleKey="bookings"><RoleRoute minRole="manager"><PrivateLayout><SettingPage title="Servicios" subtitle="Duración, precio y quién lo hace"><ServicesSettings /></SettingPage></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/horario"      element={<ModuleRoute moduleKey="bookings"><RoleRoute minRole="manager"><PrivateLayout><SettingPage title="Horario y cierres" subtitle="Cuándo abres, festivos y vacaciones"><HoursSettings /></SettingPage></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/bonos"        element={<ModuleRoute moduleKey="bookings"><RoleRoute minRole="manager"><PrivateLayout><SettingPage title="Bonos y packs" subtitle="Sesiones que vendes por adelantado"><PacksSettings /></SettingPage></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/fidelizacion" element={<ModuleRoute moduleKey="bookings"><RoleRoute minRole="manager"><PrivateLayout><SettingPage title="Fidelización" subtitle="Premio cada cierto número de visitas"><LoyaltySettings /></SettingPage></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/configuracion" element={<RoleRoute minRole="manager"><PrivateLayout><Settings /></PrivateLayout></RoleRoute>} />
          <Route path="/settings"      element={<Navigate to="/configuracion" replace />} />
          <Route path="/mas"           element={<PrivateLayout><More /></PrivateLayout>} />
          <Route path="/profile"       element={<PrivateLayout><Profile /></PrivateLayout>} />
          <Route path="/team"         element={<RoleRoute minRole="manager"><PrivateLayout><TeamPage /></PrivateLayout></RoleRoute>} />
          <Route path="/equipo"       element={<RoleRoute minRole="manager"><PrivateLayout><ProfessionalTeam /></PrivateLayout></RoleRoute>} />
          <Route path="/analytics"    element={<RoleRoute minRole="manager"><PrivateLayout><StatsPage /></PrivateLayout></RoleRoute>} />
          <Route path="/calendario"   element={<Navigate to="/reservations?view=calendar" replace />} />
          <Route path="/publicidad"   element={<RoleRoute minRole="manager"><PrivateLayout><Publicidad /></PrivateLayout></RoleRoute>} />
          <Route path="/mi-horario"   element={<ModuleRoute moduleKey="staff"><RestaurantRoute><PrivateLayout><MySchedule /></PrivateLayout></RestaurantRoute></ModuleRoute>} />
          <Route path="/personal"     element={<ModuleRoute moduleKey="staff"><RoleRoute minRole="manager"><PrivateLayout><PersonalPage /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/finanzas"     element={<ModuleRoute moduleKey="expenses"><RoleRoute minRole="owner"><PrivateLayout><Finanzas /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/carta"        element={<ModuleRoute moduleKey="menu"><PrivateLayout><Carta /></PrivateLayout></ModuleRoute>} />
          <Route path="/costes"      element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><Costes /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/compras"      element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><Compras /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/compras/:section" element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><Compras /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/compras/facturas/nueva" element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><InvoiceUpload /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/compras/facturas/:id" element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><InvoiceDetail /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/facturas"     element={<Navigate to="/compras/facturas" replace />} />
          <Route path="/facturas/nueva" element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><InvoiceUpload /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/facturas/:id" element={<ModuleRoute moduleKey="purchases"><RoleRoute minRole="manager"><PrivateLayout><InvoiceDetail /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/caja"         element={<ModuleRoute moduleKey="bookings"><PrivateLayout><Caja /></PrivateLayout></ModuleRoute>} />
          <Route path="/agenda"       element={<ModuleRoute moduleKey="bookings"><PrivateLayout><Agenda /></PrivateLayout></ModuleRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
