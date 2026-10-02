import { useEffect, useMemo, useState } from 'react';
import { slugPath } from '../lib/publicUrl';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicBookingsApi, apiError } from '../services/bookingsApi';

const TZ_DEFAULT = 'Europe/Madrid';
const DAYS_PER_PAGE = 7;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dayChip(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return {
    week: d.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
    num: d.getUTCDate(),
    month: d.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
  };
}

function whenText(iso, tz) {
  const s = new Date(iso).toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz,
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deadlineText(iso, tz) {
  return new Date(iso).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz });
}

/**
 * The customer's own appointment, from the link in their emails: see it,
 * change the day or time, or cancel it, within the business's policy.
 */
export default function PublicBookingCancel({ businessId: businessIdProp, slug: slugProp = null } = {}) {
  const routeParams = useParams();
  // From the slug page (vetrareserve.com/{slug}) or the old /public/{businessId}/… route
  const businessId = businessIdProp || routeParams.businessId;
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const token = params.get('token');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('view'); // view | change | changed
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    publicBookingsApi.details(bookingId, token)
      .then(setBooking)
      .catch(() => setError('No hemos encontrado esta cita. Revisa el enlace.'));
  }, [bookingId, token]);

  const tz = booking?.business?.timezone || TZ_DEFAULT;
  const brand = booking?.business?.brandColor || '#7c3aed';
  const slug = slugProp || booking?.business?.slug || null;
  const bookAgain = slug ? slugPath(slug) : `/public/${businessId || booking?.business?.id}/cita`;

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      setBooking(await publicBookingsApi.cancel(bookingId, token));
      setConfirmCancel(false);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const tooLate = booking?.reason === 'too_late';
  const cancelled = booking?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md space-y-4">
        {booking?.business && (
          <div className="flex items-center gap-3 px-1">
            {booking.business.logoUrl
              ? <img src={booking.business.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-200 bg-white" />
              : <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: brand }}>{booking.business.name.charAt(0)}</span>}
            <p className="font-semibold text-gray-900">{booking.business.name}</p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-4">
          {!booking && !error && <div className="h-28 animate-pulse bg-gray-100 rounded-xl" />}
          {!booking && error && <p className="text-sm text-rose-700 text-center">{error}</p>}

          {booking && mode !== 'change' && (
            <>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {cancelled ? 'Cita cancelada' : mode === 'changed' ? 'Cita cambiada' : 'Tu cita'}
                </h1>
                {mode === 'changed' && <p className="text-sm text-emerald-700 mt-1">Listo. Te hemos enviado un email con la nueva hora.</p>}
              </div>
              <div className={`rounded-xl border px-4 py-3 ${cancelled ? 'border-gray-200 bg-gray-50' : 'border-gray-200'}`}>
                <p className={`text-sm font-semibold ${cancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{whenText(booking.start, tz)}</p>
                <p className="text-sm text-gray-600 mt-0.5">{booking.services.map((s) => s.name).join(' + ')}</p>
              </div>

              {cancelled && <p className="text-sm text-gray-600">El hueco ha quedado libre. ¡Gracias por avisar!</p>}

              {!cancelled && (booking.canReschedule || booking.canCancel) && (
                <div className="space-y-2">
                  {booking.canReschedule && (
                    <button type="button" onClick={() => { setError(''); setMode('change'); }}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white active:scale-[.98] transition-transform"
                      style={{ background: brand }}>
                      Cambiar día u hora
                    </button>
                  )}
                  {booking.canCancel && !confirmCancel && (
                    <button type="button" onClick={() => setConfirmCancel(true)}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50">
                      Cancelar cita
                    </button>
                  )}
                  {confirmCancel && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                      <p className="text-sm text-rose-900">¿Seguro que quieres cancelarla?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-lg py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200">No, mantener</button>
                        <button type="button" onClick={cancel} disabled={busy} className="rounded-lg py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
                          {busy ? 'Cancelando…' : 'Sí, cancelar'}
                        </button>
                      </div>
                    </div>
                  )}
                  {booking.deadline && (
                    <p className="text-xs text-gray-500 text-center">Puedes cambiarla o cancelarla online hasta el {deadlineText(booking.deadline, tz)}.</p>
                  )}
                </div>
              )}

              {!cancelled && tooLate && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                  Ya no se puede cambiar ni cancelar online: {booking.business?.name || 'el negocio'} pide avisar con {booking.policy?.changeMinHours} h de antelación.
                  {booking.business?.phone && (
                    <> Llama al <a className="font-semibold underline" href={`tel:${booking.business.phone.replace(/\s/g, '')}`}>{booking.business.phone}</a>.</>
                  )}
                </div>
              )}

              {booking.policy?.note && !cancelled && (
                <p className="text-xs text-gray-500 whitespace-pre-line border-t border-gray-100 pt-3">{booking.policy.note}</p>
              )}
              {error && <p className="text-sm text-rose-700">{error}</p>}
              <a href={bookAgain} className="inline-block text-sm font-semibold" style={{ color: brand }}>Reservar otra cita</a>
            </>
          )}

          {booking && mode === 'change' && (
            <ChangeTime booking={booking} bookingId={bookingId} token={token} tz={tz} brand={brand}
              onBack={() => setMode('view')}
              onChanged={(b) => { setBooking(b); setMode('changed'); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeTime({ booking, bookingId, token, tz, brand, onBack, onChanged }) {
  const today = useMemo(() => todayIn(tz), [tz]);
  const [page, setPage] = useState(0);
  const from = addDays(today, page * DAYS_PER_PAGE);
  const to = addDays(from, DAYS_PER_PAGE - 1);
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setSlots(null);
    setTime(null);
    publicBookingsApi.rescheduleSlots(bookingId, token, from, to)
      .then((data) => {
        if (!alive) return;
        setSlots(data);
        const firstDay = data[0]?.date || null;
        setDay((d) => (d && d >= from && d <= to && data.some((s) => s.date === d) ? d : firstDay));
      })
      .catch((err) => { if (alive) { setSlots([]); setError(apiError(err)); } });
    return () => { alive = false; };
  }, [bookingId, token, from, to]);

  const days = Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(from, i));
  const byDay = useMemo(() => {
    const m = {};
    for (const s of slots || []) (m[s.date] ||= []).push(s);
    return m;
  }, [slots]);
  const currentStart = new Date(booking.start).getTime();

  async function save() {
    setSaving(true);
    setError('');
    try {
      onChanged(await publicBookingsApi.reschedule(bookingId, token, day, time));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Elige nuevo día y hora</h1>
        <button type="button" onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-gray-800">Volver</button>
      </div>
      <p className="text-xs text-gray-500">Ahora: {whenText(booking.start, tz)}</p>

      <div className="flex items-center gap-1">
        <button type="button" aria-label="Semana anterior" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="w-8 h-8 shrink-0 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30">‹</button>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((d) => {
            const c = dayChip(d);
            const has = Boolean(byDay[d]?.length);
            const active = d === day;
            return (
              <button key={d} type="button" disabled={!has} onClick={() => { setDay(d); setTime(null); }}
                className={`rounded-lg py-1.5 text-center border transition-colors ${active ? 'text-white border-transparent' : has ? 'border-gray-200 text-gray-800 hover:border-gray-400' : 'border-transparent text-gray-300'}`}
                style={active ? { background: brand } : undefined}>
                <span className="block text-[10px] uppercase">{c.week}</span>
                <span className="block text-sm font-bold tabular-nums">{c.num}</span>
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Semana siguiente" disabled={page >= 7} onClick={() => setPage((p) => p + 1)}
          className="w-8 h-8 shrink-0 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30">›</button>
      </div>

      {slots === null ? (
        <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />
      ) : !slots.length ? (
        <p className="text-sm text-gray-500 text-center py-4">No hay huecos libres esta semana. Prueba la siguiente.</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {(byDay[day] || []).map((s) => {
            const isCurrent = new Date(s.start).getTime() === currentStart;
            const active = time === s.time;
            return (
              <button key={s.time} type="button" disabled={isCurrent} onClick={() => setTime(s.time)}
                className={`rounded-lg py-2 text-sm font-semibold tabular-nums border transition-colors ${active ? 'text-white border-transparent' : isCurrent ? 'border-gray-100 text-gray-300' : 'border-gray-200 text-gray-800 hover:border-gray-400'}`}
                style={active ? { background: brand } : undefined}
                title={isCurrent ? 'Tu hora actual' : undefined}>
                {s.time}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button type="button" disabled={!time || saving} onClick={save}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-[.98] transition-transform"
        style={{ background: brand }}>
        {saving ? 'Guardando…' : time ? `Cambiar a las ${time}` : 'Elige una hora'}
      </button>
    </div>
  );
}
