import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import ReservationForm from '../../components/ReservationForm';
import { TableCell } from '../../components/ReservationCard';
import { StatusText } from '../../ui/kit';
import Icon from '../../ui/Icon';
import { reservationTone } from '../../lib/status';
import { dayLabel } from '../../lib/dates';
import { waLink } from '../agenda/utils';
import { tablesOf } from './useRestaurantDay';

const contactBtn = 'inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50';
const bigBtn = 'w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-[15px] font-semibold transition-colors disabled:opacity-50';
const linkBtn = 'text-sm font-medium text-gray-600 hover:text-gray-900 py-1.5';

function Fact({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right min-w-0">{children}</span>
    </div>
  );
}

function payText(p) {
  if (!p || p.mode === 'none') return null;
  const amount = p.amount ? `${Math.round(p.amount / 100)} €` : '';
  if (p.mode === 'deposit') return p.status === 'refunded' ? `Señal devuelta ${amount}` : p.status === 'captured' ? `Señal cobrada ${amount}` : 'Señal sin pagar';
  if (p.mode === 'card_guarantee') return p.status === 'captured' ? 'No-show cobrado' : p.stripePaymentMethodId ? 'Tarjeta en garantía' : 'Sin tarjeta';
  return null;
}

/**
 * The reservation card that slides up: who (call, WhatsApp), when, how many,
 * which table, and the one thing to do now in big; the rest as links.
 * Same layout as the appointment card in citas.
 */
export default function ReservationSheet({ reservation: r, tables, actions, isManager, today, onClose }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const tone = reservationTone(r);
  const wa = waLink(r.guestPhone);
  const pay = payText(r.payment);
  const visits = r.customerId?.visits;
  const noShows = r.customerId?.noShowCount;

  const act = async (fn, close = true) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok && close) onClose();
  };

  let main = null;
  if (r.status === 'pending' && isManager) {
    main = <button type="button" disabled={busy} onClick={() => act(() => actions.accept(r))} className={`${bigBtn} bg-violet-600 text-white hover:bg-violet-700`}>Aceptar reserva</button>;
  } else if (r.status === 'confirmed') {
    main = <button type="button" disabled={busy} onClick={() => act(() => actions.seat(r))} className={`${bigBtn} bg-emerald-600 text-white hover:bg-emerald-700`}><Icon name="check" className="w-5 h-5" strokeWidth={2} />Sentar ahora</button>;
  }

  const links = [
    { key: 'edit', label: 'Cambiar día, hora o personas', onClick: () => setEditing(true) },
    r.status === 'pending' && isManager && { key: 'reject', label: 'Rechazar', onClick: () => act(() => actions.reject(r)), danger: true },
    isManager && ['confirmed', 'seated'].includes(r.status) && { key: 'noshow', label: 'No vino', onClick: () => act(() => actions.noShow(r)) },
    isManager && r.payment?.mode === 'deposit' && r.payment?.status === 'captured' && { key: 'refund', label: 'Devolver la señal', onClick: () => act(() => actions.refund(r), false) },
    !['cancelled', 'no_show'].includes(r.status) && r.status !== 'pending' && { key: 'cancel', label: 'Cancelar reserva', onClick: () => act(() => actions.cancel(r)), danger: true },
    { key: 'delete', label: 'Eliminar', onClick: () => act(() => actions.remove(r)), danger: true },
  ].filter(Boolean);

  const header = (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{dayLabel(r.date, today)} · {r.time}</p>
      <h3 className="text-lg font-semibold text-gray-900 truncate">{r.guestName}</h3>
      <StatusText tone={tone} sector="restaurant" className="mt-0.5" />
    </div>
  );

  if (editing) {
    return (
      <Modal title="Editar reserva" onClose={() => setEditing(false)} size="md">
        <ReservationForm reservation={r} onSave={async () => { setEditing(false); await actions.reload?.(); onClose(); }} onCancel={() => setEditing(false)} />
      </Modal>
    );
  }

  return (
    <Modal header={header} onClose={onClose} size="md"
      footer={main || links.length ? (
        <div className="space-y-2">
          {main}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {links.map((l) => (
              <button key={l.key} type="button" disabled={busy} onClick={l.onClick} className={`${linkBtn} ${l.danger ? 'text-rose-600 hover:text-rose-700' : ''}`}>{l.label}</button>
            ))}
          </div>
        </div>
      ) : null}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums text-gray-900">{r.people}</span>
            <span className="text-sm text-gray-500">{r.people === 1 ? 'persona' : 'personas'}</span>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="min-w-0">
            <p className="text-2xl font-semibold tabular-nums text-gray-900 leading-tight">{r.time}</p>
            <p className="text-xs text-gray-500">{dayLabel(r.date, today)}</p>
          </div>
        </div>

        {(r.guestPhone || r.guestEmail) && (
          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {r.guestPhone && <a href={`tel:${r.guestPhone.replace(/\s/g, '')}`} className={contactBtn}><Icon name="phone" className="w-4 h-4" /> Llamar</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={`${contactBtn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}><Icon name="chat" className="w-4 h-4" /> WhatsApp</a>}
            {r.guestEmail && <a href={`mailto:${r.guestEmail}`} title={r.guestEmail} className={contactBtn}>Email</a>}
          </div>
        )}

        <div className="divide-y divide-gray-100 border-y border-gray-100">
          <Fact label="Mesa">
            <span className="inline-flex justify-end">
              <TableCell reservation={r} tables={tables} onAssign={(_, ids) => actions.assign(r, ids)} />
            </span>
          </Fact>
          {(r.roomId?.name || tablesOf(r)[0]?.roomId?.name) && <Fact label="Sala">{r.roomId?.name || tablesOf(r)[0]?.roomId?.name}</Fact>}
          {r.guestPhone && <Fact label="Teléfono"><span className="tabular-nums">{r.guestPhone}</span></Fact>}
          {pay && <Fact label="Pago">{pay}</Fact>}
          {r.thefork && <Fact label="Origen">TheFork</Fact>}
          {r.pendingReason === 'large_group' && r.status === 'pending' && <Fact label="Por qué espera">Grupo grande</Fact>}
          {r.pendingReason === 'slot_capacity' && r.status === 'pending' && <Fact label="Por qué espera">Franja llena</Fact>}
          {visits > 0 && (
            <Fact label="Cliente">
              {r.customerId?._id ? <Link to={`/customers/${r.customerId._id}`} className="text-violet-700 hover:underline">{visits === 1 ? '1 visita' : `${visits} visitas`}{noShows ? ` · ${noShows} no vino` : ''}</Link>
                : `${visits} visitas`}
            </Fact>
          )}
        </div>

        {r.notes && (
          <div className="rounded-xl bg-amber-50/70 px-3.5 py-3">
            <p className="text-xs font-semibold text-amber-900 mb-0.5">Notas</p>
            <p className="text-sm text-amber-950 whitespace-pre-wrap">{r.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
