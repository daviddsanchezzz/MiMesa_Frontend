import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicApi from '../services/publicApi';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function PublicReservation() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    roomId: '',
    date: new Date().toISOString().slice(0, 10),
    time: '',
    people: 2,
    notes: '',
    consent: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slots, setSlots] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic styles based on brand color
  const brandColor = business?.brandColor || '#3B82F6';
  const buttonStyle = { backgroundColor: brandColor };
  const buttonHoverStyle = { backgroundColor: adjustColor(brandColor, -20) };
  const focusRingStyle = { '--tw-ring-color': brandColor };

  // Helper function to darken color for hover states
  function adjustColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [businessRes, roomsRes] = await Promise.all([
          publicApi.get(`/auth/public/business/${businessId}`),
          publicApi.get(`/rooms/public/${businessId}`),
        ]);
        setBusiness(businessRes.data);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data?.rooms || []);      } catch (err) {
        setError('Negocio no encontrado');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [businessId]);

  // Adjust people count if business max changes
  useEffect(() => {
    if (business?.maxReservationPeople && form.people > business.maxReservationPeople) {
      setForm(f => ({ ...f, people: business.maxReservationPeople }));
    }
  }, [business?.maxReservationPeople, form.people]);

  useEffect(() => {
  if (!form.date || !businessId) return;
  setSlots(null);
  setVacation(null);

  Promise.all([
    publicApi.get(`/shifts/public/slots?date=${form.date}&businessId=${businessId}`),
    publicApi.get(`/vacations/public/check?date=${form.date}&businessId=${businessId}`),
  ])
    .then(([slotsRes, vacRes]) => {
      const slotsData = Array.isArray(slotsRes.data)
        ? slotsRes.data
        : Array.isArray(slotsRes.data?.slots)
        ? slotsRes.data.slots
        : [];

      setVacation(vacRes.data.closed ? vacRes.data : false);

      if (!vacRes.data.closed) {
        setSlots(slotsData);

        if (slotsData.length > 0) {
          setForm((f) => {
            if (!slotsData.find((s) => s.time === f.time)) {
              return { ...f, time: slotsData[0].time };
            }
            return f;
          });
        }
      } else {
        setSlots([]);
      }
    })
    .catch(() => {
      setSlots([]);
      setVacation(false);
    });
}, [form.date, businessId]);

  const isClosed = vacation && vacation.closed;
  const isBlocked = isClosed || (slots !== null && slots.length === 0);
  const field = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const slotsByShift = slots?.reduce((acc, s) => {
    if (!acc[s.shiftName]) acc[s.shiftName] = [];
    acc[s.shiftName].push(s);
    return acc;
  }, {}) || {};
  const multiShift = Object.keys(slotsByShift).length > 1;

  const goNext = () => {
    setError('');
    if (isClosed) { setError('El restaurante está cerrado ese día'); return; }
    if (slots !== null && slots.length === 0) { setError('No hay turnos para este día'); return; }
    if (!form.time) { setError('Selecciona una hora'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.guestName.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.consent) { setError('Debes aceptar la política de privacidad para continuar'); return; }
    try {
      await publicApi.post('/reservations/public', { businessId, ...form, roomId: form.roomId || null });
      setSuccess('¡Reserva creada exitosamente! Te contactaremos pronto.');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl animate-pulse mx-auto mb-3" style={buttonStyle} />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ── STEP INDICATOR ─────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          {s > 1 && <div className={`h-px flex-1 w-8 ${step >= s ? '' : 'bg-gray-200'}`} style={step >= s ? { backgroundColor: brandColor } : {}} />}
          <button
            type="button"
            onClick={() => s < step && setStep(s)}
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === s
                ? 'text-white'
                : step > s
                ? 'cursor-pointer'
                : 'bg-gray-100 text-gray-400'
            }`}
            style={step === s ? buttonStyle : step > s ? { color: brandColor } : {}}
            onMouseEnter={(e) => {
              if (step > s) {
                e.target.style.backgroundColor = adjustColor(brandColor, 40);
              }
            }}
            onMouseLeave={(e) => {
              if (step > s) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = brandColor;
              }
            }}
          >
            {s}
          </button>
          <span className={`text-xs font-medium ${step === s ? 'text-gray-700' : 'text-gray-400'}`}>
            {s === 1 ? 'Cuándo' : 'Quién'}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
          <p className="text-gray-600">Reservar mesa</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <StepBar />
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">{error}</div>}

            {step === 1 ? (
              <>
                {/* Date + people row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelCls}>Fecha *</label>
                    <input type="date" required value={form.date} onChange={field('date')} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Personas *</label>
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, people: Math.max(1, Number(f.people) - 1) }))}
                        className="w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-lg font-semibold flex items-center justify-center shrink-0 transition-colors">
                        −
                      </button>
                      <span className="flex-1 text-center text-lg font-bold text-gray-900">{form.people}</span>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, people: Math.min(business?.maxReservationPeople || 20, Number(f.people) + 1) }))}
                        disabled={form.people >= (business?.maxReservationPeople || 20)}
                        className="w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-lg font-semibold flex items-center justify-center shrink-0 transition-colors">
                        +
                      </button>
                    </div>
                    {business?.maxReservationPeople && (
                      <p className="text-xs text-gray-500 mt-1">Máximo {business.maxReservationPeople} personas por reserva</p>
                    )}
                  </div>
                </div>

                {/* Room */}
                <div className="mb-4">
                  <label className={labelCls}>Sala <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <select value={form.roomId} onChange={field('roomId')} className={inputCls}>
                    <option value="">Sin preferencia</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Time slots */}
                <div className="mb-6">
                  <label className={labelCls}>Hora *</label>
                  {isBlocked ? (
                    <div className="text-red-600 text-sm">
                      {isClosed ? `Cerrado: ${vacation.reason || 'Sin motivo especificado'}` : 'No hay turnos disponibles'}
                    </div>
                  ) : slots === null ? (
                    <div className="text-gray-500 text-sm">Cargando horarios...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(slotsByShift).map(([shiftName, shiftSlots]) => (
                        <div key={shiftName} className="col-span-3">
                          {multiShift && <div className="text-xs font-medium text-gray-600 mb-1">{shiftName}</div>}
                          <div className="grid grid-cols-3 gap-2">
                            {shiftSlots.map(s => (
                              <button
                                key={s.time}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, time: s.time }))}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                  form.time === s.time
                                    ? 'text-white border-transparent'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                }`}
                                style={form.time === s.time ? buttonStyle : {}}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Business contact info */}
                {(business?.name || business?.phone) && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-500">
                        <path fillRule="evenodd" d="M4 3a2 2 0 0 0-2 2v1.161l4.857 3.048a2 2 0 0 0 2.286 0L14 6.161V5a2 2 0 0 0-2-2H4Zm10 4.094-3.429 2.15A3.5 3.5 0 0 1 6.429 9.244L2 7.094V11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.094Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600 leading-tight">
                      {business?.name && <span className="font-medium text-gray-800">{business.name}</span>}
                      {business?.name && business?.phone && <span className="mx-1.5 text-gray-300">·</span>}
                      {business?.phone && <span>{business.phone}</span>}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={goNext}
                  disabled={isBlocked || !form.time}
                  className="w-full text-white py-3 rounded-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  style={isBlocked || !form.time ? {} : buttonStyle}
                  onMouseEnter={(e) => {
                    if (!(isBlocked || !form.time)) {
                      e.target.style.backgroundColor = buttonHoverStyle.backgroundColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(isBlocked || !form.time)) {
                      e.target.style.backgroundColor = brandColor;
                    }
                  }}
                >
                  Continuar
                </button>
              </>
            ) : (
              <>
                {/* Reservation summary */}
                <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Z" clipRule="evenodd" />
                    </svg>
                    {new Date(form.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="w-px h-4 bg-gray-300 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                      <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                    </svg>
                    {form.time}
                  </div>
                  <div className="w-px h-4 bg-gray-300 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                    </svg>
                    {form.people} {form.people === 1 ? 'persona' : 'personas'}
                  </div>
                  {form.roomId && rooms.find(r => r._id === form.roomId) && (
                    <>
                      <div className="w-px h-4 bg-gray-300 hidden sm:block" />
                      <div className="text-sm font-medium text-gray-700">{rooms.find(r => r._id === form.roomId).name}</div>
                    </>
                  )}
                </div>

                {/* Guest info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className={labelCls}>Nombre *</label>
                    <input type="text" required value={form.guestName} onChange={field('guestName')} className={inputCls} placeholder="Tu nombre completo" />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono</label>
                    <input type="tel" value={form.guestPhone} onChange={field('guestPhone')} className={inputCls} placeholder="+34 600 000 000" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={form.guestEmail} onChange={field('guestEmail')} className={inputCls} placeholder="tu@email.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Notas</label>
                    <textarea value={form.notes} onChange={field('notes')} className={inputCls} rows={3} placeholder="Alergias, preferencias especiales..." />
                  </div>
                </div>

                {/* Información del negocio y consentimiento */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-600">
                        <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 2Zm-.75 6a.75.75 0 1 0 1.5 0v3.5a.75.75 0 1 0 1.5 0V6A2.25 2.25 0 0 0 8 3.75h-.25A2.25 2.25 0 0 0 5.5 6v.25a.75.75 0 0 1-1.5 0V6c0-1.518 1.232-2.75 2.75-2.75h.25Zm2.25 6.5a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0 0 1.5h3Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Información de contacto</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {business?.name && <p className="font-medium">{business.name}</p>}
                        {business?.phone && <p>📞 {business.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => setForm(f => ({ ...f, consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                      <div className="text-xs text-gray-600 leading-relaxed">
                        <p className="font-medium mb-1">Política de privacidad y protección de datos</p>
                        <p>
                          Al realizar esta reserva, acepto que mis datos personales sean tratados por {business?.name || 'este establecimiento'} 
                          únicamente para gestionar mi reserva y posibles comunicaciones relacionadas. 
                          Mis datos no serán cedidos a terceros sin mi consentimiento expreso.
                        </p>
                        <p className="mt-1">
                          Puedes ejercer tus derechos de acceso, rectificación, supresión y portabilidad 
                          contactando directamente con el establecimiento.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-white py-3 rounded-xl font-medium transition-colors"
                    style={buttonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = buttonHoverStyle.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = brandColor;
                    }}
                  >
                    Reservar
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}