import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentGraceUntil } from '../lib/billing';

// Shown to the owner on every screen while a subscription charge has failed.
export default function PaymentIssueBanner() {
  const { business, hasRole } = useAuth();
  const { search } = useLocation();
  const until = paymentGraceUntil(business);
  if (!until || !hasRole('owner') || search.includes('tab=suscripcion')) return null;
  const date = until.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
      <p className="text-sm text-rose-900">
        <b>No hemos podido cobrar tu suscripción.</b> Todo sigue funcionando hasta el {date}; actualiza la tarjeta para no perder funciones.
      </p>
      <Link to="/configuracion?tab=suscripcion" className="text-sm font-semibold text-rose-800 underline hover:no-underline whitespace-nowrap">Actualizar tarjeta</Link>
    </div>
  );
}
