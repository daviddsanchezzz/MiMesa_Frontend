import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentGraceUntil } from '../lib/billing';

const tone = {
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-900',
};

function Bar({ color, children, action }) {
  return (
    <div role="status" className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${tone[color]}`}>
      <p className="text-sm">{children}</p>
      {action}
    </div>
  );
}

/**
 * The state of the subscription, on every screen: trial ending, trial over
 * (read-only) or a failed payment.
 */
export default function PaymentIssueBanner() {
  const { business, hasRole } = useAuth();
  const { search } = useLocation();
  if (!business || search.includes('tab=suscripcion')) return null;
  const owner = hasRole('owner');
  const toBilling = (label) => owner
    ? <Link to="/configuracion?tab=suscripcion" className="text-sm font-semibold underline hover:no-underline whitespace-nowrap">{label}</Link>
    : null;

  if (business.effectivePlan === 'expired') {
    return (
      <Bar color="rose" action={toBilling('Elegir plan')}>
        <b>Tu prueba ha terminado: la cuenta está en solo lectura.</b>{' '}
        {owner ? 'Elige un plan para volver a crear citas y reservas; tus datos siguen aquí.' : 'Avisa al propietario para que elija un plan.'}
      </Bar>
    );
  }

  const until = paymentGraceUntil(business);
  if (until && owner) {
    return (
      <Bar color="rose" action={toBilling('Actualizar tarjeta')}>
        <b>No hemos podido cobrar tu suscripción.</b> Todo sigue funcionando hasta el {until.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}; actualiza la tarjeta para no perder funciones.
      </Bar>
    );
  }

  // Own trial (no card yet): remind in the last days
  if (owner && business.subscriptionStatus === 'trialing' && !business.hasSubscription && business.trialEndsAt) {
    const days = Math.ceil((new Date(business.trialEndsAt) - Date.now()) / 86400000);
    if (days <= 5) {
      return (
        <Bar color="violet" action={toBilling('Elegir plan')}>
          <b>{days <= 1 ? 'Tu prueba termina mañana.' : `Te quedan ${days} días de prueba.`}</b> Elige tu plan para seguir sin cortes; no se cobra hasta que termine.
        </Bar>
      );
    }
  }
  return null;
}
