import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/query';
import { reservationTone } from '../lib/status';
import Icon from '../ui/Icon';
import { Segmented, StatusText } from '../ui/kit';
import { toHHMM, toMinutes } from '../pages/agenda/utils';
import useRestaurantDay, { tablesOf } from '../pages/reservas/useRestaurantDay';
import ReservationSheet from '../pages/reservas/ReservationSheet';
import { live, plural } from '../pages/reservas/parts';
import FloorCanvas from './FloorCanvas';
import { ElementGlyph, LOOKS, TableGlyph } from './Glyphs';
import { arrangeUnplaced, boundsOf, placeTable, roomIdOf } from './geometry';
import { notify } from '../lib/notify';

const NONE = '__none__';
const EMPTY = [];

function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q); const f = () => setOn(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  return on;
}

function nowMinutes(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
}

/** «Laura García» → «Laura G.» */
const shortName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Reserva';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};
const tableIds = (r) => tablesOf(r).map((t) => String(t._id));

/**
 * What a table is doing in the chosen shift: sitting someone now, waiting for
 * the next reservation, or free — and how to draw it.
 */
function tableState(list, { isToday, nowMin, duration }) {
  const sorted = [...list].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  if (!sorted.length) return { key: 'free' };
  if (isToday) {
    const sitting = sorted.find((r) => r.status === 'seated' && nowMin >= toMinutes(r.time) && nowMin < toMinutes(r.time) + duration);
    if (sitting) {
      const elapsed = nowMin - toMinutes(sitting.time);
      const after = sorted.filter((r) => r !== sitting && toMinutes(r.time) > toMinutes(sitting.time));
      return { key: 'here', r: sitting, elapsed, progress: elapsed / duration, more: after.length, next: after[0] };
    }
    const coming = sorted.filter((r) => toMinutes(r.time) + duration > nowMin && r.status !== 'seated');
    if (coming.length) {
      const r = coming[0];
      return { key: r.status === 'pending' ? 'pending' : 'confirmed', r, more: coming.length - 1, soon: toMinutes(r.time) - nowMin <= 30 };
    }
    return { key: 'done', last: sorted[sorted.length - 1] };
  }
  const r = sorted[0];
  return { key: reservationTone(r) === 'here' ? 'here' : r.status === 'pending' ? 'pending' : 'confirmed', r, more: sorted.length - 1 };
}

function visual(state, t) {
  const pax = `${t.capacity} pax`;
  const more = state.more ? ` +${state.more}` : '';
  switch (state.key) {
    case 'here':
      return {
        look: state.progress >= 1 ? LOOKS.late : LOOKS.here,
        line2: shortName(state.r.guestName),
        badge: state.elapsed != null ? { text: `${state.elapsed < 60 ? `${state.elapsed} min` : `${Math.floor(state.elapsed / 60)} h ${String(state.elapsed % 60).padStart(2, '0')}`}${more}`, bg: state.progress >= 1 ? '#f97316' : '#10b981' } : { text: `${state.r.time}${more}`, bg: '#10b981' },
        progress: state.elapsed != null ? state.progress : null,
      };
    case 'confirmed':
      return { look: LOOKS.confirmed, line2: shortName(state.r.guestName), badge: { text: `${state.r.time}${more}`, bg: state.soon ? '#6d28d9' : '#8b5cf6' } };
    case 'pending':
      return { look: LOOKS.pending, line2: shortName(state.r.guestName), badge: { text: `${state.r.time}${more}`, bg: '#f59e0b' } };
    case 'done':
      return { look: LOOKS.free, line2: 'Libre' };
    default:
      return { look: LOOKS.free, line2: pax };
  }
}

const LEGEND = [
  ['free', 'Libre', '#ffffff', '#a1a1aa'],
  ['confirmed', 'Reservada', '#f5f3ff', '#8b5cf6'],
  ['pending', 'Por confirmar', '#fffbeb', '#f59e0b'],
  ['here', 'Sentada', '#ecfdf5', '#10b981'],
];

/* ─── Side panel / sheet: one table ───────────────────────────────────────── */

