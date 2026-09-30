import { useEffect, useState } from 'react';
import { slugPath } from '../lib/publicUrl';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicBookingsApi, apiError } from '../services/bookingsApi';

// Guest cancels an appointment with the secret link shown after booking.
export default function PublicBookingCancel({ businessId: businessIdProp, slug = null } = {}) {
  const routeParams = useParams();
  // From the slug page (vetrareserve.com/{slug}) or the old /public/{businessId}/… route
  const businessId = businessIdProp || routeParams.businessId;
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const token = params.get('token');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    publicBookingsApi.details(bookingId, token)
      .then(setBooking)
      .catch(() => setError('No hemos encontrado esta cita. Revisa el enlace.'));
  }, [bookingId, token]);

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      setBooking(await publicBookingsApi.cancel(bookingId, token));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const when = booking && new Date(booking.start).toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
  });
  const cancellable = booking && ['pending', 'confirmed'].includes(booking.status) && new Date(booking.start) > new Date();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3">
        {!booking && !error && <div className="h-24 animate-pulse bg-gray-100 rounded-xl" />}
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {booking && (
          <>
            <h1 className="text-lg font-bold text-gray-900">
              {booking.status === 'cancelled' ? 'Cita cancelada' : 'Tu cita'}
            </h1>
            <p className="text-sm text-gray-600">
              {booking.services.map((s) => s.name).join(' + ')}<br />
              <span className="font-semibold">{when}</span>
            </p>
            {cancellable && (
              <button type="button" onClick={cancel} disabled={busy}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
                {busy ? 'Cancelando…' : 'Cancelar cita'}
              </button>
            )}
            {booking.status === 'cancelled' && <p className="text-xs text-gray-500">El hueco ha quedado libre. ¡Gracias por avisar!</p>}
            <a href={slug ? slugPath(slug) : `/public/${businessId}/cita`} className="inline-block text-sm font-semibold text-violet-600">Reservar otra cita</a>
          </>
        )}
      </div>
    </div>
  );
}
