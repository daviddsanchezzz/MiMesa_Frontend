export const TIME_OFF_TYPES = [
  ['day_off', 'Día libre'],
  ['vacation', 'Vacaciones'],
  ['unavailable', 'No puedo trabajar'],
];
export const timeOffLabel = (type) => (TIME_OFF_TYPES.find(([k]) => k === type) || [, type])[1];

const SHORT = { day: 'numeric', month: 'short' };
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', SHORT).replace('.', '');

/** "5 oct" · "5 – 9 oct" · "5 oct, 18:00–24:00". */
export function timeOffWhen(t) {
  const range = t.from === t.to ? fmt(t.from) : `${fmt(t.from)} – ${fmt(t.to)}`;
  const hours = t.fromTime || t.toTime ? `, ${t.fromTime || '00:00'}–${t.toTime || '24:00'}` : '';
  return `${range}${hours}`;
}

export const STATUS_TEXT = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'No aprobada' };

export function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
