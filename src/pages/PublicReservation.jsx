import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import publicApi from '../services/publicApi';
import TRANSLATIONS from '../i18n';



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
    roomId: '', date: '', time: '', people: 2, notes: '', consent: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slots, setSlots] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [loading, setLoading] = useState(true);

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
        const [bizRes, roomsRes] = await Promise.all([
          publicApi.get(`/auth/public/business/${businessId}`),
          publicApi.get(`/rooms/public/${businessId}`),
        ]);
        setBusiness(bizRes.data);
        setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data?.rooms || []);
      } catch {
        setError(tr.businessNotFound);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

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
    ])
      .then(([slotsRes, vacRes]) => {
        const slotsData = Array.isArray(slotsRes.data) ? slotsRes.data
          : Array.isArray(slotsRes.data?.slots) ? slotsRes.data.slots : [];
        setVacation(vacRes.data.closed ? vacRes.data : false);
        setSlots(vacRes.data.closed ? [] : slotsData);
      })
      .catch(() => { setSlots([]); setVacation(false); });
  }, [form.date, businessId]);

  const selectedSlot = slots?.find(s => s.time === form.time);
  const maxPeople = Math.min(
    business?.maxReservationPeople || 20,
    selectedSlot?.remaining ?? (business?.maxReservationPeople || 20)
  );
  const slotsByShift = useMemo(() => slots?.reduce((acc, s) => {
    if (!acc[s.shiftName]) acc[s.shiftName] = [];
    acc[s.shiftName].push(s);
    return acc;
  }, {}) || {}, [slots]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) { setError(tr.errorName); return; }
    if (!form.consent) { setError(tr.errorConsent); return; }
    try {
      await publicApi.post('/reservations/public', { businessId, ...form, roomId: form.roomId || null });
      setSuccess(tr.successMsg);
    } catch (err) {
      setError(err.response?.data?.message || tr.errorSave);
    }
  };

  const changeLang = (l) => { setLang(l); localStorage.setItem('pr_lang', l); };

  // postMessage height for iframe embed
  useEffect(() => {
    if (!isEmbed) return;
    const sendHeight = () => {
      window.parent.postMessage({ type: 'MIMESA_HEIGHT', height: document.documentElement.scrollHeight }, '*');
    };
    sendHeight();
    window.addEventListener('resize', sendHeight);
    return () => window.removeEventListener('resize', sendHeight);
  }, [isEmbed, step, success, slots, loading]);

  if (loading) return (
    <div className={`${isEmbed ? 'p-8' : 'min-h-screen bg-gray-50'} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl animate-pulse mx-auto mb-3" style={bs} />
        <p className="text-gray-600">{tr.loading}</p>
      </div>
    </div>
  );
  if (error && !business) return (
    <div className={`${isEmbed ? 'p-8' : 'min-h-screen bg-gray-50'} flex items-center justify-center`}>
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        {!isEmbed && (
          <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">{tr.backHome}</button>
        )}
      </div>
    </div>
  );

  const dateLabel = form.date
    ? (form.date === todayStr ? tr.today : new Date(form.date + 'T00:00:00').toLocaleDateString(tr.dateLocale, { day: 'numeric', month: 'short' }))
    : null;
  const peopleOptions = Array.from({ length: Math.min(maxPeople, 20) }, (_, i) => i + 1);
  const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
  const multiShift = Object.keys(slotsByShift).length > 1;

  return (
    <div className={isEmbed ? 'p-3 w-full' : 'min-h-screen bg-gray-50 py-8 px-4'}>
      <div className={`max-w-sm ${isEmbed ? 'w-full' : 'mx-auto'}`}>
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
                          {shiftSlots.map(s => (
                            <button key={s.time} type="button" onClick={() => selectSlot(s)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                form.time === s.time ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                              }`}
                              style={form.time === s.time ? bs : {}}>
                              {s.label || s.time}
                            </button>
                          ))}
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
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button"
                              onClick={() => setForm(f => ({ ...f, roomId: '' }))}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                form.roomId === '' ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                              }`}
                              style={form.roomId === '' ? bs : {}}>
                              {tr.noPreference}
                            </button>
                            {rooms.map(r => (
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.phone}</label>
                      <input type="tel" value={form.guestPhone}
                        onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                        className={inputCls} placeholder="+34 600 000 000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.email}</label>
                      <input type="email" value={form.guestEmail}
                        onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                        className={inputCls} placeholder="tu@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.notes}</label>
                      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        className={inputCls} rows={3} placeholder={tr.notesPlaceholder} />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.consent}
                        onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded" />
                      <div className="text-xs text-gray-600 leading-relaxed">
                        <p className="font-medium mb-1">{tr.privacyTitle}</p>
                        <p>{tr.privacyText(business?.name || 'este establecimiento')}</p>
                        <p className="mt-1">{tr.privacyRights}</p>
                      </div>
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
                      {tr.book}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {!isEmbed && (business?.phone || business?.email) && (
          <p className="text-center text-sm text-gray-400 mt-3">
            {business?.phone}{business?.phone && business?.email && ' · '}{business?.email}
          </p>
        )}
      </div>
    </div>
  );
}
