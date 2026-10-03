import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CheckoutModal from './CheckoutModal';
import RescheduleModal from './RescheduleModal';
import Modal from '../../components/Modal';
import StaffAvatar from './StaffAvatar';
import { StatusText } from '../../ui/kit';
import { bookingTone } from '../../lib/status';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import {
  DEFAULT_TZ, btnPrimary, btnSecondary, euros, inputCls, timeInTz, dateInTz, addDays, payMethodLabel, waLink,
} from './utils';

// What each status offers (mirrors the backend transitions):
// main = big buttons, more = small text links under them.
const ACTIONS = {
  pending:    { main: [['confirmed', 'Confirmar']], more: [['cancelled', 'Rechazar']] },
  confirmed:  { main: [['checked_in', 'Ha llegado'], ['no_show', 'No vino']], more: [['completed', 'Completada sin cobrar'], ['cancelled', 'Cancelar cita']] },
  checked_in: { main: [], more: [['completed', 'Completada sin cobrar'], ['cancelled', 'Cancelar cita']] },
  no_show:    { main: [['confirmed', 'Volver a confirmar']], more: [] },
  completed:  { main: [], more: [] },
  cancelled:  { main: [], more: [] },
};

const bigBtn = 'w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-[15px] font-semibold transition-colors disabled:opacity-50';
const contactBtn = 'inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50';

const SOURCE = { online: 'Reservada online', phone: 'Reservada por teléfono', walk_in: 'Sin cita previa', staff: 'Creada por el equipo' };

