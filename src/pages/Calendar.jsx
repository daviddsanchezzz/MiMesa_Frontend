import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlanGate from '../components/PlanGate';
import { statusConfig } from '../components/ReservationCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const PX_PER_MIN  = 2;
const TABLE_COL_W = 80;  // px — left sticky column
const ROW_H       = 52;  // px — each table row
const HEADER_H    = 36;  // px — time axis height
const ROOM_H      = 28;  // px — room separator height
const SLOT_EVERY  = 30;  // minutes between grid marks

// Block colors per status (vivid enough to read at a glance)
const BLOCK = {
  pending:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  confirmed: { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
  seated:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  no_show:   { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  cancelled: { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function NavButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}

function ConfigWarning({ icon, title, desc, linkTo, linkLabel }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">{icon}</div>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-500 max-w-xs">{desc}</p>
      {linkTo && (
        <a href={linkTo} className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          {linkLabel} →
        </a>
      )}
    </div>
  );
}

function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-violet-500">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">Vista de calendario</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">Disponible en el plan Basic. Activa tu prueba gratuita de 14 días para acceder.</p>
      </div>
      <a href="/configuracion?tab=suscripcion" className="text-sm font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
        Ver planes
      </a>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Calendar() {
  const { business } = useAuth();
  const reservationDuration = business?.reservationDuration;

  const today = getToday();
  const [date, setDate]               = useState(today);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables]           = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [shifts, setShifts]           = useState([]);
  const [loading, setLoading]         = useState(true);

  // Load static data once
  useEffect(() => {
    Promise.all([api.get('/tables'), api.get('/rooms'), api.get('/shifts')])
      .then(([t, r, s]) => { setTables(t.data); setRooms(r.data); setShifts(s.data); });
  }, []);

  // Load reservations when date changes
  useEffect(() => {
    setLoading(true);
    api.get(`/reservations?date=${date}`)
      .then(r => setReservations(r.data))
      .finally(() => setLoading(false));
  }, [date]);

  // ── Time range ──
  const shiftStart = shifts.length ? Math.min(...shifts.map(s => timeToMinutes(s.startTime))) : 12 * 60;
  const shiftEnd   = shifts.length ? Math.max(...shifts.map(s => timeToMinutes(s.endTime)))   : 23 * 60;

  // Extend range if reservations fall outside shift window
  const assignedRsvs = reservations.filter(r => {
    if (!r.time) return false;
    const hasTable = (Array.isArray(r.tableIds) && r.tableIds.length > 0) || r.tableId;
    return hasTable;
  });

  const rsvMinutes = assignedRsvs.map(r => timeToMinutes(r.time));
  const effectiveStart = rsvMinutes.length ? Math.min(shiftStart, ...rsvMinutes) : shiftStart;
  const effectiveEnd   = reservationDuration && rsvMinutes.length
    ? Math.max(shiftEnd, ...rsvMinutes.map(m => m + reservationDuration))
    : shiftEnd;

  const totalMinutes  = Math.max(effectiveEnd - effectiveStart, 60);
  const timelineWidth = totalMinutes * PX_PER_MIN;

  // Time header slots (every SLOT_EVERY minutes)
  const slots = [];
  for (let m = effectiveStart; m <= effectiveEnd; m += SLOT_EVERY) slots.push(m);

  // ── Room/table grouping ──
  const tablesByRoom = rooms
    .map(room => ({
      room,
      tables: tables
        .filter(t => (t.roomId?._id || t.roomId) === (room._id || room))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    }))
    .filter(g => g.tables.length > 0);

  const unassigned = tables.filter(t => !t.roomId);
  if (unassigned.length > 0) tablesByRoom.push({ room: { _id: '__none__', name: 'Sin sala' }, tables: unassigned });

  // ── Per-table reservation lookup ──
  const getTableIds = (r) => {
    if (Array.isArray(r.tableIds) && r.tableIds.length > 0)
      return r.tableIds.map(t => t?._id?.toString() || t?.toString()).filter(Boolean);
    if (r.tableId) return [r.tableId._id?.toString() || r.tableId.toString()];
    return [];
  };

  const rsvsByTable = assignedRsvs.reduce((acc, r) => {
    getTableIds(r).forEach(id => { if (!acc[id]) acc[id] = []; acc[id].push(r); });
    return acc;
  }, {});

  // ── Date navigation ──
  const shiftDate = (days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const isToday = date === today;

  return (
    <PlanGate paid fallback={<div className="flex flex-col h-full"><UpgradePrompt /></div>}>
      <div className="flex flex-col h-full bg-white">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 border-b border-gray-200 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <NavButton onClick={() => shiftDate(-1)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </NavButton>

            <div className="text-center min-w-[160px]">
              <p className="text-sm font-bold text-gray-900 capitalize">{dateLabel}</p>
              {!isToday && (
                <button onClick={() => setDate(today)} className="text-[11px] text-violet-600 hover:text-violet-700 font-medium transition-colors">
                  Volver a hoy
                </button>
              )}
            </div>

            <NavButton onClick={() => shiftDate(1)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </NavButton>
          </div>

          <input
            type="date"
            value={date}
            onChange={e => e.target.value && setDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* ── Guards ── */}
        {shifts.length === 0 && !loading && (
          <ConfigWarning
            icon="⏰"
            title="Sin turnos configurados"
            desc="Configura al menos un turno para que el calendario sepa qué rango horario mostrar."
            linkTo="/configuracion?tab=turnos"
            linkLabel="Ir a Turnos"
          />
        )}

        {shifts.length > 0 && !reservationDuration && !loading && (
          <ConfigWarning
            icon="⏱️"
            title="Duración por mesa no configurada"
            desc="El calendario necesita saber cuánto dura cada reserva para calcular los bloques. Configúralo en Límites."
            linkTo="/configuracion?tab=limites"
            linkLabel="Ir a Límites"
          />
        )}

        {/* ── Timeline ── */}
        {shifts.length > 0 && reservationDuration && (
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              </div>
            )}

            {!loading && (
              <div style={{ minWidth: TABLE_COL_W + timelineWidth + 32 }}>

                {/* Time header (sticky top) */}
                <div
                  className="sticky top-0 z-20 flex bg-white border-b border-gray-200"
                  style={{ height: HEADER_H }}
                >
                  {/* Corner */}
                  <div
                    className="sticky left-0 z-30 shrink-0 bg-white border-r border-gray-100"
                    style={{ width: TABLE_COL_W }}
                  />
                  {/* Hour labels + tick marks */}
                  <div className="relative flex-1" style={{ width: timelineWidth }}>
                    {slots.map(m => {
                      const isHour = m % 60 === 0;
                      return (
                        <div
                          key={m}
                          className="absolute flex flex-col items-start"
                          style={{ left: (m - effectiveStart) * PX_PER_MIN, top: 0, bottom: 0 }}
                        >
                          {isHour && (
                            <span className="text-[11px] text-gray-400 font-medium pt-1 pl-1 leading-none">
                              {minutesToLabel(m)}
                            </span>
                          )}
                          <div
                            className={`mt-auto w-px ${isHour ? 'bg-gray-300 h-3' : 'bg-gray-200 h-2'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Room groups */}
                {tablesByRoom.map(({ room, tables: roomTables }) => (
                  <div key={room._id}>

                    {/* Room separator */}
                    <div
                      className="flex items-center border-b border-gray-200 bg-gray-50"
                      style={{ height: ROOM_H }}
                    >
                      <div
                        className="sticky left-0 z-10 flex items-center px-3 bg-gray-50 shrink-0"
                        style={{ width: TABLE_COL_W }}
                      >
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                          {room.name}
                        </span>
                      </div>
                      {/* Extend the separator line across the full timeline */}
                      <div className="flex-1 h-full" style={{ width: timelineWidth }} />
                    </div>

                    {/* Table rows */}
                    {roomTables.map((table) => {
                      const tableId  = table._id?.toString();
                      const tableRsvs = rsvsByTable[tableId] || [];

                      return (
                        <div
                          key={table._id}
                          className="flex border-b border-gray-100 hover:bg-gray-50/40 transition-colors"
                          style={{ height: ROW_H }}
                        >
                          {/* Table name (sticky left) */}
                          <div
                            className="sticky left-0 z-10 flex items-center px-3 bg-white border-r border-gray-100 shrink-0"
                            style={{ width: TABLE_COL_W }}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{table.name}</p>
                              {table.capacity && (
                                <p className="text-[10px] text-gray-400">{table.capacity} pax</p>
                              )}
                            </div>
                          </div>

                          {/* Timeline area */}
                          <div className="relative" style={{ width: timelineWidth, height: ROW_H }}>
                            {/* Vertical grid lines */}
                            {slots.map(m => (
                              <div
                                key={m}
                                className={`absolute top-0 bottom-0 w-px ${m % 60 === 0 ? 'bg-gray-200' : 'bg-gray-100'}`}
                                style={{ left: (m - effectiveStart) * PX_PER_MIN }}
                              />
                            ))}

                            {/* Reservation blocks */}
                            {tableRsvs.map(r => {
                              const rMin    = timeToMinutes(r.time);
                              const left    = (rMin - effectiveStart) * PX_PER_MIN;
                              const width   = Math.max(reservationDuration * PX_PER_MIN - 3, 20);
                              const colors  = BLOCK[r.status] || BLOCK.confirmed;

                              return (
                                <div
                                  key={r._id}
                                  title={`${r.guestName} · ${r.people} pax · ${r.time}`}
                                  className="absolute top-1.5 bottom-1.5 rounded-lg px-2 flex flex-col justify-center overflow-hidden cursor-default select-none"
                                  style={{
                                    left,
                                    width,
                                    backgroundColor: colors.bg,
                                    borderLeft: `3px solid ${colors.border}`,
                                    color: colors.text,
                                  }}
                                >
                                  <p className="text-[11px] font-semibold leading-tight truncate">{r.guestName}</p>
                                  <p className="text-[10px] leading-tight opacity-70">{r.time} · {r.people} pax</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Empty state */}
                {tablesByRoom.length === 0 && (
                  <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                    Sin mesas configuradas
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PlanGate>
  );
}
