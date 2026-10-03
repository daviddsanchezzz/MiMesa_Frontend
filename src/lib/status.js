/**
 * One colour per state for the whole app, the same in citas and restaurante:
 * a confirmed appointment and a confirmed reservation look the same, someone
 * who has arrived is green whether they sit at a table or in a chair.
 *
 *   pending    ámbar, discontinuo  · por confirmar
 *   confirmed  violeta             · confirmada
 *   here       verde               · ha llegado / sentada
 *   unpaid     naranja             · atendida sin cobrar (solo citas)
 *   done       azul suave          · cobrada / terminada
 *   lost       rojo                · no vino
 *   cancelled  gris claro, tachado · cancelada
 */
export const TONES = {
  pending:   { color: '#f59e0b', soft: '#fef3c7', ink: '#92400e', dashed: true },
  confirmed: { color: '#8b5cf6', soft: '#ede9fe', ink: '#5b21b6' },
  here:      { color: '#10b981', soft: '#d1fae5', ink: '#065f46' },
  unpaid:    { color: '#f97316', soft: '#ffedd5', ink: '#9a3412' },
  done:      { color: '#60a5fa', soft: '#eff6ff', ink: '#1d4ed8' },
  lost:      { color: '#f43f5e', soft: '#ffe4e6', ink: '#9f1239' },
  cancelled: { color: '#d1d5db', soft: '#f3f4f6', ink: '#9ca3af' },
};

const LABELS = {
  appointments: {
    pending: 'Por confirmar', confirmed: 'Confirmada', here: 'Ha llegado', unpaid: 'Sin cobrar',
    done: 'Cobrada', lost: 'No vino', cancelled: 'Cancelada',
  },
  restaurant: {
    pending: 'Por confirmar', confirmed: 'Confirmada', here: 'Sentada', unpaid: 'Sin cobrar',
    done: 'Terminada', lost: 'No vino', cancelled: 'Cancelada',
  },
};

export const toneLabel = (tone, sector = 'appointments') => LABELS[sector]?.[tone] || LABELS.appointments[tone] || '';

/** State of an appointment (bookings module). */
export function bookingTone(b) {
  if (!b) return 'confirmed';
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'no_show') return 'lost';
  if (b.status === 'completed' || b.payment) return b.payment ? 'done' : 'unpaid';
  if (b.status === 'checked_in') return 'here';
  if (b.status === 'pending') return 'pending';
  return 'confirmed';
}

/** State of a restaurant reservation. */
export function reservationTone(r) {
  switch (r?.status) {
    case 'pending': return 'pending';
    case 'seated': return 'here';
    case 'no_show': return 'lost';
    case 'cancelled': return 'cancelled';
    default: return 'confirmed';
  }
}

/** Inline style for a status line or bar (dashed when pending). */
export function toneBar(tone, direction = 'to bottom') {
  const t = TONES[tone] || TONES.confirmed;
  return t.dashed
    ? { backgroundImage: `repeating-linear-gradient(${direction}, ${t.color} 0 5px, transparent 5px 9px)` }
    : { backgroundColor: t.color };
}
