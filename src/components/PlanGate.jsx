import { useAuth } from '../context/AuthContext';

/**
 * Muestra `children` solo si el usuario tiene acceso al plan/feature requerido.
 * Si no tiene acceso, renderiza `fallback` (null por defecto).
 *
 * Uso:
 *   // Requiere plan de pago (Basic o superior)
 *   <PlanGate paid>...</PlanGate>
 *
 *   // Requiere una feature específica de planCapabilities
 *   <PlanGate feature="iframeEmbed">...</PlanGate>
 *
 *   // Con fallback visible para Free
 *   <PlanGate paid fallback={<UpgradeBanner />}>...</PlanGate>
 */
export default function PlanGate({ paid, feature, fallback = null, children }) {
  const { isSubscribed, canUse } = useAuth();

  let hasAccess;
  if (feature !== undefined) {
    hasAccess = canUse(feature);
  } else if (paid) {
    hasAccess = isSubscribed;
  } else {
    hasAccess = true;
  }

  return hasAccess ? children : fallback;
}
