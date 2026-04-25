import { useEffect, useState } from 'react';
import {
  isPushSupported,
  isStandaloneMode,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  getNotificationPermission,
  registerServiceWorker,
} from '../services/pushNotifications';

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PushNotificationToggle() {
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
      getCurrentSubscription().then((sub) => {
        setSubscribed(!!sub);
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

  // iOS not installed as PWA — show instructions
  if (ios && !standalone) {
    return (
      <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50">
        <p className="text-sm font-semibold text-amber-900 mb-1">Notificaciones push en iPhone/iPad</p>
        <p className="text-xs text-amber-800 leading-relaxed">
          Para recibir notificaciones en iOS es necesario añadir la app a la pantalla de inicio:
          <br />
          <strong>Safari → Compartir → "Añadir a inicio"</strong>
          <br />
          Luego abre la app desde el icono y activa las notificaciones aquí.
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="border border-red-200 rounded-2xl p-4 bg-red-50">
        <p className="text-sm font-semibold text-red-800 mb-1">Notificaciones bloqueadas</p>
        <p className="text-xs text-red-700">
          Has bloqueado las notificaciones en este navegador. Para activarlas, ve a los ajustes del
          navegador y permite notificaciones para este sitio.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-sm font-semibold text-gray-900">Notificaciones push</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {subscribed
              ? 'Recibirás alertas en este dispositivo'
              : 'Actívalas para recibir alertas instantáneas'}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 shrink-0">
          Este dispositivo
        </span>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <label className={`mt-3 flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="text-sm text-gray-700">Avisarme cuando hay una reserva nueva o cancelada</span>
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={subscribed}
            disabled={loading}
            onChange={handleToggle}
          />
          <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-violet-500 transition-colors" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
        </span>
      </label>
    </div>
  );
}
