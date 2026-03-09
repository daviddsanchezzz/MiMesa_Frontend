import { useState, useEffect } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function ReservationForm({ reservation, onSave, onCancel }) {
  const [rooms, setRooms] = useState([]);
  const [step, setStep] = useState(1); // 1 = when/how many, 2 = who
  const [form, setForm] = useState({
    guestName:  reservation?.guestName  || '',
    guestPhone: reservation?.guestPhone || '',
    guestEmail: reservation?.guestEmail || '',
    roomId:     reservation?.roomId?._id || reservation?.roomId || '',
    date:       reservation?.date  || new Date().toISOString().slice(0, 10),
    time:       reservation?.time  || '',
    people:     reservation?.people || 2,
    status:     reservation?.status || 'pending',
    notes:      reservation?.notes  || '',
  });
  const [error, setError] = useState('');
  const [slots, setSlots] = useState(null);
  const [vacation, setVacation] = useState(null);

  useEffect(() => {
    api.get('/rooms').then(r => setRooms(r.data));
  }, []);

  useEffect(() => {
    if (!form.date) return;
    setSlots(null);
    setVacation(null);
    Promise.all([
      api.get(`/shifts/slots?date=${form.date}`),
      api.get(`/vacations/check?date=${form.date}`),
    ]).then(([slotsRes, vacRes]) => {
      setVacation(vacRes.data.closed ? vacRes.data : false);
      if (!vacRes.data.closed) {
        setSlots(slotsRes.data);
        if (slotsRes.data.length > 0) {
          setForm(f => {
            if (!slotsRes.data.find(s => s.time === f.time)) {
              return { ...f, time: slotsRes.data[0].time };
            }
            return f;
          });
        }
      } else {
        setSlots([]);
      }
    }).catch(() => { setSlots([]); setVacation(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date]);

  const isClosed  = vacation && vacation.closed;
  const isBlocked = isClosed || (slots !== null && slots.length === 0);
  const field     = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const slotsByShift = slots?.reduce((acc, s) => {
    if (!acc[s.shiftName]) acc[s.shiftName] = [];
    acc[s.shiftName].push(s);
    return acc;
  }, {}) || {};
  const multiShift = Object.keys(slotsByShift).length > 1;

  const goNext = () => {
    setError('');
    if (isClosed)  { setError('El restaurante está cerrado ese día'); return; }
    if (slots !== null && slots.length === 0) { setError('No hay turnos para este día'); return; }
    if (!form.time) { setError('Selecciona una hora'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.guestName.trim()) { setError('El nombre es obligatorio'); return; }
    try {
      const payload = { ...form, roomId: form.roomId || null };
      if (reservation?._id) await api.put(`/reservations/${reservation._id}`, payload);
      else                   await api.post('/reservations', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  // ── STEP INDICATOR ─────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          {s > 1 && <div className={`h-px flex-1 w-8 ${step >= s ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
          <button
            type="button"
            onClick={() => s < step && setStep(s)}
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === s
                ? 'bg-indigo-600 text-white'
                : step > s
                ? 'bg-indigo-100 text-indigo-600 cursor-pointer hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-400'
            }`}
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

  // ── STEP 1 ──────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-4">
        <StepBar />
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}

        {/* Date + people row */}
        <div className="grid grid-cols-2 gap-3">
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
                onClick={() => setForm(f => ({ ...f, people: Number(f.people) + 1 }))}
                className="w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-lg font-semibold flex items-center justify-center shrink-0 transition-colors">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Room */}
        <div>
          <label className={labelCls}>Sala <span className="text-gray-400 font-normal">(opcional)</span></label>
          <select value={form.roomId} onChange={field('roomId')} className={inputCls}>
            <option value="">Sin preferencia</option>
            {rooms.map(r => (
              <option key={r._id} value={r._id}>{r.name} (cap. {r.capacity})</option>
            ))}
          </select>
        </div>

        {/* Time slots */}
        {(slots === null || vacation === null) ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : isClosed ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-rose-500 mt-0.5 shrink-0">
              <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.75 5.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Zm0 4a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-rose-700">Restaurante cerrado</p>
              <p className="text-xs text-rose-600 mt-0.5">{vacation.reason || 'Elige otra fecha.'}</p>
            </div>
          </div>
        ) : slots.length > 0 ? (
          <div>
            <label className={labelCls}>Hora *</label>
            <div className="space-y-3">
              {Object.entries(slotsByShift).map(([shiftName, shiftSlots]) => (
                <div key={shiftName}>
                  {multiShift && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{shiftName}</p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {shiftSlots.map((slot, i) => (
                      <button key={i} type="button"
                        onClick={() => setForm(f => ({ ...f, time: slot.time }))}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-sm font-semibold transition-all ${
                          form.time === slot.time
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}>
                        {slot.time}
                        {slot.label && slot.label !== slot.time && (
                          <span className={`text-[9px] mt-0.5 leading-tight text-center ${form.time === slot.time ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {slot.label}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-500 mt-0.5 shrink-0">
              <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.026-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-700">Sin turnos para este día</p>
              <p className="text-xs text-amber-600 mt-0.5">Elige otro día o configura los turnos en Ajustes.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={goNext} disabled={isBlocked}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            Siguiente
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2 ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <StepBar />

      {/* Summary pill */}
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-indigo-400 shrink-0">
          <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
        </svg>
        <p className="text-sm font-semibold text-indigo-700">{form.date} · {form.time} · {form.people} {form.people === 1 ? 'persona' : 'personas'}</p>
        {rooms.find(r => r._id === form.roomId) && (
          <span className="text-xs text-indigo-500 ml-auto">{rooms.find(r => r._id === form.roomId)?.name}</span>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}

      {/* Guest name */}
      <div>
        <label className={labelCls}>Nombre *</label>
        <input required autoFocus value={form.guestName} onChange={field('guestName')}
          placeholder="Nombre completo" className={inputCls} />
      </div>

      {/* Phone + email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Teléfono <span className="text-gray-400 font-normal">(opc.)</span></label>
          <input value={form.guestPhone} onChange={field('guestPhone')}
            placeholder="+34 600 000 000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email <span className="text-gray-400 font-normal">(opc.)</span></label>
          <input type="email" value={form.guestEmail} onChange={field('guestEmail')}
            placeholder="email@ejemplo.com" className={inputCls} />
        </div>
      </div>

      {/* Status (edit only) */}
      {reservation && (
        <div>
          <label className={labelCls}>Estado</label>
          <select value={form.status} onChange={field('status')} className={inputCls}>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="seated">Sentada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={labelCls}>Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
        <textarea value={form.notes} onChange={field('notes')} rows={2}
          placeholder="Alergias, celebración, preferencias..."
          className={`${inputCls} resize-none`} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => { setStep(1); setError(''); }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L6.81 8l2.97 2.72a.75.75 0 1 1-1.06 1.06L5.25 8.53a.75.75 0 0 1 0-1.06l3.47-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Atrás
        </button>
        <button type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {reservation ? 'Guardar cambios' : 'Crear reserva'}
        </button>
      </div>
    </form>
  );
}
