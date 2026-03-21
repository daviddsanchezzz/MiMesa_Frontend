import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function StepPill({ active, enabled, onClick, label, value, icon }) {
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
        active
          ? 'text-white px-3 py-1.5 rounded-full bg-indigo-600'
          : enabled
          ? 'text-gray-600 hover:text-gray-900 cursor-pointer'
          : 'text-gray-300 cursor-default'
      }`}
    >
      {icon}
      {value || label}
    </button>
  );
}

function ChevronRight() {
  return (
    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

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

export default function ReservationForm({ reservation, onSave, onCancel, initialContext = null }) {
  const { business } = useAuth();
  const isEdit = Boolean(reservation?._id);
  const initialDate = reservation?.date || initialContext?.date || new Date().toISOString().slice(0, 10);
  const [rooms, setRooms] = useState(initialContext?.rooms || []);
  const [step, setStep] = useState(isEdit ? 4 : 1);
  const [form, setForm] = useState({
    guestName: reservation?.guestName || '',
    guestPhone: reservation?.guestPhone || '',
    guestEmail: reservation?.guestEmail || '',
    roomId: reservation?.roomId?._id || reservation?.roomId || '',
    date: initialDate,
    time: reservation?.time || initialContext?.slots?.[0]?.time || '',
    people: reservation?.people || 2,
    status: reservation?.status || 'pending',
    notes: reservation?.notes || '',
  });
  const [error, setError] = useState('');
  const [slots, setSlots] = useState(initialContext?.slots ?? null);
  const [vacation, setVacation] = useState(initialContext?.vacation ?? null);
  const skipInitialFetchRef = useRef(Boolean(initialContext && !isEdit && initialContext?.date === initialDate));

  const selectedDate = new Date(`${form.date}T12:00:00`);
  const [calYear, setCalYear] = useState(selectedDate.getFullYear());
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (rooms.length > 0) return;
    api.get('/rooms').then((r) => setRooms(r.data)).catch(() => setRooms([]));
  }, [rooms.length]);

  useEffect(() => {
    if (!form.date) return;
    if (skipInitialFetchRef.current && form.date === initialDate) {
      skipInitialFetchRef.current = false;
      return;
    }
    setSlots(null);
    setVacation(null);
    Promise.all([
      api.get(`/shifts/slots?date=${form.date}`),
      api.get(`/vacations/check?date=${form.date}`),
    ])
      .then(([slotsRes, vacRes]) => {
        setVacation(vacRes.data.closed ? vacRes.data : false);
        if (vacRes.data.closed) {
          setSlots([]);
          return;
        }
        setSlots(slotsRes.data);
        if (slotsRes.data.length > 0) {
          setForm((f) => (slotsRes.data.find((s) => s.time === f.time) ? f : { ...f, time: slotsRes.data[0].time }));
        }
      })
      .catch(() => {
        setSlots([]);
        setVacation(false);
      });
  }, [form.date, initialDate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calDays = useMemo(() => {
    const dim = new Date(calYear, calMonth + 1, 0).getDate();
    const first = new Date(calYear, calMonth, 1).getDay();
    const offset = first === 0 ? 6 : first - 1;
    return [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  }, [calYear, calMonth]);

  const slotsByShift = useMemo(
    () =>
      slots?.reduce((acc, s) => {
        if (!acc[s.shiftName]) acc[s.shiftName] = [];
        acc[s.shiftName].push(s);
        return acc;
      }, {}) || {},
    [slots]
  );
  const multiShift = Object.keys(slotsByShift).length > 1;
  const quickPeopleMax = Math.max(1, Number(business?.maxReservationPeople) || 10);
  const peopleOptions = Array.from({ length: quickPeopleMax }, (_, i) => i + 1);
  const [customPeopleOpen, setCustomPeopleOpen] = useState(form.people > quickPeopleMax);

  const isDatePast = (day) => new Date(calYear, calMonth, day) < today;
  const fmtDay = (day) => `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const canGoPrev = calYear > today.getFullYear() || calMonth > today.getMonth();
  const dateLabel = form.date
    ? new Date(`${form.date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : null;

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const selectDate = (day) => {
    if (isDatePast(day)) return;
    setForm((f) => ({ ...f, date: fmtDay(day), time: '' }));
    setStep(2);
  };

  const selectSlot = (time) => {
    setForm((f) => ({ ...f, time }));
    setStep(3);
  };

  const goToStep = (target) => {
    if (isEdit || target < step) setStep(target);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    try {
      const payload = { ...form, roomId: form.roomId || null };
      if (isEdit) await api.put(`/reservations/${reservation._id}`, payload);
      else await api.post('/reservations', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <StepPill active={step === 1} enabled={isEdit || step > 1} onClick={() => goToStep(1)} label="Fecha" value={dateLabel} icon={<CalIcon />} />
        <ChevronRight />
        <StepPill active={step === 2} enabled={isEdit || step > 2} onClick={() => goToStep(2)} label="Hora" value={step > 2 ? form.time : null} icon={<ClockIcon />} />
        <ChevronRight />
        <StepPill active={step === 3} enabled={isEdit || step > 3} onClick={() => goToStep(3)} label="Personas" value={step > 3 ? `${form.people}p` : null} icon={<PersonIcon />} />
        <ChevronRight />
        <StepPill active={step === 4} enabled={false} label="Datos" icon={<BellIcon />} />
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Selecciona fecha</h3>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} disabled={!canGoPrev} className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="font-semibold text-sm text-gray-800">{monthNames[calMonth]} {calYear}</span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100">
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const past = isDatePast(day);
              const selected = form.date === fmtDay(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !past && selectDate(day)}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    past ? 'text-gray-300 cursor-default' : selected ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Selecciona hora</h3>
          {slots === null ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : vacation?.closed ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">Restaurante cerrado en esta fecha.</div>
          ) : slots.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">No hay turnos para este dia.</div>
          ) : (
            Object.entries(slotsByShift).map(([shiftName, shiftSlots]) => (
              <div key={shiftName} className="mb-4 last:mb-0">
                {multiShift && <p className="text-sm font-semibold text-gray-600 mb-2">{shiftName}</p>}
                <div className="grid grid-cols-3 gap-2">
                  {shiftSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => selectSlot(slot.time)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        form.time === slot.time ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {slot.label || slot.time}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Selecciona personas</h3>
          <div className="grid grid-cols-4 gap-2">
            {peopleOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCustomPeopleOpen(false);
                  setForm((f) => ({ ...f, people: n }));
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  form.people === n ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomPeopleOpen(true)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                customPeopleOpen ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              Otro
            </button>
          </div>
          {customPeopleOpen && (
            <div className="mt-3">
              <label className={`${labelCls} mb-1`}>Numero personalizado</label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.people}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    people: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Usa "Otro" para valores por encima de {quickPeopleMax}.</p>
            </div>
          )}
          {rooms.length > 0 && (
            <div className="mt-5">
              <label className={`${labelCls} mb-2`}>Sala <span className="text-gray-400 font-normal">(opcional)</span></label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, roomId: '' }))}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    form.roomId === '' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Sin preferencia
                </button>
                {rooms.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, roomId: r._id }))}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      form.roomId === r._id ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setStep(4)} className="w-full mt-5 py-3 rounded-xl text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors">
            Continuar
          </button>
        </div>
      )}

      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-2.5 text-sm text-indigo-700 font-medium">
            {form.date} · {form.time} · {form.people} {form.people === 1 ? 'persona' : 'personas'}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className={labelCls}>Nombre *</label>
            <input required autoFocus value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Telefono <span className="text-gray-400 font-normal">(opc.)</span></label>
              <input value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email <span className="text-gray-400 font-normal">(opc.)</span></label>
              <input type="email" value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="seated">Sentada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
              Atras
            </button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {isEdit ? 'Guardar cambios' : 'Crear reserva'}
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
