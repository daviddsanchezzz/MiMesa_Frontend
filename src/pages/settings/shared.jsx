

export const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';

export const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

export const TABLE_SHAPE_OPTIONS = [
  { value: 'circle', label: 'Circular' },
  { value: 'square', label: 'Cuadrada' },
  { value: 'rect', label: 'Rectangular' },
];

export const TABLE_ANGLE_OPTIONS = [
  { value: 0, label: 'Horizontal' },
  { value: 90, label: 'Vertical' },
];

export function inferTableShape(capacity) {
  if (capacity <= 4) return 'square';
  return 'rect';
}

export function resolveTableShape(table) {
  return TABLE_SHAPE_OPTIONS.some(s => s.value === table?.shape)
    ? table.shape
    : inferTableShape(Number(table?.capacity) || 2);
}

export function normalizeTableAngle(angle) {
  return Number(angle) === 90 ? 90 : 0;
}

export function resolveTableAngle(table) {
  const shape = resolveTableShape(table);
  if (shape !== 'rect' && shape !== 'square') return 0;
  return normalizeTableAngle(table?.angle);
}

// ─── Icons ──────────────────────────────────────────────────────────────────
export const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
  </svg>
);

export const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
  </svg>
);

export const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
  </svg>
);

export const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
  </svg>
);

export const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v4.27l2.78 1.6a.75.75 0 1 1-.75 1.3L7.4 9.23A.75.75 0 0 1 7 8.5V4a.75.75 0 0 1 .75-.75H8Z" clipRule="evenodd" />
  </svg>
);

export function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">
      {msg}
    </div>
  );
}

export function EmptyState({ onAction, actionLabel, text }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5 text-gray-300">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-medium">{text}</p>
      {onAction && (
        <button onClick={onAction} className="mt-3 text-sm text-violet-600 hover:underline font-medium">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TURNOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
export const DAYS = [
  { value: 1, label: 'L', full: 'Lunes'      },
  { value: 2, label: 'M', full: 'Martes'     },
  { value: 3, label: 'X', full: 'Miércoles'  },
  { value: 4, label: 'J', full: 'Jueves'     },
  { value: 5, label: 'V', full: 'Viernes'    },
  { value: 6, label: 'S', full: 'Sábado'     },
  { value: 0, label: 'D', full: 'Domingo'    },
];

export const SHIFT_COLORS = [
  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { bg: 'bg-rose-50',    text: 'text-rose-700',     border: 'border-rose-200',    dot: 'bg-rose-400'    },
  { bg: 'bg-emerald-50', text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-50',  text: 'text-violet-700',   border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { bg: 'bg-sky-50',     text: 'text-sky-700',      border: 'border-sky-200',     dot: 'bg-sky-400'     },
];

export const colorOf = (index) => SHIFT_COLORS[index % SHIFT_COLORS.length];

export const INTERVAL_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
];

export const emptyShiftForm = () => ({
  name: '', slotMode: 'auto',
  startTime: '12:00', endTime: '16:00', interval: 30,
  manualSlots: [],
  days: [1,2,3,4,5,6,0],
  startDate: '', endDate: '',
});

export function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING / SUBSCRIPTION SECTION
// ═══════════════════════════════════════════════════════════════════════════
export const BASIC_FEATURES = [
  'Reservas ilimitadas',
  'Emails automáticos de confirmación y cancelación',
  'Página pública de reservas con tu marca',
  'Integración en tu web (iframe)',
  'Mesas, salas y turnos ilimitados',
  'Hasta 5 usuarios de equipo',
  'Historial completo de clientes',
];

// Appointment businesses (salons, clinics…): same plans, worded for them.
export const APPT_BASIC_FEATURES = [
  'Citas ilimitadas',
  'Enlace de reservas con tu marca',
  'Emails de confirmación y cancelación',
  'Recordatorio automático el día antes',
  'Agenda por profesional',
  'Hasta 5 usuarios de equipo',
  'Historial de clientes',
];

export const APPT_PRO_EXTRAS = [
  'Equipo y roles ilimitados',
  'Módulo de finanzas y caja diaria',
  'Gestión del personal y sus horarios',
  'Soporte prioritario',
];

export const PRO_EXTRAS = [
  'Equipo y roles ilimitados',
  'Marketing y campañas de email',
  'Códigos promocionales',
  'Estadísticas avanzadas',
  'Recordatorios automáticos 24h antes',
  'Cobros automáticos por cancelación',
  'Módulo de finanzas y caja diaria',
  'Gestión de turnos del personal',
  'Soporte prioritario',
];

export function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
