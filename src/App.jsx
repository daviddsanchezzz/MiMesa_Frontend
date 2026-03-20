import { useState } from 'react';
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
import Settings from './pages/Settings';
import Team from './pages/Team';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';
import DevDashboard from './pages/DevDashboard';
import Onboarding from './pages/Onboarding';
import PublicReservation from './pages/PublicReservation';
import PublicCancel from './pages/PublicCancel';
import Sidebar from './components/Sidebar';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 animate-pulse" />
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function MobileHeader({ onMenuOpen }) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-30">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Abrir menú"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
            <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3ZM2 9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9ZM1 15a1 1 0 0 1 1-1h6a1 1 0 0 1 0 2H2a1 1 0 0 1-1-1Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900">MiMesa</p>
      </div>
    </div>
  );
}

function PrivateLayout({ children }) {
  const { business, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!business) return <Navigate to="/login" replace />;
  if (!business.id && !business.isDev) return <Navigate to="/onboarding" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

// Full-bleed layout: no padding, for map/canvas views
function FullBleedLayout({ children }) {
  const { business, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!business) return <Navigate to="/login" replace />;
  if (!business.id && !business.isDev) return <Navigate to="/onboarding" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/public/:businessId/reserve" element={<PublicReservation />} />
          <Route path="/public/cancel" element={<PublicCancel />} />
          {/* Auth — public only (redirect to / if already logged in) */}
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
          {/* Auth flows — always public */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/invite"          element={<AcceptInvite />} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/dev"        element={<DevRoute><DevDashboard /></DevRoute>} />
          <Route path="/"             element={<DevRedirect><PrivateLayout><Dashboard /></PrivateLayout></DevRedirect>} />
          <Route path="/rooms"        element={<PrivateLayout><Rooms /></PrivateLayout>} />
          <Route path="/tables"       element={<FullBleedLayout><Tables /></FullBleedLayout>} />
          <Route path="/reservations" element={<PrivateLayout><Reservations /></PrivateLayout>} />
          <Route path="/customers"    element={<PrivateLayout><Customers /></PrivateLayout>} />
          <Route path="/configuracion" element={<PrivateLayout><Settings /></PrivateLayout>} />
          <Route path="/settings"      element={<Navigate to="/configuracion" replace />} />
          <Route path="/profile"       element={<PrivateLayout><Profile /></PrivateLayout>} />
          <Route path="/team"         element={<PrivateLayout><Team /></PrivateLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