function TablePanel({ t, rows, unassigned, state, isToday, actions, onOpen, onAssign, onClose }) {
  const [picking, setPicking] = useState(false);
  const fits = unassigned.filter((r) => (Number(r.people) || 0) <= (Number(t.capacity) || 0) + 1);
  const main = state.r;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900 leading-tight">{t.name}</p>
          <p className="text-[13px] text-gray-500">{t.capacity} plazas{t.roomId?.name ? ` · ${t.roomId.name}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 -mr-1 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center"><Icon name="x" className="w-4 h-4" strokeWidth={2} /></button>
      </div>

      {main && state.key === 'confirmed' && isToday && (
        <button type="button" onClick={() => actions.seat(main)}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
          <Icon name="check" className="w-5 h-5" strokeWidth={2} />Sentar a {shortName(main.guestName)}
        </button>
      )}
      {main && state.key === 'pending' && (
        <button type="button" onClick={() => actions.accept(main)}
          className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">Aceptar la reserva de {shortName(main.guestName)}</button>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">En este turno</p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">Sin reservas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r._id} className="flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => onOpen(r)} className="min-w-0 flex-1 flex items-center gap-3 text-left">
                  <span className="w-11 shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">{r.time}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] text-gray-900 truncate">{r.guestName}</span>
                    <span className="block"><StatusText tone={reservationTone(r)} sector="restaurant" className="mr-2" /><span className="text-xs text-gray-500">{plural(r.people, 'persona', 'personas')}</span></span>
                  </span>
                </button>
                <button type="button" onClick={() => actions.assign(r, tableIds(r).filter((id) => id !== String(t._id)))}
                  title="Quitar de esta mesa" className="h-8 px-2.5 rounded-full text-xs font-semibold text-gray-500 hover:bg-gray-100">Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {fits.length > 0 && (
        <div>
          {!picking ? (
            <button type="button" onClick={() => setPicking(true)} className="text-[13px] font-semibold text-violet-700 hover:text-violet-900">
              + Asignar una reserva sin mesa ({fits.length})
            </button>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Sin mesa que caben aquí</p>
              <ul className="divide-y divide-gray-100">
                {fits.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => { onAssign(r, t); setPicking(false); }}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-1 -mx-1">
                      <span className="w-11 shrink-0 text-sm font-semibold tabular-nums">{r.time}</span>
                      <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">{r.guestName}</span>
                      <span className="text-xs text-gray-500">{r.people} pers.</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Unassigned list ─────────────────────────────────────────────────────── */

function Unassigned({ list, picked, onPick, draggable }) {
  if (!list.length) return <p className="text-sm text-gray-500 py-2">Todas las reservas de este turno tienen mesa.</p>;
  return (
    <ul className="space-y-1.5">
      {list.map((r) => {
        const on = picked?._id === r._id;
        return (
          <li key={r._id}>
            <button type="button" onClick={() => onPick(on ? null : r)}
              draggable={draggable}
              onDragStart={(e) => { e.dataTransfer.setData('application/x-reservation', r._id); e.dataTransfer.effectAllowed = 'move'; onPick(r); }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors ${on ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
              <span className="w-11 shrink-0 text-[15px] font-semibold tabular-nums text-gray-900">{r.time}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900 truncate">{r.guestName}</span>
                <StatusText tone={reservationTone(r)} sector="restaurant" />
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-gray-700 tabular-nums">
                <Icon name="person" className="w-3.5 h-3.5 text-gray-400" />{r.people}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── The live plan ───────────────────────────────────────────────────────── */

/**
 * Reservas → Plano: the room as it is in the chosen shift. Each table shows
 * who is sitting (and for how long) or who is coming next; tap one to seat,
 * see its reservations or give it one of the reservations without a table
 * (drag on desktop, tap-tap on the phone).
 */
export default function ServiceFloor({ date, today, tz }) {
  const desktop = useIsDesktop();
  const { business } = useAuth();
  const duration = Number(business?.reservationDuration) || 90;
  const day = useRestaurantDay(date);
  const { reservations, shifts, shiftOf, tables, actions, isManager } = day;
  const roomsQ = useData(['rooms'], () => api.get('/rooms').then((r) => r.data || []), { staleTime: 5 * 60000 });
  const rooms = roomsQ.data || EMPTY;
  const isToday = date === today;
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!isToday) return undefined; const id = setInterval(() => setTick((n) => n + 1), 60000); return () => clearInterval(id); }, [isToday]);
  const nowMin = useMemo(() => (isToday ? nowMinutes(tz) : null), [isToday, tz, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shift: the one going on now (today) or the first with reservations.
  const [shiftName, setShiftName] = useState(null);
  useEffect(() => {
    if (shiftName && shifts.some((s) => s.name === shiftName)) return;
    if (!shifts.length) return;
    let pick = null;
    if (isToday) pick = shifts.find((s) => nowMin <= s.end + duration) || shifts[shifts.length - 1];
    else pick = shifts.find((s) => reservations.some((r) => live(r) && shiftOf(r.time) === s.name)) || shifts[0];
    setShiftName(pick.name);
  }, [shifts, shiftName, isToday, nowMin, duration, reservations, shiftOf]);

  const [roomId, setRoomId] = useState(null);
  const activeTables = useMemo(() => tables.filter((t) => !t.isLocked), [tables]);
  useEffect(() => {
    if (roomId && (roomId === NONE ? activeTables.some((t) => !roomIdOf(t)) : rooms.some((r) => r._id === roomId))) return;
    if (!activeTables.length) return;
    const first = rooms.find((r) => activeTables.some((t) => roomIdOf(t) === r._id));
    setRoomId(first?._id || NONE);
  }, [rooms, activeTables, roomId]);

  const [sel, setSel] = useState(null); // table id
  const [picked, setPicked] = useState(null); // reservation being placed
  const [openId, setOpenId] = useState(null);
  const [panel, setPanel] = useState(false); // phone: unassigned sheet
  const canvas = useRef(null);

  const inShift = useMemo(() => reservations.filter((r) => live(r) && (!shiftName || shiftOf(r.time) === shiftName)), [reservations, shiftName, shiftOf]);
  const byTable = useMemo(() => {
    const m = {};
    for (const r of inShift) for (const id of tableIds(r)) (m[id] = m[id] || []).push(r);
    return m;
  }, [inShift]);
  const unassigned = useMemo(() => inShift.filter((r) => !tableIds(r).length).sort((a, b) => toMinutes(a.time) - toMinutes(b.time)), [inShift]);

  const room = rooms.find((r) => r._id === roomId) || null;
  const roomTables = useMemo(() => activeTables.filter((t) => (roomId === NONE ? !roomIdOf(t) : roomIdOf(t) === roomId)), [activeTables, roomId]);
  const placed = useMemo(() => arrangeUnplaced(roomTables.map(placeTable)), [roomTables]);
  const elements = room?.elements || EMPTY;
  const bounds = useMemo(() => boundsOf(placed, elements), [placed, elements]);

  const states = useMemo(() => Object.fromEntries(activeTables.map((t) => [t._id, tableState(byTable[String(t._id)] || [], { isToday, nowMin, duration })])), [activeTables, byTable, isToday, nowMin, duration]);

  // A table can take a reservation when it is big enough and nothing overlaps.
  const canTake = (t, r) => {
    if (!r) return false;
    if ((Number(t.capacity) || 0) < (Number(r.people) || 0)) return false;
    const start = toMinutes(r.time);
    return !(byTable[String(t._id)] || []).some((o) => o._id !== r._id && Math.abs(toMinutes(o.time) - start) < duration);
  };

  const assign = async (r, t) => {
    const ok = await actions.assign(r, [...tableIds(r), String(t._id)]);
    if (ok) { setPicked(null); setSel(t._id); setPanel(false); }
  };

  const onTable = (t) => {
    if (picked) {
      if (canTake(t, picked)) assign(picked, t);
      else notify.error(`${t.name} no está libre o es pequeña para ${picked.people}`);
      return;
    }
    setSel((cur) => (cur === t._id ? null : t._id));
  };

  const hitTable = (wx, wy) => placed.find((p) => {
    const a = (-p.angle * Math.PI) / 180; const dx = wx - p.cx; const dy = wy - p.cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a); const ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= p.w / 2 + 16 && Math.abs(ly) <= p.h / 2 + 16;
  });

  const onDrop = (e) => {
    const id = e.dataTransfer.getData('application/x-reservation'); if (!id) return;
    e.preventDefault();
    const r = unassigned.find((x) => x._id === id) || inShift.find((x) => x._id === id);
    const w = canvas.current.toWorld(e.clientX, e.clientY);
    const p = hitTable(w.x, w.y);
    const t = p && roomTables.find((x) => x._id === p.id);
    if (r && t) onTable(t);
  };

  const selTable = sel ? activeTables.find((t) => t._id === sel) : null;
  const selRows = selTable ? [...(byTable[String(selTable._id)] || [])].sort((a, b) => toMinutes(a.time) - toMinutes(b.time)) : EMPTY;
  const opened = openId ? reservations.find((r) => r._id === openId) : null;
  const shift = shifts.find((s) => s.name === shiftName);

  const counts = useMemo(() => {
    const c = { free: 0, confirmed: 0, pending: 0, here: 0 };
    for (const t of roomTables) { const k = states[t._id]?.key; c[k === 'done' ? 'free' : k] = (c[k === 'done' ? 'free' : k] || 0) + 1; }
    return c;
  }, [roomTables, states]);

  const roomTabs = useMemo(() => {
    const list = rooms.filter((r) => activeTables.some((t) => roomIdOf(t) === r._id)).map((r) => [r._id, r.name]);
    if (activeTables.some((t) => !roomIdOf(t))) list.push([NONE, 'Sin sala']);
    return list;
  }, [rooms, activeTables]);

  if (!day.loading && !activeTables.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-semibold text-gray-900">Todavía no has dibujado tus mesas</p>
        <p className="text-sm text-gray-500 mt-1">Con el plano verás de un vistazo qué mesas están libres, quién está sentado y quién llega.</p>
        {isManager && <Link to="/tables" className="inline-flex mt-4 h-10 px-4 items-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">Dibujar el plano</Link>}
      </div>
    );
  }

  const unassignedBlock = (
    <Unassigned list={unassigned} picked={picked} draggable={desktop}
      onPick={(r) => { setPicked(r); setSel(null); if (!desktop && r) setPanel(false); }} />
  );

  return (
    <div className="space-y-3">
      {/* Shift, room and the count of tables by state */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {shifts.length > 1 && (
          <Segmented value={shiftName} onChange={(v) => { setShiftName(v); setSel(null); setPicked(null); }}
            options={shifts.map((s) => [s.name, <span key={s.name}>{s.name} <span className="text-gray-400 font-normal tabular-nums">{toHHMM(s.start)}</span></span>])} />
        )}
        {roomTabs.length > 1 && (
          <Segmented value={roomId} onChange={(v) => { setRoomId(v); setSel(null); }} options={roomTabs} />
        )}
        <div className="flex items-center gap-3 text-[13px] text-gray-600 lg:ml-auto">
          {LEGEND.map(([k, label, fill, edge]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: fill, border: `1.5px ${k === 'pending' ? 'dashed' : 'solid'} ${edge}` }} />
              <span className="hidden sm:inline">{label}</span><b className="font-semibold tabular-nums text-gray-900">{counts[k] || 0}</b>
            </span>
          ))}
          {isManager && <Link to="/tables" className="hidden lg:inline text-[13px] font-semibold text-violet-700 hover:text-violet-900 ml-1">Editar plano</Link>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="relative rounded-2xl border border-gray-200 overflow-hidden h-[calc(100dvh-370px)] lg:h-[calc(100dvh-250px)] min-h-[380px]">
          <FloorCanvas ref={canvas} className="h-full w-full" bounds={bounds} fitKey={`${roomId}|${placed.length}`} minFit={desktop ? 0.2 : 0.85}
            onBackground={() => { setSel(null); }}
            dropProps={{ onDragOver: (e) => { if (e.dataTransfer.types.includes('application/x-reservation')) e.preventDefault(); }, onDrop }}>
            {() => (
              <>
                {elements.filter((el) => el.kind === 'zone').concat(elements.filter((el) => el.kind !== 'zone')).map((el) => <ElementGlyph key={el._id} e={el} />)}
                {placed.map((p) => {
                  const t = roomTables.find((x) => x._id === p.id);
                  const st = states[t._id] || { key: 'free' };
                  const v = visual(st, t);
                  const fit = picked ? canTake(t, picked) : null;
                  return (
                    <TableGlyph key={p.id} p={p} name={t.name} capacity={t.capacity} look={v.look} line2={v.line2} badge={v.badge} progress={v.progress}
                      selected={sel === t._id} highlight={picked && fit} dim={picked && !fit}
                      onPointerDown={(e) => e.stopPropagation()} onClick={() => onTable(t)} />
                  );
                })}
              </>
            )}
          </FloorCanvas>

          {picked && (
            <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-gray-900 text-white pl-4 pr-1.5 py-1.5 shadow-lg max-w-full">
                <span className="text-sm truncate">Toca una mesa para <b>{shortName(picked.guestName)}</b> · {picked.people} pers. · {picked.time}</span>
                <button type="button" onClick={() => setPicked(null)} className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[13px] font-semibold shrink-0">Cancelar</button>
              </div>
            </div>
          )}

          {/* Phone: unassigned button + table sheet */}
          {!desktop && !picked && unassigned.length > 0 && (
            <button type="button" onClick={() => setPanel(true)} onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-3 h-10 px-4 rounded-full bg-amber-500 text-white text-sm font-semibold shadow-lg">
              {plural(unassigned.length, 'reserva', 'reservas')} sin mesa
            </button>
          )}
          {!desktop && (selTable || panel) && (
            <div className="absolute inset-x-0 bottom-0 max-h-[70%] overflow-y-auto rounded-t-2xl bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 pt-4 pb-8 z-20"
              onPointerDown={(e) => e.stopPropagation()}>
              {panel ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[15px] font-semibold text-gray-900">Sin mesa{shift ? ` · ${shift.name}` : ''}</p>
                    <button type="button" onClick={() => setPanel(false)} className="h-8 px-3 rounded-full text-[13px] font-semibold text-violet-700">Cerrar</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Elige una y luego toca su mesa.</p>
                  {unassignedBlock}
                </>
              ) : (
                <TablePanel t={selTable} rows={selRows} unassigned={unassigned} state={states[selTable._id] || {}} isToday={isToday}
                  actions={actions} onOpen={(r) => setOpenId(r._id)} onAssign={assign} onClose={() => setSel(null)} />
              )}
            </div>
          )}
        </div>

        {/* Desktop side panel */}
        {desktop && (
          <aside className="min-w-0 h-[calc(100dvh-250px)] min-h-[380px] overflow-y-auto">
            {selTable ? (
              <TablePanel t={selTable} rows={selRows} unassigned={unassigned} state={states[selTable._id] || {}} isToday={isToday}
                actions={actions} onOpen={(r) => setOpenId(r._id)} onAssign={assign} onClose={() => setSel(null)} />
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Sin mesa · {unassigned.length}</p>
                    {shift && <span className="text-xs text-gray-400">{shift.name}</span>}
                  </div>
                  {unassigned.length > 0 && <p className="text-xs text-gray-500 mb-2">Arrástrala a una mesa, o tócala y luego toca la mesa.</p>}
                  {unassignedBlock}
                </div>
                <div className="text-[13px] text-gray-500 space-y-1">
                  <p><b className="text-gray-900 font-semibold">{inShift.length}</b> reservas · <b className="text-gray-900 font-semibold">{inShift.reduce((s, r) => s + (Number(r.people) || 0), 0)}</b> personas en este turno</p>
                  <p>Toca una mesa para ver sus reservas o sentar a quien llega.</p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {opened && <ReservationSheet reservation={opened} tables={tables} actions={actions} isManager={isManager} today={today} onClose={() => setOpenId(null)} />}
    </div>
  );
}
