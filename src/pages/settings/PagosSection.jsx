import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { inputCls, labelCls } from './shared';

// ═══════════════════════════════════════════════════════════════════════════
// PAGOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
export function PagosSection() {
  const { canUse } = useAuth();
  const hasPayments = canUse('reservationPayments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('none');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPerPerson, setDepositPerPerson] = useState(false);
  const [freeCancelHours, setFreeCancelHours] = useState(24);
  const [stripeConfig, setStripeConfig] = useState({
    secretKeyConfigured: false,
    webhookSecretConfigured: false,
    currency: 'eur',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/stripe/payment-settings');
        const rp = data.reservationPayment || {};
        const nextStripeConfig = data.stripeConfig || {};
        setMode(rp.mode || 'none');
        setDepositAmount(rp.depositAmount ? (rp.depositAmount / 100).toFixed(2) : '');
        setDepositPerPerson(rp.depositPerPerson ?? false);
        setFreeCancelHours(rp.freeCancellationHours ?? 24);
        setStripeConfig({
          secretKeyConfigured: Boolean(nextStripeConfig.secretKeyConfigured),
          webhookSecretConfigured: Boolean(nextStripeConfig.webhookSecretConfigured),
          currency: nextStripeConfig.currency || 'eur',
        });
      } catch {
        setError('No se pudo cargar la configuracion de pagos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'deposit' && !stripeReady) {
        throw new Error('Faltan claves o webhook de Stripe. Completa la configuracion antes de activar depositos.');
      }
      await api.put('/stripe/payment-settings', {
        mode,
        depositAmount: mode === 'deposit' ? parseFloat(depositAmount) || 0 : undefined,
        depositPerPerson: mode === 'deposit' ? depositPerPerson : undefined,
        freeCancellationHours: parseFloat(freeCancelHours) || 24,
        currency: stripeConfig.currency || 'eur',
      });
      setSuccess('Configuracion guardada');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPayments) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-500">
          <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM6 13.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm4-.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Disponible en el plan Basic</p>
        <p className="text-xs text-gray-500 mt-1">Los depositos en reservas requieren el plan Basic.</p>
      </div>
      <button
        onClick={() => window.location.search = '?tab=suscripcion'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
      >
        Ver plan Basic
      </button>
    </div>
  );

  if (loading) return <div className="animate-pulse h-64 bg-gray-50 rounded-2xl" />;

  const paymentOptions = [
    { value: 'none', label: 'Sin pago', desc: 'Los clientes reservan sin pagar nada.' },
    { value: 'deposit', label: 'Deposito al reservar', desc: 'El cliente paga un importe al hacer la reserva y se confirma tras el cobro.' },
  ];
  const publishableKeyConfigured = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  const stripeReady = Boolean(
    stripeConfig.secretKeyConfigured &&
    stripeConfig.webhookSecretConfigured &&
    publishableKeyConfigured
  );
  const missingConfig = [
    !stripeConfig.secretKeyConfigured ? 'STRIPE_SECRET_KEY' : null,
    !stripeConfig.webhookSecretConfigured ? 'STRIPE_WEBHOOK_SECRET' : null,
    !publishableKeyConfigured ? 'VITE_STRIPE_PUBLISHABLE_KEY' : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Cuenta Stripe</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            La app usa una unica cuenta Stripe. Esta tarjeta muestra si la configuracion real esta completa.
          </p>
        </div>
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-3 py-2">{success}</div>}
        <div className={`p-3.5 rounded-xl border ${stripeReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-semibold ${stripeReady ? 'text-emerald-900' : 'text-amber-900'}`}>
            {stripeReady ? 'Stripe listo para cobrar' : 'Stripe pendiente de configurar'}
          </p>
          <p className={`text-xs mt-1 ${stripeReady ? 'text-emerald-700' : 'text-amber-800'}`}>
            Stripe Connect y el onboarding por restaurante han sido retirados.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className={`rounded-lg px-3 py-2 border ${stripeConfig.secretKeyConfigured ? 'bg-white/70 border-emerald-200 text-emerald-800' : 'bg-white/70 border-amber-200 text-amber-900'}`}>
              `STRIPE_SECRET_KEY` {stripeConfig.secretKeyConfigured ? 'configurada' : 'faltante'}
            </div>
            <div className={`rounded-lg px-3 py-2 border ${stripeConfig.webhookSecretConfigured ? 'bg-white/70 border-emerald-200 text-emerald-800' : 'bg-white/70 border-amber-200 text-amber-900'}`}>
              `STRIPE_WEBHOOK_SECRET` {stripeConfig.webhookSecretConfigured ? 'configurada' : 'faltante'}
            </div>
            <div className={`rounded-lg px-3 py-2 border ${publishableKeyConfigured ? 'bg-white/70 border-emerald-200 text-emerald-800' : 'bg-white/70 border-amber-200 text-amber-900'}`}>
              `VITE_STRIPE_PUBLISHABLE_KEY` {publishableKeyConfigured ? 'configurada' : 'faltante'}
            </div>
          </div>
          {!stripeReady && (
            <p className="text-xs text-amber-900 mt-3">
              Faltan variables para cobrar reservas con deposito: {missingConfig.join(', ')}.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pagos en reservas</h3>
          <p className="text-xs text-gray-500 mt-0.5">Elige si tus clientes deben pagar un deposito antes de confirmar la reserva.</p>
        </div>

        <div className="space-y-2">
          {paymentOptions.map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${(opt.value === 'deposit' && !stripeReady) ? 'cursor-not-allowed border-amber-200 bg-amber-50/60' : mode === opt.value ? 'cursor-pointer border-violet-400 bg-violet-50' : 'cursor-pointer border-gray-200 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="paymentMode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                className="mt-0.5 accent-violet-600"
                disabled={opt.value === 'deposit' && !stripeReady}
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                {opt.value === 'deposit' && !stripeReady && (
                  <p className="text-xs text-amber-700 mt-1">Completa las claves y el webhook para poder activarlo.</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {mode === 'deposit' && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Configuracion del deposito</h4>
            <div>
              <label className={labelCls}>Importe del deposito (EUR)</label>
              <input type="number" min="0.50" step="0.50" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="5.00" className={inputCls} required />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={depositPerPerson} onChange={(e) => setDepositPerPerson(e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm text-gray-700">Cobrar por persona</span>
            </label>
            {depositPerPerson && depositAmount && (
              <p className="text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                Ejemplo: 4 personas = {(parseFloat(depositAmount || '0') * 4).toFixed(2)} EUR
              </p>
            )}
          </div>
        )}

        {mode !== 'none' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Politica de cancelacion</h4>
            <label className={labelCls}>Cancelacion gratuita hasta (horas antes)</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="168" value={freeCancelHours} onChange={(e) => setFreeCancelHours(e.target.value)} className={`${inputCls} w-32`} />
              <span className="text-sm text-gray-500">horas antes de la reserva</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </form>
    </div>
  );
}
