import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { paymentGraceUntil, pricesFor } from '../../lib/billing';
import { BASIC_FEATURES as R_BASIC, CheckIcon, PRO_EXTRAS as R_PRO, APPT_BASIC_FEATURES, APPT_PRO_EXTRAS } from './shared';

export function BillingSection() {
  const { plan, subscriptionStatus, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, hasRole, refreshBusiness, isAppointments, business } = useAuth();
  const graceUntil = paymentGraceUntil(business);
  const PRICES = pricesFor(isAppointments);
  const BASIC_FEATURES = isAppointments ? APPT_BASIC_FEATURES : R_BASIC;
  const PRO_EXTRAS = isAppointments ? APPT_PRO_EXTRAS : R_PRO;
  const audience = isAppointments ? 'negocios' : 'restaurantes';
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking]           = useState(false);
  const [msg, setMsg]                   = useState('');
  const [err, setErr]                   = useState('');
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const isOwner    = hasRole('owner');
  // A failed charge keeps the plan during the grace period (see lib/billing)
  const isActive   = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || Boolean(graceUntil);
  const isTrialing = subscriptionStatus === 'trialing';
  const isPastDue  = subscriptionStatus === 'past_due';
  // No free plan: new businesses try Pro for 14 days without a card (no Stripe
  // subscription yet), then read-only until they choose a plan. Businesses from
  // before trials keep their free access (legacy).
  const localTrial = isTrialing && !business?.hasSubscription && business?.effectivePlan !== 'expired';
  const expired    = business?.effectivePlan === 'expired';
  const legacyFree = business?.effectivePlan === 'free';
  const trialDaysLeft = localTrial && trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000)) : 0;
  const isFree     = localTrial || expired || legacyFree || !isActive || plan === 'free';
  const isPro      = !isFree && isActive && plan === 'pro';
  const isBasic    = !isFree && !isPro;

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stripe/status');
      setStatus(data);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleUpgrade = async (targetPlan = 'basic') => {
    if (!isOwner) return;
    setWorking(true); setErr('');
    try {
      const { data } = await api.post('/stripe/checkout', { plan: targetPlan });
      window.location.href = data.url;
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al iniciar el pago');
      setWorking(false);
    }
  };

  const handleChangePlan = async (newPlan) => {
    if (!isOwner) return;
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/change-plan', { plan: newPlan });
      const label = newPlan === 'pro' ? 'Pro' : 'Basic';
      setMsg(`¡Listo! Cambiando a ${label}…`);
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al cambiar el plan');
    } finally { setWorking(false); }
  };

  const handlePortal = async () => {
    setWorking(true); setErr('');
    try {
      const { data } = await api.post('/stripe/portal');
      window.location.href = data.url;
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al abrir el portal');
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Confirmas que quieres cancelar? Seguirás teniendo acceso hasta el final del período.')) return;
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/cancel');
      setMsg('Suscripción programada para cancelar al final del período.');
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al cancelar');
    } finally { setWorking(false); }
  };

  const handleReactivate = async () => {
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/reactivate');
      setMsg('¡Suscripción reactivada!');
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al reactivar');
    } finally { setWorking(false); }
  };

  const used      = status?.usage?.reservations?.used  ?? 0;
  const limit     = status?.usage?.reservations?.limit ?? 30;
  const pct       = isFree ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = isFree && used >= limit * 0.8;

  // Poll for plan update after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      setMsg('¡Listo! Activando tu suscripción…');
      window.history.replaceState({}, '', window.location.pathname + '?tab=suscripcion');
      let attempts = 0;
      const poll = setInterval(async () => {
        await refreshBusiness();
        attempts++;
        if (attempts >= 10) clearInterval(poll);
      }, 2000);
      return () => clearInterval(poll);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{err}</div>
      )}

      {/* ── FREE ── */}
      {isFree && (
        <>
          {/* Current state */}
          <div className={`pb-6 border-b ${expired ? 'border-rose-200' : 'border-gray-100'}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tu plan</p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                {localTrial && (
                  <>
                    <p className="text-2xl font-bold text-gray-800">Prueba gratuita de Pro</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {trialDaysLeft === 1 ? 'Te queda 1 día' : `Te quedan ${trialDaysLeft} días`} (hasta el {fmt(trialEndsAt)}). Elige tu plan cuando quieras: no se cobra nada hasta que termine la prueba.
                    </p>
                  </>
                )}
                {expired && (
                  <>
                    <p className="text-2xl font-bold text-gray-800">Tu prueba ha terminado</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Tu cuenta está en solo lectura: puedes ver tus datos, pero no crear {isAppointments ? 'citas' : 'reservas'} ni recibirlas online. Elige un plan para seguir; todo sigue como lo dejaste.
                    </p>
                  </>
                )}
                {legacyFree && (
                  <>
                    <p className="text-2xl font-bold text-gray-800">Acceso gratuito</p>
                    <p className="text-sm text-gray-500 mt-0.5">{isAppointments ? 'Tu acceso de lanzamiento sin coste.' : `Hasta ${limit} reservas al mes · 2 turnos · 15 mesas`}</p>
                  </>
                )}
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${expired ? 'bg-rose-100 text-rose-700' : localTrial ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                {expired ? 'Solo lectura' : localTrial ? 'En prueba' : 'Gratuito'}
              </span>
            </div>

            {/* Usage bar (restaurant reservations only) */}
            {!isAppointments && legacyFree && <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Reservas este mes</p>
                <span className={`text-xs font-bold ${nearLimit ? 'text-amber-600' : 'text-gray-600'}`}>
                  {loading ? '…' : `${used} / ${limit}`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-violet-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {nearLimit && (
                <p className="text-xs text-amber-700 mt-1.5">
                  {pct >= 100
                    ? 'Límite alcanzado. Las nuevas reservas están bloqueadas.'
                    : `Te quedan ${limit - used} reservas este mes.`}
                </p>
              )}
            </div>}
          </div>

          {/* Trial plan cards */}
          {isOwner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Basic trial card */}
              <div className="bg-white rounded-2xl border-2 border-violet-200 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">Basic</p>
                    <p className="text-violet-200 text-xs">Sin límites, sin complicaciones</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-2xl">{PRICES.basic}</p>
                    <p className="text-violet-200 text-xs">/ mes + IVA</p>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <ul className="space-y-2 mb-5 flex-1">
                    {BASIC_FEATURES.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade('basic')}
                    disabled={working}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {working ? 'Redirigiendo…' : legacyFree ? 'Probar Basic gratis 14 días' : 'Elegir Basic'}
                  </button>
                </div>
              </div>

              {/* Pro trial card */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">Pro</p>
                      <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Recomendado</span>
                    </div>
                    <p className="text-amber-100 text-xs">Para {audience} que quieren más</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-2xl">{PRICES.pro}</p>
                    <p className="text-amber-100 text-xs">/ mes + IVA</p>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Todo lo de Basic, más:</p>
                  <ul className="space-y-2 mb-5 flex-1">
                    {PRO_EXTRAS.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={working}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {working ? 'Redirigiendo…' : legacyFree ? 'Probar Pro gratis 14 días' : 'Elegir Pro'}
                  </button>
                </div>
              </div>

            </div>
          )}
          {isOwner && (
            <p className="text-center text-xs text-gray-400">
              {localTrial ? `No se cobra hasta el ${fmt(trialEndsAt)} · Cancela cuando quieras`
                : legacyFree ? 'Sin cargo durante 14 días · Cancela cuando quieras'
                  : 'Pago mensual · Cancela cuando quieras'}
            </p>
          )}
        </>
      )}

      {/* ── BASIC (trialing or active) ── */}
      {isBasic && (
        <>
          {/* Status banner */}
          {isPastDue && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Pago fallido</p>
                <p className="text-xs text-red-600 mt-0.5">Actualiza tu método de pago para no perder el acceso{graceUntil ? ` (lo mantienes hasta el ${graceUntil.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })})` : ''}.</p>
              </div>
              {isOwner && (
                <button onClick={handlePortal} disabled={working} className="text-xs font-semibold text-red-700 underline hover:no-underline shrink-0">
                  Actualizar
                </button>
              )}
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Suscripción cancelada</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tienes acceso hasta el <strong>{fmt(currentPeriodEnd || trialEndsAt)}</strong>. Después {business?.legacyAccess ? 'volverás a tu acceso gratuito' : 'tu cuenta pasará a solo lectura'}.
                </p>
              </div>
              {isOwner && (
                <button onClick={handleReactivate} disabled={working} className="text-xs font-semibold text-amber-800 underline hover:no-underline shrink-0">
                  Reactivar
                </button>
              )}
            </div>
          )}

          {/* Plan card */}
          <div className="border-t border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-xl font-bold text-violet-700">Basic</p>
                  {isTrialing && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                      Prueba activa
                    </span>
                  )}
                  {!isTrialing && !cancelAtPeriodEnd && !isPastDue && (
                    <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                      Activo
                    </span>
                  )}
                </div>
                {isTrialing && trialEndsAt && (
                  <p className="text-sm text-gray-500">
                    Prueba gratuita · finaliza el <strong className="text-gray-700">{fmt(trialEndsAt)}</strong>
                  </p>
                )}
                {!isTrialing && currentPeriodEnd && !cancelAtPeriodEnd && (
                  <p className="text-sm text-gray-500">
                    Próxima factura el <strong className="text-gray-700">{fmt(currentPeriodEnd)}</strong>
                  </p>
                )}
              </div>
              {isOwner && !isPastDue && !cancelAtPeriodEnd && isTrialing && (
                <button
                  onClick={() => handleChangePlan('pro')}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {working ? '…' : 'Cambiar a Pro →'}
                </button>
              )}
              {isOwner && !isPastDue && !cancelAtPeriodEnd && !isTrialing && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {working ? '…' : 'Gestionar facturación'}
                </button>
              )}
              {isOwner && (isPastDue || cancelAtPeriodEnd) && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {working ? '…' : 'Gestionar suscripción'}
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluido en tu plan</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {BASIC_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cancel (subtle, only when active and not already cancelled) */}
          {isOwner && !cancelAtPeriodEnd && !isPastDue && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                {isTrialing
                  ? 'Puedes cancelar antes de que termine la prueba y no se te cobrará nada.'
                  : 'Seguirás teniendo acceso hasta el final del período si cancelas.'}
              </p>
              <button
                onClick={handleCancel}
                disabled={working}
                className="text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50 underline hover:no-underline shrink-0 ml-4 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Pro upgrade card (only when active/trialing basic, no issues) */}
          {isOwner && !isPastDue && !cancelAtPeriodEnd && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-bold text-amber-700">Pro</p>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{PRICES.pro}/mes + IVA</span>
                  </div>
                  <p className="text-xs text-amber-600">
                    {isTrialing
                      ? 'Cambia a Pro ahora — tu prueba de 14 días continúa'
                      : `Para ${audience} que quieren más control`}
                  </p>
                </div>
                <button
                  onClick={() => handleChangePlan('pro')}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors shrink-0"
                >
                  {working ? '…' : isTrialing ? 'Cambiar a Pro' : 'Subir a Pro'}
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-amber-700 mb-2.5">Todo lo de Basic, más:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {PRO_EXTRAS.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-amber-800">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PRO ── */}
      {isPro && (
        <>
          {isPastDue && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Pago fallido</p>
                <p className="text-xs text-red-600 mt-0.5">Actualiza tu método de pago para no perder el acceso{graceUntil ? ` (lo mantienes hasta el ${graceUntil.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })})` : ''}.</p>
              </div>
              {isOwner && (
                <button onClick={handlePortal} disabled={working} className="text-xs font-semibold text-red-700 underline hover:no-underline shrink-0">
                  Actualizar
                </button>
              )}
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Suscripción cancelada</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tienes acceso hasta el <strong>{fmt(currentPeriodEnd || trialEndsAt)}</strong>. Después {business?.legacyAccess ? 'volverás a tu acceso gratuito' : 'tu cuenta pasará a solo lectura'}.
                </p>
              </div>
              {isOwner && (
                <button onClick={handleReactivate} disabled={working} className="text-xs font-semibold text-amber-800 underline hover:no-underline shrink-0">
                  Reactivar
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-xl font-bold text-amber-600">Pro</p>
                  {isTrialing && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Prueba activa</span>
                  )}
                  {!isTrialing && !cancelAtPeriodEnd && !isPastDue && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Activo</span>
                  )}
                </div>
                {isTrialing && trialEndsAt && (
                  <p className="text-sm text-gray-500">Prueba gratuita · finaliza el <strong className="text-gray-700">{fmt(trialEndsAt)}</strong></p>
                )}
                {!isTrialing && currentPeriodEnd && !cancelAtPeriodEnd && (
                  <p className="text-sm text-gray-500">Próxima factura el <strong className="text-gray-700">{fmt(currentPeriodEnd)}</strong></p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && !isPastDue && !cancelAtPeriodEnd && isTrialing && (
                  <button
                    onClick={() => handleChangePlan('basic')}
                    disabled={working}
                    className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {working ? '…' : 'Cambiar a Basic'}
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handlePortal}
                    disabled={working}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {working ? '…' : 'Gestionar facturación'}
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluido en tu plan</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {[...BASIC_FEATURES, ...PRO_EXTRAS].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {isOwner && !cancelAtPeriodEnd && !isPastDue && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                {isTrialing
                  ? 'Puedes cancelar antes de que termine la prueba y no se te cobrará nada.'
                  : 'Seguirás teniendo acceso hasta el final del período si cancelas.'}
              </p>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {!isTrialing && (
                  <button
                    onClick={() => setShowDowngradeModal(true)}
                    disabled={working}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium disabled:opacity-50 underline hover:no-underline transition-colors"
                  >
                    Bajar a Basic
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={working}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50 underline hover:no-underline transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal confirmación downgrade Pro → Basic ── */}
      {showDowngradeModal && (
        <Modal
          title="¿Bajar a Basic?"
          subtitle="Esta acción cambia tu plan inmediatamente"
          onClose={() => setShowDowngradeModal(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">Perderás acceso a funciones Pro</p>
              <ul className="space-y-1">
                {PRO_EXTRAS.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-amber-700">
                    <svg className="w-3 h-3 shrink-0 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              El cambio a Basic es inmediato. No se realiza ningún reembolso por el tiempo restante del ciclo Pro.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowDowngradeModal(false); handleChangePlan('basic'); }}
                disabled={working}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50 rounded-xl transition-colors"
              >
                {working ? '…' : 'Sí, bajar a Basic'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
