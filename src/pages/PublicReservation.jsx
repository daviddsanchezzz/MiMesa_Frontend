import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import publicApi from '../services/publicApi';
import TRANSLATIONS from '../i18n';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const ALL_SHIFTS_KEY = '__all__';


function CalIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Z" clipRule="evenodd" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M13.73 8.659a7 7 0 1 0-11.46 0L.5 12.5A.75.75 0 0 0 1 13.5h14a.75.75 0 0 0 .5-1.12L13.73 8.66ZM8 16a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z" clipRule="evenodd" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ── Componente de pago (necesita estar dentro de <Elements>) ─────────────────
function PaymentStep({ paymentConfig, form, brandColor, onBack, onPaid, error, setError, publicApi, businessId }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const bs = { backgroundColor: brandColor };
  const mode = paymentConfig?.mode;

  const depositLabel = () => {
    const cents = paymentConfig?.depositPerPerson
      ? (paymentConfig.depositAmount ?? 0) * form.people
      : (paymentConfig.depositAmount ?? 0);
    return `${(cents / 100).toFixed(2)} ${(paymentConfig?.currency ?? 'eur').toUpperCase()}`;
  };

  const noShowLabel = () => {
    const cents = paymentConfig?.noShowFeeAmount ?? 0;
    return `${(cents / 100).toFixed(2)} ${(paymentConfig?.currency ?? 'eur').toUpperCase()}`;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');

    try {
      if (mode === 'deposit') {
        // 1. Crear PaymentIntent en el backend
        const piRes = await publicApi.post('/reservations/public/payment-intent', {
          businessId,
          people: form.people,
        });
        const { clientSecret } = piRes.data;

        // 2. Confirmar el pago con la tarjeta del huésped
        const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: elements.getElement(CardElement) },
        });
        if (stripeErr) { setError(stripeErr.message); setPaying(false); return; }

        // 3. Crear la reserva pasando el paymentIntentId
        await onPaid({ paymentIntentId: paymentIntent.id });

      } else if (mode === 'card_guarantee') {
        // 1. Crear SetupIntent en el backend
        const siRes = await publicApi.post('/reservations/public/setup-intent', { businessId });
        const { clientSecret } = siRes.data;

        // 2. Confirmar el SetupIntent (guarda la tarjeta sin cobrar)
        const { error: stripeErr, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card: elements.getElement(CardElement) },
        });
        if (stripeErr) { setError(stripeErr.message); setPaying(false); return; }

        // 3. Crear la reserva pasando setupIntentId + paymentMethodId
        await onPaid({
          setupIntentId:   setupIntent.id,
          paymentMethodId: setupIntent.payment_method,
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al procesar el pago');
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {mode === 'deposit' ? 'Pago del depósito' : 'Garantía con tarjeta'}
        </h2>
        <p className="text-sm text-gray-500">
          {mode === 'deposit'
            ? `Se cargará un depósito de ${depositLabel()} para confirmar tu reserva.`
            : `Tu tarjeta no se cobrará ahora. Se guardará como garantía (${noShowLabel()} si no asistes).`
          }
        </p>
      </div>

      {/* Política de cancelación */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-blue-400 mt-0.5 shrink-0">
          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 1.414 1.414L8 7.414V9.5a.5.5 0 0 1-1 0V7.414L6.293 6.707a.999.999 0 0 1 0-1.414Z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-blue-700">
          {mode === 'deposit'
            ? `Cancelación gratuita hasta ${paymentConfig?.freeCancellationHours ?? 24}h antes de la reserva. Fuera de ese plazo el depósito no se reembolsa.`
            : `Sin cargo si cancelas con más de ${paymentConfig?.freeCancellationHours ?? 24}h de antelación.`
          }
        </p>
      </div>

      {/* Resumen reserva */}
      <div className="px-3.5 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700">
        <span className="font-semibold">{form.date}</span> · {form.time} · {form.people} {form.people === 1 ? 'persona' : 'personas'}
      </div>

      {/* Stripe Card Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {mode === 'deposit' ? 'Datos de pago' : 'Datos de tarjeta'}
        </label>
        <div className="border border-gray-300 rounded-xl px-3.5 py-3 bg-white focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-shadow">
          <CardElement options={{
            style: {
              base: {
                fontSize: '14px',
                color: '#111827',
                '::placeholder': { color: '#9CA3AF' },
              },
            },
            hidePostalCode: true,
          }} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
          Atrás
        </button>
        <button type="submit" disabled={!stripe || paying}
          className="flex-1 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          style={bs}>
          {paying && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {mode === 'deposit'
            ? (paying ? 'Procesando...' : `Pagar ${depositLabel()}`)
            : (paying ? 'Guardando...'  : 'Guardar tarjeta y confirmar')
          }
        </button>
      </div>
    </form>
  );
}

export default function PublicReservation() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';
  const [lang, setLang] = useState(() => localStorage.getItem('pr_lang') || 'es');
  const [business, setBusiness] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    guestName: '', guestPhone: '', guestEmail: '',
    roomId: '', date: '', time: '', people: 2, notes: '', consent: false, marketing: false,
    promoCode: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slots, setSlots] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [publicExceptions, setPublicExceptions] = useState({ blockedShifts: [], roomClosures: [] });
  const [loading, setLoading] = useState(true);
  const [hasActivePromo, setHasActivePromo] = useState(false);
  const [promoStatus, setPromoStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid'
  const [promoDesc, setPromoDesc] = useState('');
  // Pago
  const [paymentConfig, setPaymentConfig] = useState(null); // null = cargando, { mode, ... } cuando listo
  const [stripePromise, setStripePromise]  = useState(null);
  const stripeLoadedRef = useRef(false);

  const todayDate = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [monthAvail, setMonthAvail] = useState({ closedDays: [], noSlotDays: [] });

  const tr = TRANSLATIONS[lang];
  const brandColor = business?.brandColor || '#3B82F6';
  const bs = { backgroundColor: brandColor };

  useEffect(() => {
    (async () => {
      try {
        const [bizRes, roomsRes, promoRes, paymentRes] = await Promise.all([
          publicApi.get(`/auth/public/business/${businessId}`),
          publicApi.get(`/rooms/public/${businessId}`),
          publicApi.get(`/promos/public/${businessId}/has-active`).catch(() => ({ data: { hasActive: false } })),
          publicApi.get(`/reservations/public/payment-config?businessId=${businessId}`).catch(() => ({ data: { mode: 'none' } })),
        ]);
        setBusiness(bizRes.data);

        // Cargar Stripe solo si el negocio tiene pagos activos
        const pc = paymentRes.data;
        setPaymentConfig(pc);
        if (pc.mode !== 'none' && !stripeLoadedRef.current) {
          stripeLoadedRef.current = true;
          const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
          if (pubKey) {
            setStripePromise(loadStripe(pubKey));
          }
        }
        setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data?.rooms || []);
        setHasActivePromo(promoRes.data.hasActive);
      } catch {
        setError(tr.businessNotFound);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  const validatePromo = async (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setPromoStatus(null); setPromoDesc(''); return; }
    setPromoStatus('checking');
    try {
      const res = await publicApi.post('/promos/public/validate', { businessId, code: trimmed });
      setPromoStatus('valid');
      setPromoDesc(res.data.description || '');
    } catch {
      setPromoStatus('invalid');
      setPromoDesc('');
    }
  };

  useEffect(() => {
    if (!businessId) return;
    publicApi.get(`/shifts/public/month-availability?year=${calYear}&month=${calMonth + 1}&businessId=${businessId}`)
      .then(res => setMonthAvail(res.data))
      .catch(() => setMonthAvail({ closedDays: [], noSlotDays: [] }));
  }, [calYear, calMonth, businessId]);

  useEffect(() => {
    if (!form.date || !businessId) return;
    setSlots(null);
    setVacation(null);
    Promise.all([
      publicApi.get(`/shifts/public/slots?date=${form.date}&businessId=${businessId}`),
      publicApi.get(`/vacations/public/check?date=${form.date}&businessId=${businessId}`),
      publicApi.get(`/exceptions/public/check?date=${form.date}&businessId=${businessId}`).catch(() => ({ data: { blockedShifts: [], roomClosures: [] } })),
    ])
      .then(([slotsRes, vacRes, exRes]) => {
        const slotsData = Array.isArray(slotsRes.data) ? slotsRes.data
          : Array.isArray(slotsRes.data?.slots) ? slotsRes.data.slots : [];
        const hasAllShiftsBlocked = (exRes.data?.blockedShifts || []).some((r) => r?.allShifts || r?.shiftName === ALL_SHIFTS_KEY);
        const blockedSet = new Set((exRes.data?.blockedShifts || []).map((r) => r.shiftName));
        const filteredSlots = hasAllShiftsBlocked
          ? []
          : slotsData.filter((s) => !blockedSet.has(s.shiftName));
        setVacation(vacRes.data.closed ? vacRes.data : false);
        setPublicExceptions({
          blockedShifts: Array.isArray(exRes.data?.blockedShifts) ? exRes.data.blockedShifts : [],
          roomClosures: Array.isArray(exRes.data?.roomClosures) ? exRes.data.roomClosures : [],
        });
        setSlots(vacRes.data.closed ? [] : filteredSlots);
      })
      .catch(() => {
        setSlots([]);
        setVacation(false);
        setPublicExceptions({ blockedShifts: [], roomClosures: [] });
      });
  }, [form.date, businessId]);

  const selectedSlot = slots?.find(s => s.time === form.time);
  const selectedShiftName = selectedSlot?.shiftName || null;
  const closedRoomIdsForSelectedShift = useMemo(() => {
    if (!selectedShiftName) return new Set();
    const rows = (publicExceptions?.roomClosures || []).filter((r) => (
      r.shiftName === selectedShiftName || r?.allShifts || r?.shiftName === ALL_SHIFTS_KEY
    ));
    return new Set(rows.map((r) => String(r.roomId)).filter(Boolean));
  }, [publicExceptions, selectedShiftName]);
  const availableRooms = useMemo(() => (
    rooms.filter((r) => !closedRoomIdsForSelectedShift.has(String(r._id)))
  ), [rooms, closedRoomIdsForSelectedShift]);
  useEffect(() => {
    if (!form.roomId) return;
    if (closedRoomIdsForSelectedShift.has(String(form.roomId))) {
      setForm((f) => ({ ...f, roomId: '' }));
    }
  }, [closedRoomIdsForSelectedShift, form.roomId]);

  const maxPeople = Math.min(
    business?.maxReservationPeople || 20,
    selectedSlot?.remaining ?? (business?.maxReservationPeople || 20)
  );
  const slotsByShift = useMemo(() => slots?.reduce((acc, s) => {
    if (!acc[s.shiftName]) acc[s.shiftName] = [];
    acc[s.shiftName].push(s);
    return acc;
  }, {}) || {}, [slots]);

  // Antelacion minima: los slots ya fetchados pueden dejar de ser reservables
  // mientras el usuario sigue en la pagina, sin necesidad de recargar.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const isSlotBookable = (time) => {
    if (!business?.minBookingNoticeHours || !form.date) return true;
    const cutoff = now + business.minBookingNoticeHours * 60 * 60 * 1000;
    return new Date(`${form.date}T${time}:00`).getTime() >= cutoff;
  };

  // Calendar helpers
  const calDays = useMemo(() => {
    const dim = new Date(calYear, calMonth + 1, 0).getDate();
    const first = new Date(calYear, calMonth, 1).getDay();
    const offset = first === 0 ? 6 : first - 1;
    return [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  }, [calYear, calMonth]);

  const isDatePast = (day) => new Date(calYear, calMonth, day) < todayDate;
  const fmtDay = (day) => `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const canGoPrev = calYear > todayDate.getFullYear() || calMonth > todayDate.getMonth();

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1);
  };

  const selectDate = (day) => {
    if (isDatePast(day)) return;
    setForm(f => ({ ...f, date: fmtDay(day), time: '' }));
    setStep(2);
  };
  const selectSlot = (s) => {
    const maxP = Math.min(business?.maxReservationPeople || 20, s.remaining ?? (business?.maxReservationPeople || 20));
    setForm(f => ({ ...f, time: s.time, people: Math.min(f.people, maxP) }));
    setStep(3);
  };
  const selectPeople = (n) => { setForm(f => ({ ...f, people: n })); };

  const needsPayment = paymentConfig && paymentConfig.mode !== 'none' && stripePromise;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) { setError(tr.errorName); return; }
    if (!form.guestPhone.trim()) { setError(tr.errorPhone); return; }
    if (!form.guestEmail.trim()) { setError(tr.errorEmail); return; }
    if (!form.consent) { setError(tr.errorConsent); return; }

    // Si hay pago activo, ir al paso 5 en lugar de enviar directamente
    if (needsPayment) {
      setStep(5);
      return;
    }

    await submitReservation({});
  };

  const submitReservation = async ({ paymentIntentId } = {}) => {
    try {
      await publicApi.post('/reservations/public', {
        businessId, ...form,
        roomId: form.roomId || null,
        promoCode: promoStatus === 'valid' ? form.promoCode.trim().toUpperCase() : '',
        marketingConsent: form.marketing,
        marketingConsentText: form.marketing ? tr.consentMarketing : '',
        paymentIntentId,
      });
      setSuccess(tr.successMsg);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'MIN_NOTICE_NOT_MET') {
        setError(tr.errorMinNotice(business?.minBookingNoticeHours));
      } else {
        setError(err.response?.data?.message || tr.errorSave);
      }
    }
  };

  const changeLang = (l) => { setLang(l); localStorage.setItem('pr_lang', l); };

  // postMessage height for iframe embed
  useEffect(() => {
    if (!isEmbed) return;
    const sendHeight = () => {
      window.parent.postMessage({ type: 'VETRA_HEIGHT', height: document.documentElement.scrollHeight }, '*');
    };
    sendHeight();
    window.addEventListener('resize', sendHeight);
    return () => window.removeEventListener('resize', sendHeight);
  }, [isEmbed, step, success, slots, loading]);

  if (loading) return (
    <div className={`w-full flex items-center justify-center ${isEmbed ? 'py-12' : 'min-h-screen bg-gray-50'}`}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl animate-pulse mx-auto mb-3" style={bs} />
        <p className="text-gray-600">{tr.loading}</p>
      </div>
    </div>
  );
  if (error && !business) return (
    <div className={`w-full flex items-center justify-center ${isEmbed ? 'py-12' : 'min-h-screen bg-gray-50'}`}>
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        {!isEmbed && (
          <button onClick={() => navigate('/')} className="text-violet-600 hover:underline">{tr.backHome}</button>
        )}
      </div>
    </div>
  );

  const dateLabel = form.date
    ? (form.date === todayStr ? tr.today : new Date(form.date + 'T00:00:00').toLocaleDateString(tr.dateLocale, { day: 'numeric', month: 'short' }))
    : null;
  const peopleOptions = Array.from({ length: Math.min(maxPeople, 20) }, (_, i) => i + 1);
  const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';
  const multiShift = Object.keys(slotsByShift).length > 1;

  return (
    <div className={isEmbed ? 'w-full flex justify-center px-4 py-6 box-border' : 'min-h-screen bg-gray-50 py-8 px-4'}>
      <div className={isEmbed ? 'w-full max-w-sm' : 'max-w-sm mx-auto'}>
        {/* Lang selector */}
        <div className="flex justify-end mb-2">
          {['es', 'ca', 'en'].map(l => (
            <button key={l} type="button" onClick={() => changeLang(l)}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${lang === l ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
              style={lang === l ? bs : {}}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">{tr.bookTable}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{business?.name}</p>
          </div>

          {success ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 font-medium">{success}</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Step bar */}
              <div className="flex items-center justify-between mb-7">
                {/* Step 1 */}
                <button type="button" onClick={() => step > 1 && setStep(1)}
                  className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    step === 1 ? 'text-white px-3 py-1.5 rounded-full' : step > 1 ? 'text-gray-600 hover:text-gray-900 cursor-pointer' : 'text-gray-300 cursor-default'
                  }`}
                  style={step === 1 ? bs : {}}>
                  <CalIcon />
                  {step === 1 ? tr.stepDate : (dateLabel || tr.stepDate)}
                </button>
                <ChevronRight />
                {/* Step 2 */}
                <button type="button" onClick={() => step > 2 && setStep(2)}
                  disabled={step < 2}
                  className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    step === 2 ? 'text-white px-3 py-1.5 rounded-full' : step > 2 ? 'text-gray-600 hover:text-gray-900 cursor-pointer' : 'text-gray-300 cursor-default'
                  }`}
                  style={step === 2 ? bs : {}}>
                  <ClockIcon />
                  {step > 2 ? form.time : tr.stepTime}
                </button>
                <ChevronRight />
                {/* Step 3 */}
                <button type="button" onClick={() => step > 3 && setStep(3)}
                  disabled={step < 3}
                  className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    step === 3 ? 'text-white px-3 py-1.5 rounded-full' : step > 3 ? 'text-gray-600 hover:text-gray-900 cursor-pointer' : 'text-gray-300 cursor-default'
                  }`}
                  style={step === 3 ? bs : {}}>
                  <PersonIcon />
                  {step > 3 ? tr.persShort(form.people) : tr.stepPeople}
                </button>
                <ChevronRight />
                {/* Step 4 */}
                <div className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap shrink-0 ${
                  step === 4 ? 'text-white px-3 py-1.5 rounded-full' : 'text-gray-300'
                }`} style={step === 4 ? bs : {}}>
                  <BellIcon />
                  {step === 4 && tr.stepConfirm}
                </div>
              </div>

              {/* STEP 1: Calendar */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">{tr.pickDate}</h2>
                  <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={prevMonth} disabled={!canGoPrev}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="font-semibold text-gray-800 text-sm">
                      {tr.monthNames[calMonth]} {calYear}
                    </span>
                    <button type="button" onClick={nextMonth}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {tr.dayNames.map(d => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {calDays.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} />;
                      const past = isDatePast(day);
                      const closed = !past && monthAvail.closedDays.includes(day);
                      const noSlot = !past && !closed && monthAvail.noSlotDays.includes(day);
                      const unavailable = past || closed || noSlot;
                      const sel = form.date === fmtDay(day);
                      return (
                        <button key={day} type="button"
                          onClick={() => !unavailable && selectDate(day)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                            unavailable ? 'cursor-default' : sel ? 'text-white' : 'text-gray-700 hover:bg-gray-100'
                          } ${past || noSlot ? 'text-gray-300' : closed ? 'text-red-300' : ''}`}
                          style={sel ? bs : {}}>
                          {day}
                          {closed && <span className="w-1 h-1 rounded-full bg-red-300 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Time slots */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">{tr.pickTime}</h2>
                  {slots === null ? (
                    <div className="text-gray-500 text-sm">{tr.loadingSlots}</div>
                  ) : vacation?.closed ? (
                    <div className="space-y-3">
                      <div className="text-red-600 text-sm">{tr.closed(vacation.reason || tr.noReason)}</div>
                      <button type="button" onClick={() => setStep(1)}
                        className="text-sm font-medium hover:underline" style={{ color: brandColor }}>
                        {tr.changeDate}
                      </button>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="space-y-3">
                      <div className="text-gray-500 text-sm">{tr.noSlots}</div>
                      {(publicExceptions?.blockedShifts || []).length > 0 && (
                        <div className="space-y-1.5">
                          {(publicExceptions.blockedShifts || []).map((b, idx) => (
                            <p key={`${b.shiftName}-${idx}`} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              <strong>{b?.allShifts || b?.shiftName === ALL_SHIFTS_KEY ? 'Todos los turnos' : b.shiftName}:</strong> {b.message || 'No disponible por excepcion'}
                            </p>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setStep(1)}
                        className="text-sm font-medium hover:underline" style={{ color: brandColor }}>
                        {tr.changeDate}
                      </button>
                    </div>
                  ) : (
                    Object.entries(slotsByShift).map(([shiftName, shiftSlots]) => (
                      <div key={shiftName} className="mb-5">
                        {multiShift && <p className="text-sm font-semibold text-gray-600 mb-3">{shiftName}</p>}
                        <div className="grid grid-cols-3 gap-2">
                          {shiftSlots.map(s => {
                            const bookable = isSlotBookable(s.time);
                            return (
                              <button key={s.time} type="button" disabled={!bookable}
                                onClick={() => bookable && selectSlot(s)}
                                title={bookable ? undefined : tr.errorMinNotice(business?.minBookingNoticeHours)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                  !bookable
                                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                    : form.time === s.time
                                      ? 'text-white border-transparent'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                }`}
                                style={bookable && form.time === s.time ? bs : {}}>
                                {s.label || s.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STEP 3: People */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">{tr.pickPeople}</h2>
                  {peopleOptions.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-gray-500 text-sm">{tr.noCapacity}</p>
                      <button type="button" onClick={() => setStep(2)}
                        className="text-sm font-medium hover:underline" style={{ color: brandColor }}>
                        {tr.changeTime}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {peopleOptions.map(n => (
                          <button key={n} type="button" onClick={() => selectPeople(n)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                              form.people === n ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                            }`}
                            style={form.people === n ? bs : {}}>
                            {n}
                          </button>
                        ))}
                      </div>
                      {business?.maxReservationPeople && (
                        <p className="text-xs text-gray-400 mt-3">{tr.maxPeople(business.maxReservationPeople)}</p>
                      )}
                      {rooms.length > 0 && (
                        <div className="mt-5">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {tr.room} <span className="text-gray-400 font-normal">{tr.roomOptional}</span>
                          </label>
                          {selectedShiftName && closedRoomIdsForSelectedShift.size > 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2">
                              Algunas salas están cerradas para el turno <strong>{selectedShiftName}</strong>.
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button"
                              onClick={() => setForm(f => ({ ...f, roomId: '' }))}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                form.roomId === '' ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                              }`}
                              style={form.roomId === '' ? bs : {}}>
                              {tr.noPreference}
                            </button>
                            {availableRooms.map(r => (
                              <button key={r._id} type="button"
                                onClick={() => setForm(f => ({ ...f, roomId: r._id }))}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                  form.roomId === r._id ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                }`}
                                style={form.roomId === r._id ? bs : {}}>
                                {r.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={() => setStep(4)}
                        className="w-full mt-5 py-3 rounded-xl text-white font-medium transition-colors"
                        style={bs}>
                        {tr.continue}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* STEP 4: Contact form */}
              {step === 4 && (
                <form onSubmit={handleSubmit}>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">{tr.yourData}</h2>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.name} *</label>
                      <input type="text" required value={form.guestName}
                        onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                        className={inputCls} placeholder={tr.namePlaceholder} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.phone} *</label>
                      <input type="tel" required value={form.guestPhone}
                        onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                        className={inputCls} placeholder="+34 600 000 000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.email} *</label>
                      <input type="email" required value={form.guestEmail}
                        onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                        className={inputCls} placeholder="tu@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.notes}</label>
                      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        className={inputCls} rows={3} placeholder={tr.notesPlaceholder} />
                    </div>
                    {hasActivePromo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tr.promoCode} <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={form.promoCode}
                          onChange={e => {
                            setForm(f => ({ ...f, promoCode: e.target.value }));
                            setPromoStatus(null);
                            setPromoDesc('');
                          }}
                          onBlur={e => validatePromo(e.target.value)}
                          className={`${inputCls} uppercase ${
                            promoStatus === 'valid' ? 'border-green-400 focus:ring-green-400' :
                            promoStatus === 'invalid' ? 'border-red-400 focus:ring-red-400' : ''
                          }`}
                          placeholder={tr.promoCodePlaceholder}
                          maxLength={32}
                        />
                        {promoStatus === 'checking' && (
                          <p className="text-xs text-gray-400 mt-1">{tr.promoCodeChecking}</p>
                        )}
                        {promoStatus === 'valid' && (
                          <p className="text-xs text-green-600 mt-1">✓ {tr.promoCodeValid(promoDesc)}</p>
                        )}
                        {promoStatus === 'invalid' && (
                          <p className="text-xs text-red-500 mt-1">{tr.promoCodeInvalid}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-5">
                    {/* Optional: marketing */}
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.marketing}
                        onChange={e => setForm(f => ({ ...f, marketing: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded shrink-0 accent-violet-600"
                      />
                      <span className="text-sm text-gray-500 leading-snug">{tr.consentMarketing}</span>
                    </label>
                    {/* Required: privacy consent */}
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded shrink-0 accent-violet-600"
                      />
                      <span className="text-sm text-gray-600 leading-snug">
                        {tr.consentPrivacyPre}{' '}
                        <a
                          href={`${import.meta.env.VITE_LANDING_URL || ''}/privacy.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 font-medium"
                          style={{ color: brandColor }}
                        >
                          {tr.consentPrivacyLink}
                        </a>
                        {tr.consentPrivacyPost}
                        {' '}<span className="text-gray-400">*</span>
                      </span>
                    </label>
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">{error}</div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(3)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                      {tr.back}
                    </button>
                    <button type="submit" className="flex-1 text-white py-3 rounded-xl font-medium transition-colors" style={bs}>
                      {needsPayment ? 'Siguiente →' : tr.book}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 5: Payment */}
              {/* STEP 5: Payment */}
              {step === 5 && stripePromise && (
                <Elements stripe={stripePromise}>
                  <PaymentStep
                    paymentConfig={paymentConfig}
                    form={form}
                    brandColor={brandColor}
                    onBack={() => setStep(4)}
                    onPaid={submitReservation}
                    error={error}
                    setError={setError}
                    publicApi={publicApi}
                    businessId={businessId}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>

        {!isEmbed && (business?.phone || business?.email) && (
          <p className="text-center text-sm text-gray-400 mt-3">
            {business?.phone}{business?.phone && business?.email && ' · '}{business?.email}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5">
          <img src={`${import.meta.env.VITE_LANDING_URL || 'https://vetrareserve.com'}/logo.svg`} alt="" className="w-4 h-4 opacity-40" />
          <p className="text-xs text-gray-300">
            Powered by{' '}
            <a
              href={import.meta.env.VITE_LANDING_URL || 'https://vetrareserve.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-500 font-medium transition-colors"
            >
              Vetra
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

