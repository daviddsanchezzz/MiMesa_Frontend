import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('[push] SW registration failed:', err);
    return null;
  }
}

export async function getVapidPublicKey() {
  try {
    const { data } = await api.get('/push/vapid-public-key');
    return data.key;
  } catch {
    return null;
  }
}

export async function subscribeToPush() {
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Service worker no disponible');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso denegado');

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) throw new Error('Configuración push no disponible');

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await api.post('/push/subscribe', { subscription });
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;

  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
