import { useEffect, useState } from 'react';
import {
  isPushSupported,
  isStandaloneMode,
  subscribeToPush,
  unsubscribeFromPush,
  getServerSubscriptionStatus,
  getNotificationPermission,
  registerServiceWorker,
} from '../services/pushNotifications';

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PushNotificationToggle({ businessType } = {}) {
  const [supported, setSupported]   = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [standalone, setStandalone] = useState(false);
  const ios = isIos();

  useEffect(() => {
    const supported = isPushSupported();
    setSupported(supported);
    setStandalone(isStandaloneMode());

    if (!supported) { setLoading(false); return; }

    registerServiceWorker().then(() =>
      getServerSubscriptionStatus().then((isSubscribed) => {
        setSubscribed(isSubscribed);
        setPermission(getNotificationPermission());
        setLoading(false);
      })
    );
  }, []);

  async function handleToggle() {
    setError('');
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
        setPermission('granted');
      }
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la suscripción');
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  // A row of the "Avisos" list in Mi perfil (an <li>).
  const row = (body, control = null, tone = 'gray') => (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
      </span>
      <span className="min-w-0 flex-1">{body}</span>
      {control}
    </li>
  );

  if (ios && !standalone) {
    return row(
      <>
        <span className="block text-[15px] font-medium text-gray-900">Avisos en este iPhone</span>
        <span className="block text-xs text-gray-500">Primero añade Vetra a la pantalla de inicio (Safari → Compartir → «Añadir a inicio») y ábrela desde el icono.</span>
      </>, null, 'amber',
    );
  }

  if (permission === 'denied') {
    return row(
      <>
        <span className="block text-[15px] font-medium text-gray-900">Avisos bloqueados</span>
        <span className="block text-xs text-gray-500">Permite las notificaciones de este sitio en los ajustes del navegador.</span>
      </>, null, 'rose',
    );
  }

  return row(
    <>
      <span className="block text-[15px] font-medium text-gray-900">Avisos en este dispositivo</span>
      <span className="block text-xs text-gray-500">
        {error || (businessType === 'appointments' ? 'Al momento cuando reservan o cancelan una cita' : 'Al momento cuando entra o se cancela una reserva')}
      </span>
    </>,
    <label className={`relative inline-flex h-6 w-11 shrink-0 items-center cursor-pointer ${loading ? 'opacity-60' : ''}`}>
      <input type="checkbox" className="peer sr-only" aria-label="Avisos en este dispositivo" checked={subscribed} disabled={loading} onChange={handleToggle} />
      <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-emerald-500 transition-colors" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform pointer-events-none" />
    </label>,
  );
}
