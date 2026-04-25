import { useEffect, useState } from 'react';
import { MobileHeaderProvider, useMobileHeader } from './context/MobileHeaderContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Tables from './pages/Tables';
import Reservations from './pages/Reservations';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import Exceptions from './pages/Exceptions';
import Team from './pages/Team';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';
import DevDashboard from './pages/DevDashboard';
import Onboarding from './pages/Onboarding';
import Publicidad from './pages/Publicidad';
import Analytics from './pages/Analytics';
import Personal from './pages/Personal';
import Finanzas from './pages/Finanzas';
import PublicReservation from './pages/PublicReservation';
import PublicCancel from './pages/PublicCancel';
import PublicUnsubscribe from './pages/PublicUnsubscribe';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import ReservationForm from './components/ReservationForm';
import ToastStack from './components/ToastStack';
import useTransientToasts from './hooks/useTransientToasts';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 animate-pulse" />
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function MobileHeader({ onMenuOpen, onNewReservation, showDefaultAction = true }) {
  const { title, actions } = useMobileHeader();
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-30">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Abrir men�"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src="/logo.svg" alt="Tableo" className="w-6 h-6 shrink-0" />
        <p className="text-sm font-semibold text-gray-900">{title || 'Tableo'}</p>
      </div>
      {actions ?? (showDefaultAction ? (
        <button
          onClick={onNewReservation}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          aria-label="Nueva reserva"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Reserva
        </button>
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
  const { business, loading, impersonation, stopImpersonation } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('sidebar:desktop-collapsed') === '1';
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [newRsvModal, setNewRsvModal] = useState(false);
  const { toasts, pushToast } = useTransientToasts();

  useEffect(() => {
    const onToast = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      if (typeof detail === 'string') {
        pushToast(detail);
        return;
      }
      pushToast(detail.message, detail.type || 'success');
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, [pushToast]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sidebar:desktop-collapsed', desktopSidebarCollapsed ? '1' : '0');
  }, [desktopSidebarCollapsed]);

  if (loading) return <LoadingScreen />;
  if (!business) return <Navigate to="/login" replace />;
  if (!business.id && !business.isDev) return <Navigate to="/onboarding" replace />;

  const sidebarVisible = isDesktop ? true : mobileSidebarOpen;

  return (
    <MobileHeaderProvider>
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden relative">
      <ImpersonationBanner
        impersonation={impersonation}
        onStop={async () => {
          await stopImpersonation();
          window.location.href = '/dev?tab=users';
        }}
      />
      {mobileSidebarOpen && !isDesktop && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      {sidebarVisible && (
        <Sidebar
          isOpen={sidebarVisible}
          onClose={!isDesktop ? () => setMobileSidebarOpen(false) : undefined}
          closeOnNavigate={!isDesktop}
          collapsed={isDesktop && desktopSidebarCollapsed}
          onDesktopToggleCollapse={isDesktop ? () => setDesktopSidebarCollapsed((v) => !v) : undefined}
          devMode={devMode}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileHeader
          onMenuOpen={() => setMobileSidebarOpen(true)}
          onNewReservation={() => setNewRsvModal(true)}
          showDefaultAction={!devMode}
        />
        <main className={fullBleed ? 'flex-1 overflow-hidden flex flex-col' : `flex-1 overflow-auto p-4 lg:p-8 ${impersonation ? 'pt-16 lg:pt-20' : ''}`}>
          {children}
        </main>
      </div>
      {!devMode && newRsvModal && (
        <Modal title="Nueva reserva" onClose={() => setNewRsvModal(false)}>
          <ReservationForm
            onSave={() => {
              setNewRsvModal(false);
              window.dispatchEvent(new CustomEvent('reservation:created'));
              window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Reserva creada', type: 'success' } }));
            }}
            onCancel={() => setNewRsvModal(false)}
          />
        </Modal>
      )}
      <ToastStack toasts={toasts} />
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

function ModuleRoute({ moduleKey, children }) {
  const { loading, isModuleEnabled } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isModuleEnabled(moduleKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/public/:businessId/reserve" element={<PublicReservation />} />
          <Route path="/public/cancel"       element={<PublicCancel />} />
          <Route path="/public/unsubscribe"  element={<PublicUnsubscribe />} />
          {/* Auth — public only (redirect to / if already logged in) */}
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
          {/* Auth flows — always public */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/invite"          element={<AcceptInvite />} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/dev"        element={<DevRoute><DevLayout><DevDashboard /></DevLayout></DevRoute>} />
          <Route path="/"             element={<DevRedirect><PrivateLayout><Dashboard /></PrivateLayout></DevRedirect>} />
          <Route path="/rooms"        element={<RoleRoute minRole="manager"><PrivateLayout><Rooms /></PrivateLayout></RoleRoute>} />
          <Route path="/tables"       element={<RoleRoute minRole="manager"><FullBleedLayout><Tables /></FullBleedLayout></RoleRoute>} />
          <Route path="/reservations" element={<PrivateLayout><Reservations /></PrivateLayout>} />
          <Route path="/customers"    element={<RoleRoute minRole="manager"><PrivateLayout><Customers /></PrivateLayout></RoleRoute>} />
          <Route path="/customers/:id" element={<RoleRoute minRole="manager"><PrivateLayout><CustomerDetail /></PrivateLayout></RoleRoute>} />
          <Route path="/exceptions"   element={<RoleRoute minRole="manager"><PrivateLayout><Exceptions /></PrivateLayout></RoleRoute>} />
          <Route path="/configuracion" element={<RoleRoute minRole="manager"><PrivateLayout><Settings /></PrivateLayout></RoleRoute>} />
          <Route path="/settings"      element={<Navigate to="/configuracion" replace />} />
          <Route path="/profile"       element={<PrivateLayout><Profile /></PrivateLayout>} />
          <Route path="/team"         element={<RoleRoute minRole="manager"><PrivateLayout><Team /></PrivateLayout></RoleRoute>} />
          <Route path="/analytics"    element={<RoleRoute minRole="manager"><PrivateLayout><Analytics /></PrivateLayout></RoleRoute>} />
          <Route path="/calendario"   element={<Navigate to="/reservations?view=calendar" replace />} />
          <Route path="/publicidad"   element={<RoleRoute minRole="manager"><PrivateLayout><Publicidad /></PrivateLayout></RoleRoute>} />
          <Route path="/personal"     element={<ModuleRoute moduleKey="staff"><RoleRoute minRole="manager"><PrivateLayout><Personal /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="/finanzas"     element={<ModuleRoute moduleKey="expenses"><RoleRoute minRole="owner"><PrivateLayout><Finanzas /></PrivateLayout></RoleRoute></ModuleRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

