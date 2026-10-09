import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import StaffAvatar from './StaffAvatar';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, btnSecondary, inputCls, labelCls, timeInTz, dateInTz, longDate, absenceText } from './utils';
import { confirmDialog } from '../../ui/confirm';

/**
 * Block time for a professional (holidays, doctor, leaving early…).
 * Staff can only block themselves; managers anyone. If there are appointments
 * in that time the backend refuses and lists them: each one can be passed to
 * someone free right here, then the absence can be saved.
 */
export default function AbsenceModal({ staff, me, isManager, date, tz, colors, onClose, onSaved, onChanged }) {
  const choices = isManager ? staff : staff.filter((s) => s._id === me?._id);
  const [form, setForm] = useState({
    resourceId: (me && choices.some((s) => s._id === me._id) ? me._id : choices[0]?._id) || '',
    allDay: true, fromDate: date, toDate: date, startTime: '10:00', endTime: '12:00', reason: '',
  });
  const [conflicts, setConflicts] = useState(null);   // [{ booking, options: null | [] }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setConflicts(null); setError(''); };

  const person = staff.find((s) => s._id === form.resourceId);

  async function save(e) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await bookingsApi.createAbsence({
        resourceId: form.resourceId,
        allDay: form.allDay,
        fromDate: form.fromDate,
        toDate: form.allDay ? form.toDate : form.fromDate,
        ...(form.allDay ? {} : { startTime: form.startTime, endTime: form.endTime }),
        reason: form.reason,
      });
      onSaved?.(saved);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'HAS_BOOKINGS') {
        setConflicts(data.bookings.map((b) => ({ booking: b, options: null })));
      } else {
        setError(apiError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  // Who could take each conflicting appointment
  useEffect(() => {
    if (!conflicts || conflicts.every((c) => c.options)) return;
    let cancelled = false;
    Promise.all(conflicts.map((c) => (c.options ? c.options
      : bookingsApi.reassignOptions(c.booking._id, form.resourceId).catch(() => []))))
      .then((opts) => { if (!cancelled) setConflicts((prev) => prev && prev.map((c, i) => ({ ...c, options: opts[i] }))); });
    return () => { cancelled = true; };
  }, [conflicts, form.resourceId]);

  async function passTo(bookingId, toId) {
    setBusy(true);
    setError('');
    try {
      await bookingsApi.reassign(bookingId, form.resourceId, toId);
      onChanged?.();
      setConflicts((prev) => {
        const left = prev.filter((c) => c.booking._id !== bookingId).map((c) => ({ ...c, options: null }));
        return left;
      });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(bookingId) {
    if (!await confirmDialog('¿Cancelar esta cita? Si tiene email, al cliente le llegará el aviso de cancelación.')) return;
    setBusy(true);
    setError('');
    try {
      await bookingsApi.setStatus(bookingId, 'cancelled');
      onChanged?.();
      setConflicts((prev) => prev.filter((c) => c.booking._id !== bookingId));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const blocked = conflicts && conflicts.length > 0;
  const cleared = conflicts && conflicts.length === 0;

  const footer = (
    <div className="flex gap-2">
      <button type="submit" form="absence-form" className={`${btnPrimary} flex-1`} disabled={busy || blocked || !form.resourceId}>
        {busy ? 'Guardando…' : cleared ? 'Bloquear ahora' : 'Bloquear'}
      </button>
      <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
    </div>
  );

  return (
    <Modal title="Ausencia" subtitle="Ese tiempo deja de estar disponible para dar citas." onClose={onClose} size="md" footer={footer}>
      <form id="absence-form" onSubmit={save} className="space-y-4">
        {choices.length > 1 ? (
          <div>
            <label className={labelCls}>Quién</label>
            <div className="flex flex-wrap gap-1.5">
              {choices.map((s) => (
                <button key={s._id} type="button" onClick={() => set({ resourceId: s._id })}
                  className={`inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-sm font-medium border ${
                    form.resourceId === s._id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                  <StaffAvatar name={s.name} photo={s.photo} color={colors[s._id]} size={22} />{s.name}
                </button>
              ))}
            </div>
          </div>
        ) : person && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={26} />
            <span className="font-semibold">{person.name}</span>
          </div>
        )}

        <div className="inline-flex p-1 rounded-xl bg-gray-100" role="tablist">
          {[[true, 'Días completos'], [false, 'Unas horas']].map(([v, label]) => (
            <button key={label} type="button" role="tab" aria-selected={form.allDay === v} onClick={() => set({ allDay: v })}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${form.allDay === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {form.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Desde</label>
              <input type="date" className={inputCls} value={form.fromDate} required
                onChange={(e) => set({ fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })} />
            </div>
            <div>
              <label className={labelCls}>Hasta (incluido)</label>
              <input type="date" className={inputCls} value={form.toDate} min={form.fromDate} required onChange={(e) => set({ toDate: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Día</label>
              <input type="date" className={inputCls} value={form.fromDate} required onChange={(e) => set({ fromDate: e.target.value, toDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>De</label>
              <input type="time" step={300} className={inputCls} value={form.startTime} required onChange={(e) => set({ startTime: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>A</label>
              <input type="time" step={300} className={inputCls} value={form.endTime} required onChange={(e) => set({ endTime: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Motivo <span className="text-gray-400 font-normal">(opcional · solo lo ven los encargados y la persona)</span></label>
          <input className={inputCls} value={form.reason} maxLength={200} placeholder="Vacaciones, médico, formación…" onChange={(e) => set({ reason: e.target.value })} />
        </div>

        {conflicts && (
          <div className={`rounded-xl border px-3.5 py-3 space-y-3 ${blocked ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            {blocked ? (
              <>
                <p className="text-sm font-semibold text-amber-900">
                  Antes hay que pasar {conflicts.length === 1 ? 'esta cita' : `estas ${conflicts.length} citas`} a otra persona
                </p>
                <ul className="space-y-2.5">
                  {conflicts.map(({ booking: b, options }) => (
                    <li key={b._id} className="bg-white rounded-lg border border-amber-100 px-3 py-2.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {dateInTz(b.start, tz) !== form.fromDate || !form.allDay || form.fromDate !== form.toDate ? `${longDate(dateInTz(b.start, tz))} · ` : ''}
                        {timeInTz(b.start, tz)} · {b.guestName}
                      </p>
                      <p className="text-xs text-gray-500">{b.services}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {options === null && <span className="text-xs text-gray-400">Buscando quién está libre…</span>}
                        {options && options.length > 0 && <span className="text-xs text-gray-500 mr-1">Pasar a:</span>}
                        {options && options.map((o) => (
                          <button key={o._id} type="button" disabled={busy} onClick={() => passTo(b._id, o._id)}
                            className="inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-800 hover:border-violet-300 hover:bg-violet-50">
                            <StaffAvatar name={o.name} color={colors[o._id]} size={18} />{o.name}
                          </button>
                        ))}
                        {options && options.length === 0 && (
                          <span className="text-xs text-amber-900">Nadie más está libre a esa hora.</span>
                        )}
                        <button type="button" disabled={busy} onClick={() => cancelBooking(b._id)}
                          className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 py-1">
                          Cancelar cita
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm font-semibold text-emerald-900">Listo: ya no hay citas en ese tiempo. Ya puedes bloquearlo.</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
        )}
      </form>
    </Modal>
  );
}

/** Tap on an absence: what it is and, if allowed, remove it. */
export function AbsenceDetailModal({ absence, person, canRemove, onClose, onRemoved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const range = absence.allDay && absence.fromDate !== absence.toDate
    ? `Del ${longDate(absence.fromDate)} al ${longDate(absence.toDate)}`
    : `${longDate(absence.fromDate)} · ${absence.allDay ? 'todo el día' : absenceText(absence)}`;

  async function remove() {
    if (!await confirmDialog('¿Quitar esta ausencia? Ese tiempo volverá a estar disponible para citas.')) return;
    setBusy(true);
    try {
      await bookingsApi.deleteAbsence(absence._id);
      onRemoved?.();
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={`${person?.name || 'Profesional'} · ausente`} onClose={onClose} size="sm"
      footer={canRemove ? (
        <button type="button" className={`${btnSecondary} w-full text-rose-600 border-rose-200 hover:bg-rose-50`} disabled={busy} onClick={remove}>
          Quitar ausencia
        </button>
      ) : null}>
      <div className="space-y-2 text-sm text-gray-700">
        <p>{range}</p>
        {absence.reason && <p className="text-gray-500">Motivo: {absence.reason}</p>}
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}
