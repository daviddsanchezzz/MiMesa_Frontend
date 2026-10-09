import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { Segmented } from '../../ui/kit';
import { DAYS, EmptyState, ErrorBanner, INTERVAL_OPTIONS, IconClock, IconEdit, IconPlus, IconTrash, IconX, colorOf, emptyShiftForm, fmtDate, inputCls, labelCls } from './shared';
import { confirmDialog } from '../../ui/confirm';

const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (t) => { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + m; };

/** What the website will say about closing: the last time a table can be booked plus how long it stays. */
function closingPreview(form, stay) {
  let last;
  if (form.slotMode === 'manual') {
    const times = form.manualSlots.map((t) => toMin(t)).filter(Number.isFinite);
    if (!times.length) return null;
    last = Math.max(...times);
  } else {
    const a = toMin(form.startTime); const b = toMin(form.endTime);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
    last = a + Math.floor((b - a) / (form.interval || 30)) * (form.interval || 30);
  }
  return { last: hhmm(last), close: stay ? hhmm(last + stay) : null };
}

export function TurnosSection() {
  const { planLimit, business } = useAuth();
  const [tab, setTab] = useState('horario');
  const stay = Number(business?.reservationDuration) || 0;
  const [shifts, setShifts] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(emptyShiftForm());
  const [error,  setError]  = useState('');

  const load = async () => { const r = await api.get('/shifts'); setShifts(r.data); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyShiftForm()); setError(''); setTab('horario'); setModal('create'); };
  const openEdit   = (s)  => {
    setForm({
      name: s.name,
      slotMode: s.subShifts.length > 0 ? 'manual' : 'auto',
      startTime: s.startTime || '12:00', endTime: s.endTime || '16:00',
      interval: s.interval || 30,
      manualSlots: s.subShifts.length > 0 ? s.subShifts.map(ss => ss.time) : [],
      days: s.days || [0,1,2,3,4,5,6],
      startDate: s.startDate || '', endDate: s.endDate || '',
      staffStartTime: s.staffStartTime || '', staffEndTime: s.staffEndTime || '',
    });
    setError(''); setTab('horario'); setModal(s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.name.trim()) { setTab('horario'); setError('Pon un nombre al turno'); return; }
    if (form.slotMode === 'auto' && (!form.startTime || !form.endTime)) { setTab('horario'); setError('Pon la hora de inicio y de fin'); return; }
    if (!form.days.length) { setTab('dias'); setError('Selecciona al menos un día'); return; }
    if ((form.startDate && !form.endDate) || (!form.startDate && form.endDate)) {
      setTab('dias'); setError('Si indicas rango de fechas, debes rellenar tanto inicio como fin'); return;
    }
    try {
      const validSlots = form.manualSlots.map(t => t.trim()).filter(Boolean);
      const subShifts  = form.slotMode === 'manual'
        ? validSlots.map(t => ({ time: t, label: '' }))
        : [];
      // For manual mode derive startTime/endTime from first/last slot for display
      const startTime = form.slotMode === 'manual' && validSlots.length
        ? validSlots[0]
        : form.startTime;
      const endTime = form.slotMode === 'manual' && validSlots.length
        ? validSlots[validSlots.length - 1]
        : form.endTime;

      if (form.slotMode === 'manual' && validSlots.length === 0) {
        setTab('horario'); setError('Añade al menos una hora en modo manual'); return;
      }

      const payload = {
        name: form.name, startTime, endTime,
        staffStartTime: form.staffStartTime || '', staffEndTime: form.staffEndTime || '',
        days: form.days, subShifts,
        startDate: form.startDate || null, endDate: form.endDate || null,
        interval: form.slotMode === 'auto' ? form.interval : 30,
      };
      if (modal === 'create') await api.post('/shifts', payload);
      else                    await api.put(`/shifts/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('¿Eliminar este turno?')) return;
    await api.delete(`/shifts/${id}`); load();
  };

  const toggleDay       = (v)    => setForm(f => ({ ...f, days: f.days.includes(v) ? f.days.filter(d => d !== v) : [...f.days, v] }));
  const addManualSlot   = ()     => setForm(f => ({ ...f, manualSlots: [...f.manualSlots, ''] }));
  const rmManualSlot    = (i)    => setForm(f => ({ ...f, manualSlots: f.manualSlots.filter((_, idx) => idx !== i) }));
  const updManualSlot   = (i, v) => setForm(f => ({ ...f, manualSlots: f.manualSlots.map((s, idx) => idx === i ? v : s) }));

  const limit        = planLimit('maxShifts');
  const activeShifts = shifts.filter(s => !s.isLocked);
  const lockedShifts = shifts.filter(s => s.isLocked);
  const atLimit      = limit !== Infinity && activeShifts.length >= limit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeShifts.length}{limit !== Infinity ? ` / ${limit}` : ''} turno{activeShifts.length !== 1 ? 's' : ''} activo{activeShifts.length !== 1 ? 's' : ''}
          {lockedShifts.length > 0 && (
            <span className="ml-1 text-amber-500">· {lockedShifts.length} bloqueado{lockedShifts.length !== 1 ? 's' : ''}</span>
          )}
        </p>
        <button onClick={openCreate} disabled={atLimit}
          title={atLimit ? `Límite de ${limit} turnos alcanzado` : undefined}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <IconPlus /> Nuevo turno
        </button>
      </div>

      {/* Upgrade banner when locked shifts exist */}
      {lockedShifts.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm-2 6V4.5a2 2 0 1 1 4 0V7H6Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 flex-1">
            <strong>{lockedShifts.length} turno{lockedShifts.length !== 1 ? 's' : ''} bloqueado{lockedShifts.length !== 1 ? 's' : ''}</strong> — tu plan actual solo permite {limit}.
            Los clientes solo verán los {limit} primeros.
          </p>
          <a href="/configuracion?tab=suscripcion" className="text-xs font-semibold text-amber-700 underline hover:no-underline shrink-0">
            Actualiza tu plan
          </a>
        </div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          text="Sin turnos configurados"
          onAction={openCreate}
          actionLabel="Crear el primer turno"
        />
      ) : (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {shifts.map((shift, idx) => {
            const clr        = colorOf(idx);
            const isSpecific = !!(shift.startDate && shift.endDate);
            const locked     = !!shift.isLocked;
            return (
              <div key={shift._id}
                className={`py-5 flex flex-col gap-3 ${locked ? 'opacity-60' : ''}`}>
                {/* Name + time range */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {locked
                      ? <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm-2 6V4.5a2 2 0 1 1 4 0V7H6Z" clipRule="evenodd" /></svg>
                      : <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`} />
                    }
                    <h3 className="font-semibold text-gray-900 truncate">{shift.name}</h3>
                    {locked && <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0">Bloqueado</span>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${locked ? 'bg-gray-100 text-gray-400' : `${clr.bg} ${clr.text}`}`}>
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>

                {(shift.staffStartTime || shift.staffEndTime) && (
                  <p className="text-xs text-gray-500">Personal: <span className="font-medium text-gray-700 tabular-nums">{shift.staffStartTime || shift.startTime} – {shift.staffEndTime || shift.endTime}</span></p>
                )}

                {/* Specific badge */}
                {isSpecific && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Específico</span>
                    <span className="opacity-70">{fmtDate(shift.startDate)} – {fmtDate(shift.endDate)}</span>
                  </div>
                )}

                {/* Day pills */}
                <div className="flex gap-1">
                  {DAYS.map(d => (
                    <span key={d.value} title={d.full}
                      className={`w-6 h-6 rounded-md text-[9px] flex items-center justify-center font-bold ${
                        shift.days?.includes(d.value)
                          ? locked ? 'bg-gray-200 text-gray-400' : `${clr.bg} ${clr.text}`
                          : 'bg-gray-100 text-gray-300'
                      }`}>
                      {d.label}
                    </span>
                  ))}
                </div>

                {/* Sub-shifts */}
                {shift.subShifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shift.subShifts.map((ss, i) => (
                      <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${locked ? 'bg-gray-100 border-gray-200 text-gray-400' : `${clr.bg} ${clr.border} ${clr.text}`}`}>
                        <IconClock /> {ss.time}
                        {ss.label && <span className="opacity-60">· {ss.label}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Franjas cada {shift.interval || 30} min automáticas</p>
                )}

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  {!locked && (
                    <button onClick={() => openEdit(shift)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-violet-50 hover:text-violet-600 text-gray-500 font-medium transition-colors">
                      <IconEdit /> Editar
                    </button>
                  )}
                  <button onClick={() => handleDelete(shift._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors">
                    <IconTrash /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (() => {
        const preview = closingPreview(form, stay);
        const footer = (
          <div className="flex gap-3">
            <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
            <button type="submit" form="turno-form" className="flex-[2] bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {modal === 'create' ? 'Crear turno' : 'Guardar cambios'}
            </button>
          </div>
        );
        return (
          <Modal
            size="wide"
            title={modal === 'create' ? 'Nuevo turno' : 'Editar turno'}
            subtitle={modal !== 'create' ? modal.name : 'Configura el horario y los días del turno'}
            footer={footer}
            onClose={() => setModal(null)}
          >
            <ErrorBanner msg={error} />
            <form id="turno-form" noValidate onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.name} autoFocus={modal === 'create'}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Mediodía, Noche, Brunch..."
                  className={inputCls} />
              </div>

              <Segmented full value={tab} onChange={setTab} options={[['horario', 'Horario'], ['dias', 'Días y fechas'], ['personal', 'Personal']]} />

              {tab === 'horario' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Franjas de reserva *</label>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 mb-4 sm:max-w-sm">
                      {[{ key: 'auto', label: 'Rango automático' }, { key: 'manual', label: 'Horas manuales' }].map(m => (
                        <button key={m.key} type="button"
                          onClick={() => setForm(f => ({ ...f, slotMode: m.key }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                            form.slotMode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}>
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {form.slotMode === 'auto' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:max-w-md">
                          <label className="block">
                            <span className="block text-xs text-gray-500 mb-1">Primera reserva</span>
                            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={`${inputCls} w-full`} />
                          </label>
                          <span className="text-gray-400 text-sm font-medium pt-5">hasta</span>
                          <label className="block">
                            <span className="block text-xs text-gray-500 mb-1">Última reserva</span>
                            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className={`${inputCls} w-full`} />
                          </label>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Una franja cada</span>
                          <div className="flex gap-2 sm:max-w-md">
                            {INTERVAL_OPTIONS.map(opt => (
                              <button key={opt.value} type="button"
                                onClick={() => setForm(f => ({ ...f, interval: opt.value }))}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                  form.interval === opt.value
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600'
                                }`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {form.manualSlots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <input type="time" value={slot} onChange={e => updManualSlot(i, e.target.value)} className={`${inputCls} flex-1 min-w-0`} />
                              <button type="button" onClick={() => rmManualSlot(i)} aria-label="Quitar hora"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition-colors shrink-0">
                                <IconX />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={addManualSlot}
                          className="w-full sm:w-auto sm:px-6 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-colors">
                          <IconPlus /> Añadir hora
                        </button>
                      </div>
                    )}
                  </div>

                  {preview && (
                    <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-900">
                      Última reserva a las <b>{preview.last}</b>
                      {preview.close
                        ? <> · con mesas de {stay} min, <b>tu web dirá que cerráis a las {preview.close}</b>.</>
                        : <> · pon cuánto tiempo puede estar una mesa en Reservas y tu web dirá a qué hora cerráis.</>}
                    </div>
                  )}
                </div>
              )}

              {tab === 'dias' && (
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Días activos *</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(d => (
                        <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full}
                          className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                            form.days.includes(d.value)
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Solo entre estas fechas
                      <span className="text-gray-400 font-normal ml-1 text-xs">(opcional — vacío = turno de todo el año)</span>
                    </label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:max-w-md">
                      <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={`${inputCls} w-full min-w-0`} />
                      <span className="text-gray-400 text-sm font-medium">hasta</span>
                      <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={`${inputCls} w-full min-w-0`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Un turno con fechas tiene prioridad sobre el turno general con el mismo nombre en ese período (horario de verano, menú de Navidad…).</p>
                  </div>
                </div>
              )}

              {tab === 'personal' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Opcional. Si el personal llega antes de abrir o se va después de cerrar, indícalo: verán su horario real y sus horas se cuentan bien. Vacío = el mismo horario que el de los clientes.</p>
                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    <label className="block">
                      <span className="block text-xs text-gray-500 mb-1">Llegan</span>
                      <input type="time" value={form.staffStartTime} onChange={e => setForm(f => ({ ...f, staffStartTime: e.target.value }))} className={`${inputCls} w-full`} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 mb-1">Se van</span>
                      <input type="time" value={form.staffEndTime} onChange={e => setForm(f => ({ ...f, staffEndTime: e.target.value }))} className={`${inputCls} w-full`} />
                    </label>
                  </div>
                  {(form.staffStartTime || form.staffEndTime) && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, staffStartTime: '', staffEndTime: '' }))} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Quitar horario del personal</button>
                  )}
                </div>
              )}
            </form>
          </Modal>
        );
      })()}
    </div>
  );
}
