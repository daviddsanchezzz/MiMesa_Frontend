import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CheckoutModal from './CheckoutModal';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { STATUS, btnPrimary, btnSecondary, euros, inputCls, labelCls, timeInTz, payMethodLabel } from './utils';

// Next steps offered for each status (mirrors the backend transitions).
const ACTIONS = {
  pending:    [['confirmed', 'Confirmar'], ['cancelled', 'Rechazar']],
  confirmed:  [['checked_in', 'Ha llegado'], ['completed', 'Completada sin cobrar'], ['no_show', 'No vino'], ['cancelled', 'Cancelar']],
  checked_in: [['completed', 'Completada sin cobrar'], ['cancelled', 'Cancelar']],
  no_show:    [['confirmed', 'Volver a confirmar']],
  completed:  [],
  cancelled:  [],
};

const SOURCE = { online: 'Online', phone: 'Teléfono', walk_in: 'Sin cita', staff: 'Equipo' };

export default function BookingDetailModal({ booking, staffById, tz, onClose, onChanged }) {
  const [notes, setNotes] = useState(booking.notes || '');
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [charging, setCharging] = useState(false);
  const { hasRole } = useAuth();
  const canCharge = !booking.payment && ['confirmed', 'checked_in', 'completed'].includes(booking.status);
  const st = STATUS[booking.status] || STATUS.confirmed;
  const notesChanged = notes !== (booking.notes || '') || internalNotes !== (booking.internalNotes || '');

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      onChanged?.(await fn());
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status) => {
    if (status === 'cancelled' && !window.confirm('¿Cancelar esta cita? El hueco quedará libre.')) return;
    run(() => bookingsApi.setStatus(booking._id, status));
  };

  return (
    <Modal title={booking.guestName} subtitle={`${timeInTz(booking.start, tz)} – ${timeInTz(booking.end, tz)}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
          <span className="text-xs text-gray-400">{SOURCE[booking.source] || booking.source}</span>
          {booking.partySize > 1 && <span className="text-xs text-gray-500">{booking.partySize} personas</span>}
        </div>

        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {booking.segments.map((seg) => (
            <li key={seg._id} className="px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{seg.serviceName}</p>
                <p className="text-xs text-gray-500">
                  {timeInTz(seg.start, tz)} – {timeInTz(seg.end, tz)}
                  {(seg.resourceIds || []).length > 0 && ` · ${seg.resourceIds.map((id) => staffById[id]?.name || '—').join(', ')}`}
                </p>
              </div>
              <span className="text-sm text-gray-700 tabular-nums shrink-0">{euros(seg.price)}</span>
            </li>
          ))}
          <li className="px-3 py-2.5 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">{euros(booking.totalPrice)}</span>
          </li>
        </ul>

        {(booking.guestPhone || booking.guestEmail) && (
          <div className="text-sm text-gray-700 space-y-1">
            {booking.guestPhone && <p><a className="text-violet-600 hover:underline" href={`tel:${booking.guestPhone}`}>{booking.guestPhone}</a></p>}
            {booking.guestEmail && <p><a className="text-violet-600 hover:underline" href={`mailto:${booking.guestEmail}`}>{booking.guestEmail}</a></p>}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Notas del cliente</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </div>
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea className={inputCls} rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} maxLength={2000} />
          </div>
          {notesChanged && (
            <button type="button" className={btnSecondary} disabled={busy}
              onClick={() => run(() => bookingsApi.setNotes(booking._id, { notes, internalNotes }))}>
              Guardar notas
            </button>
          )}
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        {booking.payment && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Cobrada · {euros(booking.payment.total + (booking.payment.tip || 0))}</p>
              <p className="text-xs text-emerald-800">
                {payMethodLabel(booking.payment.method)} · {timeInTz(booking.payment.paidAt, tz)}
                {booking.payment.tip > 0 && ` · propina ${euros(booking.payment.tip)}`}
                {booking.payment.discount > 0 && ` · descuento ${euros(booking.payment.discount)}`}
              </p>
            </div>
            {hasRole('manager') && (
              <button type="button" disabled={busy} className="text-xs font-semibold text-emerald-800 hover:text-rose-700"
                onClick={() => { if (window.confirm('¿Deshacer el cobro?')) run(() => bookingsApi.undoCheckout(booking._id)); }}>
                Deshacer
              </button>
            )}
          </div>
        )}

        {(canCharge || (ACTIONS[booking.status] || []).length > 0) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {canCharge && (
              <button type="button" disabled={busy} onClick={() => setCharging(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                Cobrar {euros(booking.totalPrice)}
              </button>
            )}
            {(ACTIONS[booking.status] || []).map(([status, label], i) => (
              <button key={status} type="button" disabled={busy} onClick={() => changeStatus(status)}
                className={i === 0 && !canCharge ? btnPrimary : status === 'cancelled' ? `${btnSecondary} text-rose-600 border-rose-200 hover:bg-rose-50` : btnSecondary}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {charging && (
        <CheckoutModal booking={booking} tz={tz} onClose={() => setCharging(false)}
          onPaid={(updated) => { setCharging(false); onChanged?.(updated); }} />
      )}
    </Modal>
  );
}
