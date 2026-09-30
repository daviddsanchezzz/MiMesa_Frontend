import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicBookingsApi, apiError } from '../services/bookingsApi';
import { addDays, euros, timeInTz, todayIn } from './agenda/utils';

/**
 * Public page where a customer books an appointment on their own:
 * service → professional (if the service lets them choose) → day and time
 * → contact details → confirmation with a cancel link.
 * Works standalone or embedded in the business website (?embed=1).
 */

const DAYS_SHOWN = 21;

function dayParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    weekday: date.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
    day: d,
    month: date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    long: date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  };
}

function durationLabel(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function priceLabel(price) {
  if (!price?.amount) return '';
  return `${price.from ? 'desde ' : ''}${euros(price.amount)}`;
}

export default function PublicBooking() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';

  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('service'); // service | staff | time | details | done
  const [service, setService] = useState(null);
  const [staffId, setStaffId] = useState('');   // '' = any
  const [slotsByDay, setSlotsByDay] = useState(null);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [form, setForm] = useState({ guestName: '', guestPhone: '', guestEmail: '', notes: '', consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const tz = catalog?.business?.timezone || 'Europe/Madrid';
  const color = catalog?.business?.brandColor || '#7c3aed';
  const today = todayIn(tz);

  useEffect(() => {
    publicBookingsApi.catalog(businessId)
      .then(setCatalog)
      .catch((err) => setLoadError(err?.response?.status === 404
        ? 'Este negocio no tiene las reservas online activadas.'
        : apiError(err, 'No se ha podido cargar la página de reservas.')));
  }, [businessId]);

  // Keep the parent page's iframe sized to the content.
  useEffect(() => {
    if (!isEmbed) return undefined;
    const send = () => window.parent.postMessage({ type: 'VETRA_HEIGHT', height: document.documentElement.scrollHeight }, '*');
    send();
    const t = setTimeout(send, 150);
    window.addEventListener('resize', send);
    return () => { clearTimeout(t); window.removeEventListener('resize', send); };
  });

  const choosableStaff = useMemo(() => {
    if (!service || !catalog || service.staffChoice === null) return [];
    const ids = service.staffChoice;
    return ids.length ? catalog.staff.filter((s) => ids.includes(String(s.id))) : catalog.staff;
  }, [service, catalog]);

  // Load 3 weeks of availability once a service (and professional) is chosen.
  useEffect(() => {
    if (step !== 'time' || !service) return;
    setSlotsByDay(null);
    publicBookingsApi.availability(businessId, {
      serviceId: service.id, from: today, to: addDays(today, DAYS_SHOWN - 1),
      ...(staffId ? { resourceId: staffId } : {}),
    })
      .then((slots) => {
        const grouped = {};
        for (const s of slots) (grouped[s.date] ||= []).push(s);
        setSlotsByDay(grouped);
        const first = Object.keys(grouped).sort()[0];
        setDay((d) => (d && grouped[d] ? d : first || ''));
      })
      .catch((err) => { setSlotsByDay({}); setError(apiError(err)); });
  }, [step, service, staffId, businessId, today]);

  const groupedServices = useMemo(() => {
    const groups = {};
    for (const s of catalog?.services || []) {
      if (s.bookingMode === 'quote') continue;
      (groups[s.category || ''] ||= []).push(s);
    }
    return Object.entries(groups);
  }, [catalog]);

  function pickService(s) {
    setService(s);
    setStaffId('');
    setTime('');
    setError('');
    setStep(s.staffChoice !== null && catalog.staff.length > 1 ? 'staff' : 'time');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.consent) return setError('Debes aceptar el tratamiento de tus datos para reservar.');
    setSending(true);
    try {
      const booking = await publicBookingsApi.create(businessId, {
        date: day, time,
        items: [{ serviceId: service.id, ...(staffId ? { resourceId: staffId } : {}) }],
        guestName: form.guestName, guestPhone: form.guestPhone, guestEmail: form.guestEmail,
        notes: form.notes, consent: true,
      });
      setResult(booking);
      setStep('done');
    } catch (err) {
      setError(apiError(err));
      if (err?.response?.status === 409) { setTime(''); setStep('time'); }
    } finally {
      setSending(false);
    }
  }

  const shell = (children) => (
    <div className={isEmbed ? 'w-full' : 'min-h-screen bg-gray-50'}>
      <div className={`mx-auto w-full max-w-lg ${isEmbed ? 'p-3' : 'px-4 py-6 sm:py-10'}`}>{children}</div>
    </div>
  );

  if (loadError) {
    return shell(<p className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-600">{loadError}</p>);
  }
  if (!catalog) {
    return shell(<div className="h-40 rounded-2xl bg-white border border-gray-200 animate-pulse" />);
  }

  const biz = catalog.business;
  const stepIndex = { service: 0, staff: 1, time: 2, details: 3, done: 4 }[step];
  const back = () => setStep(step === 'details' ? 'time' : step === 'time' && service?.staffChoice !== null && catalog.staff.length > 1 ? 'staff' : 'service');
  const staffName = staffId ? catalog.staff.find((s) => String(s.id) === staffId)?.name : null;

  return shell(
    <div className="space-y-4">
      {!isEmbed && (
        <header className="text-center space-y-1">
          {biz.logoUrl ? (
            <img src={biz.logoUrl} alt={biz.name} className="h-14 max-w-[180px] mx-auto object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: color }}>
              {biz.name?.[0]?.toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">{biz.name}</h1>
          {(biz.address || biz.phone) && (
            <p className="text-sm text-gray-500">
              {biz.address}{biz.address && biz.phone && ' · '}
              {biz.phone && <a href={`tel:${biz.phone.replace(/\s/g, '')}`} className="hover:underline">{biz.phone}</a>}
            </p>
          )}
        </header>
      )}

      {step !== 'done' && (
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= Math.min(stepIndex, 3) ? color : '#e5e7eb' }} />
          ))}
        </div>
      )}

      {service && step !== 'service' && step !== 'done' && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{service.name}</p>
            <p className="text-xs text-gray-500">
              {durationLabel(service.durationMin)}{priceLabel(service.price) && ` · ${priceLabel(service.price)}`}
              {staffName && ` · con ${staffName}`}
              {day && time && step === 'details' && ` · ${dayParts(day).long}, ${time}`}
            </p>
          </div>
          <button type="button" onClick={back} className="text-sm font-semibold shrink-0" style={{ color }}>Cambiar</button>
        </div>
      )}

      {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      {step === 'service' && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Elige un servicio</h2>
          {groupedServices.length === 0 && (
            <p className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
              Ahora mismo no hay servicios disponibles para reservar online.
            </p>
          )}
          {groupedServices.map(([category, list]) => (
            <div key={category} className="space-y-2">
              {category && <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{category}</p>}
              {list.map((s) => (
                <button key={s.id} type="button" onClick={() => pickService(s)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 hover:border-gray-300 hover:shadow-sm transition">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>}
                    <p className="text-xs text-gray-500 mt-0.5">{durationLabel(s.durationMin)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{priceLabel(s.price)}</span>
                </button>
              ))}
            </div>
          ))}
        </section>
      )}

      {step === 'staff' && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">¿Con quién?</h2>
          {[{ id: '', name: 'Me da igual', hint: 'Te asignamos a quien esté libre' }, ...choosableStaff].map((s) => (
            <button key={s.id || 'any'} type="button" onClick={() => { setStaffId(String(s.id)); setStep('time'); }}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-gray-300 hover:shadow-sm transition">
              {s.photo ? (
                <img src={s.photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: s.id ? (s.color || color) : '#9ca3af' }}>
                  {s.id ? s.name[0].toUpperCase() : '★'}
                </span>
              )}
              <span>
                <span className="block text-sm font-semibold text-gray-900">{s.name}</span>
                {s.hint && <span className="block text-xs text-gray-500">{s.hint}</span>}
              </span>
            </button>
          ))}
        </section>
      )}

      {step === 'time' && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Elige día y hora</h2>
          {slotsByDay === null ? (
            <div className="h-32 rounded-2xl bg-white border border-gray-200 animate-pulse" />
          ) : Object.keys(slotsByDay).length === 0 ? (
            <p className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
              No hay huecos libres en las próximas semanas{staffName ? ` con ${staffName}` : ''}.
              {biz.phone && <> Llámanos al <a className="font-semibold" style={{ color }} href={`tel:${biz.phone}`}>{biz.phone}</a>.</>}
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
                {Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)).map((d) => {
                  const p = dayParts(d);
                  const has = !!slotsByDay[d];
                  const active = d === day;
                  return (
                    <button key={d} type="button" disabled={!has} onClick={() => { setDay(d); setTime(''); }}
                      className={`shrink-0 w-14 rounded-xl border py-2 text-center transition ${has ? 'bg-white hover:border-gray-400' : 'bg-gray-50 opacity-40 cursor-not-allowed'} ${active ? 'text-white border-transparent' : 'border-gray-200 text-gray-800'}`}
                      style={active ? { backgroundColor: color } : undefined}>
                      <span className="block text-[11px] capitalize">{p.weekday}</span>
                      <span className="block text-base font-bold leading-tight">{p.day}</span>
                      <span className="block text-[11px] capitalize">{p.month}</span>
                    </button>
                  );
                })}
              </div>
              {day && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800 first-letter:uppercase">{dayParts(day).long}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {(slotsByDay[day] || []).map((s) => (
                      <button key={s.time} type="button" onClick={() => { setTime(s.time); setStep('details'); setError(''); }}
                        className="rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-800 tabular-nums hover:border-gray-400 transition">
                        {timeInTz(s.start, tz)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {step === 'details' && (
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Tus datos</h2>
          {[
            ['guestName', 'Nombre y apellidos', 'text', 'name', 100],
            ['guestPhone', 'Teléfono', 'tel', 'tel', 30],
            ['guestEmail', 'Email', 'email', 'email', 200],
          ].map(([key, label, type, auto, max]) => (
            <label key={key} className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
              <input required type={type} autoComplete={auto} maxLength={max} value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': color }} />
            </label>
          ))}
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Comentarios <span className="text-gray-400">(opcional)</span></span>
            <textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': color }} />
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" className="mt-0.5" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
            <span>
              Acepto que {biz.name} use mis datos para gestionar esta cita y contactarme sobre ella. Como cliente, también podrá
              avisarme de cuándo me toca volver o pedirme mi opinión; puedo darme de baja de esos avisos en cualquier momento
              desde el enlace de cada email.
            </span>
          </label>
          <button type="submit" disabled={sending}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: color }}>
            {sending ? 'Reservando…' : `Confirmar cita · ${time}`}
          </button>
        </form>
      )}

      {step === 'done' && result && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white text-xl" style={{ backgroundColor: color }}>✓</div>
          <h2 className="text-lg font-bold text-gray-900">
            {result.status === 'pending' ? '¡Solicitud enviada!' : '¡Cita reservada!'}
          </h2>
          <p className="text-sm text-gray-600">
            {result.services.map((s) => s.name).join(' + ')}<br />
            <span className="font-semibold first-letter:uppercase inline-block">{dayParts(day).long}</span> a las <span className="font-semibold">{timeInTz(result.start, tz)}</span>
            {staffName && <> con {staffName}</>}
          </p>
          {result.status === 'pending' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">El negocio la revisará y te confirmará.</p>
          )}
          <p className="text-xs text-gray-500">
            Te hemos enviado los detalles a <span className="font-semibold">{form.guestEmail}</span>.
          </p>
          <p className="text-xs text-gray-500">
            También puedes cancelar desde aquí:{' '}
            <a className="font-semibold whitespace-nowrap" style={{ color }}
              href={`/public/${businessId}/cita/cancelar?bookingId=${result.id}&token=${result.token}`}>
              cancelar mi cita
            </a>
          </p>
          <button type="button" className="text-sm font-semibold" style={{ color }}
            onClick={() => { setStep('service'); setService(null); setTime(''); setDay(''); setResult(null); }}>
            Reservar otra cita
          </button>
        </section>
      )}

      {!isEmbed && (
        <p className="text-center text-[11px] text-gray-400 pt-2">
          Reservas con <a href="https://vetrareserve.com" className="font-semibold text-gray-500">Vetra</a>
        </p>
      )}
    </div>,
  );
}