function dayText(iso, tz) {
  const d = dateInTz(iso, tz);
  const today = dateInTz(new Date().toISOString(), tz);
  if (d === today) return 'Hoy';
  if (d === addDays(today, 1)) return 'Mañana';
  if (d === addDays(today, -1)) return 'Ayer';
  const text = new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const Icon = {
  phone: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.15a1.5 1.5 0 0 1 1.46 1.14l.57 2.3a1.5 1.5 0 0 1-.6 1.6l-.9.6a10.5 10.5 0 0 0 5.18 5.18l.6-.9a1.5 1.5 0 0 1 1.6-.6l2.3.57A1.5 1.5 0 0 1 18 13.35v1.15A1.5 1.5 0 0 1 16.5 16h-1A13.5 13.5 0 0 1 2 4.5v-1Z" /></svg>,
  wa: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg>,
  mail: <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path d="M3 4a2 2 0 0 0-2 2v.4l9 5 9-5V6a2 2 0 0 0-2-2H3Zm16 4.7-8.5 4.7a1 1 0 0 1-1 0L1 8.7V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.7Z" /></svg>,
};

export default function BookingDetailModal({ booking, staffById, services = [], staff = [], colors = {}, tz = DEFAULT_TZ, onClose, onChanged }) {
  const [notes, setNotes] = useState(booking.notes || '');
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [charging, setCharging] = useState(false);
  const [moving, setMoving] = useState(false);
  const canMove = !booking.payment && ['pending', 'confirmed', 'checked_in'].includes(booking.status);
  const { hasRole } = useAuth();
  const canCharge = !booking.payment && ['confirmed', 'checked_in', 'completed'].includes(booking.status);
  const actions = ACTIONS[booking.status] || { main: [], more: [] };
  const notesChanged = notes !== (booking.notes || '') || internalNotes !== (booking.internalNotes || '');
  const showTotal = booking.segments.length > 1;
  const wa = waLink(booking.guestPhone);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      onChanged?.(await fn());
      return true;
    } catch (err) {
      setError(apiError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status) => {
    if (status === 'cancelled' && !window.confirm('¿Cancelar esta cita? El hueco quedará libre.')) return;
    run(() => bookingsApi.setStatus(booking._id, status));
  };

  const saveNotes = async () => {
    if (await run(() => bookingsApi.setNotes(booking._id, { notes, internalNotes }))) setEditingNotes(false);
  };

  const header = (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{dayText(booking.start, tz)} · {timeInTz(booking.start, tz)} – {timeInTz(booking.end, tz)}</p>
      <h3 className="text-lg font-semibold text-gray-900 truncate">{booking.guestName}</h3>
      <StatusText tone={bookingTone(booking)} className="mt-0.5" />
    </div>
  );

  const hasFooter = canCharge || canMove || actions.main.length > 0 || actions.more.length > 0;
  const footer = hasFooter ? (
    <div className="space-y-2">
      {canCharge && (
        <button type="button" disabled={busy} onClick={() => setCharging(true)}
          className={`${bigBtn} bg-gray-900 text-white hover:bg-black`}>
          Cobrar {euros(booking.totalPrice)}
        </button>
      )}
      {actions.main.length > 0 && (
        <div className={`grid gap-2 ${actions.main.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {actions.main.map(([status, label], i) => (
            <button key={status} type="button" disabled={busy} onClick={() => changeStatus(status)}
              className={`${bigBtn} ${status === 'checked_in' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : i === 0 && !canCharge ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-gray-200 text-gray-800 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {(actions.more.length > 0 || canMove) && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pt-1">
          {canMove && (
            <button type="button" disabled={busy} onClick={() => setMoving(true)}
              className="text-sm font-semibold py-1 text-violet-700 hover:text-violet-900">
              Cambiar día u hora
            </button>
          )}
          {actions.more.map(([status, label]) => (
            <button key={status} type="button" disabled={busy} onClick={() => changeStatus(status)}
              className={`text-sm font-medium py-1 ${status === 'cancelled' ? 'text-rose-600 hover:text-rose-700' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <Modal header={header} footer={footer} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* What and who */}
        <ul className="divide-y divide-gray-100 border-y border-gray-100">
          {booking.segments.map((seg) => {
            const people = (seg.resourceIds || []).map((id) => staffById[id]).filter((r) => r && r.kind === 'staff');
            const person = people[0];
            return (
              <li key={seg._id} className="py-3 flex items-center gap-3">
                {person
                  ? <StaffAvatar name={person.name} photo={person.photo} color={colors[person._id]} size={32} />
                  : <span className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{seg.serviceName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {people.length ? people.map((p) => p.name).join(', ') : 'Sin asignar'}
                    {showTotal && ` · ${timeInTz(seg.start, tz)}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{euros(seg.price)}</span>
              </li>
            );
          })}
          {showTotal && (
            <li className="py-2.5 flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-900 tabular-nums">{euros(booking.totalPrice)}</span>
            </li>
          )}
        </ul>

        {/* Contact: one row of equal buttons */}
        {(booking.guestPhone || booking.guestEmail) && (
          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {booking.guestPhone && (
              <a href={`tel:${booking.guestPhone.replace(/\s/g, '')}`} className={contactBtn}>{Icon.phone} Llamar</a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={`${contactBtn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>{Icon.wa} WhatsApp</a>
            )}
            {booking.guestEmail && (
              <a href={`mailto:${booking.guestEmail}`} title={booking.guestEmail} className={contactBtn}>{Icon.mail} Email</a>
            )}
          </div>
        )}

        {booking.rescheduledAt && booking.previousStart && (
          <p className="text-xs text-gray-500">
            Cambiada · antes era {dayText(booking.previousStart, tz).toLowerCase()} a las {timeInTz(booking.previousStart, tz)}
          </p>
        )}
        <p className="text-xs text-gray-400 flex flex-wrap gap-x-2">
          {booking.guestPhone && <span className="text-gray-500">{booking.guestPhone} ·</span>}
          <span>{SOURCE[booking.source] || booking.source}</span>
          {booking.partySize > 1 && <span>· {booking.partySize} personas</span>}
          {booking.customerId && (
            <Link to={`/customers/${booking.customerId}`} className="text-violet-600 font-medium hover:underline">· Ver ficha del cliente</Link>
          )}
        </p>

        {/* Notes: shown only when there are some, editable on demand */}
        {editingNotes ? (
          <div className="space-y-3 rounded-xl bg-gray-50 p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota del cliente</label>
              <textarea className={`${inputCls} bg-white`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota interna <span className="text-gray-400 font-normal">(solo la ve el equipo)</span></label>
              <textarea className={`${inputCls} bg-white`} rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} maxLength={2000} autoFocus />
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} disabled={busy || !notesChanged} onClick={saveNotes}>Guardar</button>
              <button type="button" className={btnSecondary} disabled={busy}
                onClick={() => { setNotes(booking.notes || ''); setInternalNotes(booking.internalNotes || ''); setEditingNotes(false); }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (booking.notes || booking.internalNotes) ? (
          <button type="button" onClick={() => setEditingNotes(true)}
            className="w-full text-left rounded-xl bg-amber-50/70 border border-amber-100 px-3.5 py-3 space-y-1.5 hover:bg-amber-50">
            {booking.notes && <p className="text-sm text-gray-800"><span className="font-semibold">Cliente:</span> {booking.notes}</p>}
            {booking.internalNotes && <p className="text-sm text-gray-800"><span className="font-semibold">Interna:</span> {booking.internalNotes}</p>}
            <p className="text-xs font-medium text-amber-800">Editar notas</p>
          </button>
        ) : (
          <button type="button" onClick={() => setEditingNotes(true)} className="text-sm font-medium text-violet-700 hover:text-violet-800">
            + Añadir una nota
          </button>
        )}

        {booking.payment && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">✓ Cobrada · {euros(booking.payment.total + (booking.payment.tip || 0))}</p>
              <p className="text-xs text-blue-800">
                {payMethodLabel(booking.payment.method)} · {timeInTz(booking.payment.paidAt, tz)}
                {booking.payment.tip > 0 && ` · propina ${euros(booking.payment.tip)}`}
                {booking.payment.discount > 0 && ` · descuento ${euros(booking.payment.discount)}`}
              </p>
            </div>
            {hasRole('manager') && (
              <button type="button" disabled={busy} className="text-xs font-semibold text-blue-800 hover:text-rose-700"
                onClick={() => { if (window.confirm('¿Deshacer el cobro?')) run(() => bookingsApi.undoCheckout(booking._id)); }}>
                Deshacer
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      </div>
      {moving && (
        <RescheduleModal booking={booking} services={services} staff={staff} tz={tz} onClose={() => setMoving(false)}
          onMoved={(updated) => { setMoving(false); onChanged?.(updated); }} />
      )}
      {charging && (
        <CheckoutModal booking={booking} tz={tz} onClose={() => setCharging(false)}
          onPaid={(updated) => { setCharging(false); onChanged?.(updated); }} />
      )}
    </Modal>
  );
}
