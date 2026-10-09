import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { queryClient, useData } from '../lib/query';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { MenuButton, Segmented } from '../ui/kit';
import FloorCanvas from './FloorCanvas';
import { ElementGlyph, ElementPreview, LOOKS, TableGlyph, TablePreview } from './Glyphs';
import {
  ELEMENTS, GRID, SHAPES, arrangeUnplaced, boundsOf, clamp, elementXY, freeSpot, nextTableName, placeElement,
  placeTable, roomIdOf, rotatedHalf, snap, storedXY, tableSize,
} from './geometry';
import { notify } from '../lib/notify';
import { confirmDialog } from '../ui/confirm';

const NONE = '__none__';
const EMPTY = [];
const errText = (err, fallback) => err?.response?.data?.message || fallback;
const oid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

const TABLE_PRESETS = [
  { shape: 'circle', capacity: 2, label: 'Redonda', sub: '2' },
  { shape: 'circle', capacity: 4, label: 'Redonda', sub: '4' },
  { shape: 'square', capacity: 2, label: 'Cuadrada', sub: '2' },
  { shape: 'square', capacity: 4, label: 'Cuadrada', sub: '4' },
  { shape: 'rect', capacity: 6, label: 'Rectangular', sub: '6' },
  { shape: 'rect', capacity: 8, label: 'Rectangular', sub: '8' },
  { shape: 'booth', capacity: 4, label: 'Banco', sub: '4' },
  { shape: 'booth', capacity: 6, label: 'Banco', sub: '6' },
];
const ELEMENT_ORDER = ['bar', 'wall', 'window', 'entrance', 'kitchen', 'wc', 'zone', 'plant', 'column', 'label'];
const LABELLED = new Set(['bar', 'kitchen', 'wc', 'zone', 'entrance', 'label']);

function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q); const f = () => setOn(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  return on;
}

/* ─── Small inputs ─────────────────────────────────────────────────────────── */

function Stepper({ value, onChange, min = 1, max = 30, suffix }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Menos" onClick={() => onChange(clamp(value - 1, min, max))} disabled={value <= min}
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg leading-none disabled:opacity-40">−</button>
      <span className="min-w-[3.5rem] text-center text-[15px] font-semibold tabular-nums text-gray-900">{value}{suffix}</span>
      <button type="button" aria-label="Más" onClick={() => onChange(clamp(value + 1, min, max))} disabled={value >= max}
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg leading-none disabled:opacity-40">+</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function RotateRow({ angle, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange((angle + 345) % 360)} aria-label="Girar a la izquierda"
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"><RotIcon dir={-1} /></button>
      <span className="w-12 text-center text-[15px] font-semibold tabular-nums text-gray-900">{angle}°</span>
      <button type="button" onClick={() => onChange((angle + 15) % 360)} aria-label="Girar a la derecha"
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"><RotIcon dir={1} /></button>
      <div className="ml-auto flex gap-1">
        {[0, 45, 90].map((a) => (
          <button key={a} type="button" onClick={() => onChange(a)}
            className={`h-8 px-2.5 rounded-full text-xs font-semibold ${angle === a ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{a}°</button>
        ))}
      </div>
    </div>
  );
}

function RotIcon({ dir = 1, className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} style={dir < 0 ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M15.5 9.5a5.5 5.5 0 1 1-1.8-4.1" strokeLinecap="round" /><path d="M14.5 2.5v3.5H11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Palette ──────────────────────────────────────────────────────────────── */

function Palette({ onAddTable, onAddElement, canAddTables, canAddElements, limitText, compact }) {
  const tile = 'group flex flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100 py-2 disabled:opacity-40 disabled:pointer-events-none';
  const drag = (payload) => ({
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.setData('application/x-floor', JSON.stringify(payload)); e.dataTransfer.effectAllowed = 'copy'; },
  });
  return (
    <div className="space-y-4">
      <div>
        <p className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Mesas</p>
        <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-2'} gap-1`}>
          {TABLE_PRESETS.map((p) => (
            <button key={`${p.shape}${p.capacity}`} type="button" disabled={!canAddTables} className={tile}
              onClick={() => onAddTable(p)} {...drag({ type: 'table', ...p })} title={`${p.label} de ${p.capacity}`}>
              <TablePreview shape={p.shape} capacity={p.capacity} />
              <span className="text-[11px] text-gray-600 leading-tight">{p.label} <b className="font-semibold text-gray-900">{p.sub}</b></span>
            </button>
          ))}
        </div>
        {limitText && <p className="px-1 mt-1 text-[11px] text-amber-700">{limitText}</p>}
      </div>
      <div>
        <p className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Local</p>
        <div className={`grid ${compact ? 'grid-cols-5' : 'grid-cols-2'} gap-1`}>
          {ELEMENT_ORDER.map((k) => (
            <button key={k} type="button" disabled={!canAddElements} className={tile}
              onClick={() => onAddElement(k)} {...drag({ type: 'element', kind: k })}>
              <ElementPreview kind={k} size={compact ? 36 : 40} />
              <span className="text-[11px] text-gray-600 leading-tight">{ELEMENTS[k].label}</span>
            </button>
          ))}
        </div>
        {!canAddElements && <p className="px-1 mt-1 text-[11px] text-gray-400">Crea una sala para dibujar la barra, paredes, la entrada…</p>}
      </div>
    </div>
  );
}

/* ─── Inspector (what you can change of the selected thing) ───────────────── */

function TableInspector({ t, p, rooms, onChange, onDuplicate, onDelete, nameRef }) {
  const [name, setName] = useState(t.name);
  useEffect(() => setName(t.name), [t._id, t.name]);
  const commitName = () => { const v = name.trim(); if (v && v !== t.name) onChange({ name: v }); else setName(t.name); };
  return (
    <div className="space-y-4">
      {t.isLocked && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Bloqueada por tu plan: no se usa en las reservas.</p>}
      <Field label="Nombre">
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </Field>
      <Field label="Personas">
        <Stepper value={Number(t.capacity) || 1} onChange={(v) => onChange({ capacity: v })} max={30} />
      </Field>
      <Field label="Forma">
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(SHAPES).map(([k, s]) => (
            <button key={k} type="button" onClick={() => onChange({ shape: k })} title={s.label}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 border ${p.shape === k ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <TablePreview shape={k} capacity={k === 'rect' || k === 'booth' ? 6 : 4} size={36} />
              <span className={`text-[10px] font-semibold ${p.shape === k ? 'text-violet-800' : 'text-gray-500'}`}>{k === 'booth' ? 'Banco' : s.label}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Giro"><RotateRow angle={p.angle} onChange={(angle) => onChange({ angle })} /></Field>
      {rooms.length > 0 && (
        <Field label="Sala">
          <select value={roomIdOf(t) || ''} onChange={(e) => onChange({ roomId: e.target.value || null, x: null, y: null })}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Sin sala</option>
            {rooms.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </Field>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onDuplicate} className="h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">Duplicar</button>
        <button type="button" onClick={onDelete} className="h-9 px-3 rounded-full text-[13px] font-semibold text-rose-600 hover:bg-rose-50 ml-auto">Eliminar</button>
      </div>
    </div>
  );
}

function ElementInspector({ e, onChange, onDuplicate, onDelete }) {
  const [label, setLabel] = useState(e.label || '');
  useEffect(() => setLabel(e.label || ''), [e._id, e.label]);
  const num = (v) => clamp(Math.round(Number(v) || 0), 4, 4000);
  return (
    <div className="space-y-4">
      {LABELLED.has(e.kind) && (
        <Field label="Texto">
          <input value={label} placeholder={ELEMENTS[e.kind].label} onChange={(ev) => setLabel(ev.target.value)}
            onBlur={() => label !== (e.label || '') && onChange({ label: label.slice(0, 60) })}
            onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur(); }}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </Field>
      )}
      <Field label="Tamaño">
        <div className="flex items-center gap-2">
          <input type="number" value={e.w} onChange={(ev) => onChange({ w: num(ev.target.value) })} aria-label="Ancho"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <span className="text-gray-400">×</span>
          <input type="number" value={e.h} onChange={(ev) => onChange({ h: num(ev.target.value) })} aria-label="Alto"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">También puedes estirarlo desde la esquina.</p>
      </Field>
      <Field label="Giro"><RotateRow angle={e.angle || 0} onChange={(angle) => onChange({ angle })} /></Field>
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onDuplicate} className="h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">Duplicar</button>
        <button type="button" onClick={onDelete} className="h-9 px-3 rounded-full text-[13px] font-semibold text-rose-600 hover:bg-rose-50 ml-auto">Eliminar</button>
      </div>
    </div>
  );
}

/* ─── On-canvas mini toolbar (SVG, constant size) ─────────────────────────── */

function CanvasToolbar({ x, y, k, onRotate, onDuplicate, onDelete }) {
  const btn = (i, title, onClick, icon, danger) => (
    <g key={title} transform={`translate(${i * 34} 0)`} style={{ cursor: 'pointer' }}
      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <title>{title}</title>
      <rect x={2} y={2} width={30} height={30} rx={15} fill="transparent" className="hover:fill-gray-100" />
      <g transform="translate(7 7)" stroke={danger ? '#e11d48' : '#3f3f46'} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</g>
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${1 / k}) translate(-70 -44)`}>
      <rect width={140} height={34} rx={17} fill="#fff" stroke="#e4e4e7" filter="url(#fp-shadow)" />
      {btn(0, 'Girar a la izquierda', () => onRotate(-15), <g transform="translate(20 0) scale(-1 1)"><path d="M15.5 9.5a5.5 5.5 0 1 1-1.8-4.1" /><path d="M14.5 2.5v3.5H11" /></g>)}
      {btn(1, 'Girar a la derecha', () => onRotate(15), <g><path d="M15.5 9.5a5.5 5.5 0 1 1-1.8-4.1" /><path d="M14.5 2.5v3.5H11" /></g>)}
      {btn(2, 'Duplicar', onDuplicate, <g><rect x="6" y="6" width="11" height="11" rx="2.5" /><path d="M3 13V5a2 2 0 0 1 2-2h8" /></g>)}
      {btn(3, 'Eliminar', onDelete, <g><path d="M3.5 5.5h13M8 5.5V4a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 12 4v1.5m2.5 0-.6 9.6a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9l-.6-9.6" /></g>, true)}
    </g>
  );
}

/* ─── Room dialog ──────────────────────────────────────────────────────────── */

function RoomDialog({ room, onClose, onSaved }) {
  const [name, setName] = useState(room?.name || '');
  const [capacity, setCapacity] = useState(room?.capacity || 40);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), capacity: Math.max(1, Number(capacity) || 1) };
      const { data } = room?._id ? await api.put(`/rooms/${room._id}`, body) : await api.post('/rooms', body);
      onSaved(data);
    } catch (err) { notify(errText(err, 'No se ha podido guardar la sala'), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title={room?._id ? 'Editar sala' : 'Nueva sala'} subtitle="Sala, Terraza, Reservado…" onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancelar</button>
          <button type="submit" form="room-form" disabled={busy || !name.trim()} className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">{room?._id ? 'Guardar' : 'Crear sala'}</button>
        </div>
      )}>
      <form id="room-form" onSubmit={save} className="space-y-4">
        <Field label="Nombre">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Terraza"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </Field>
        <Field label="Aforo (personas)">
          <Stepper value={Number(capacity) || 1} onChange={setCapacity} max={999} />
        </Field>
      </form>
    </Modal>
  );
}

/* ─── The editor ───────────────────────────────────────────────────────────── */

/**
 * Mesas y salas: draw the restaurant. Tables and the room's elements (bar,
 * walls, entrance…) are placed by dragging; everything saves by itself.
 */
export default function FloorEditor({ maxTables = Infinity, header }) {
  const desktop = useIsDesktop();
  const tablesQ = useData(['tables'], () => api.get('/tables').then((r) => r.data || []));
  const roomsQ = useData(['rooms'], () => api.get('/rooms').then((r) => r.data || []));
  const serverTables = tablesQ.data || EMPTY;
  const rooms = roomsQ.data || EMPTY;

  const [overrides, setOverrides] = useState({}); // tableId → patch not yet echoed by the server
  const [elementsBy, setElementsBy] = useState({}); // roomId → elements being edited
  const [roomId, setRoomId] = useState(null);
  const [sel, setSel] = useState(null); // { type: 'table'|'element', id }
  const [guides, setGuides] = useState(null);
  const [lifted, setLifted] = useState(null);
  const [saving, setSaving] = useState(0);
  const [savedAt, setSavedAt] = useState(null);
  const [undo, setUndo] = useState([]);
  const [roomDialog, setRoomDialog] = useState(null);
  const [sheet, setSheet] = useState(null); // phone: 'add' | 'edit'
  const canvas = useRef(null);
  const nameRef = useRef(null);

  const tables = useMemo(() => serverTables.map((t) => (overrides[t._id] ? { ...t, ...overrides[t._id] } : t)), [serverTables, overrides]);
  const activeCount = serverTables.filter((t) => !t.isLocked).length;
  const atLimit = maxTables !== Infinity && serverTables.length >= maxTables;

  // Default room: the first with tables (or the first), then whatever the user picks.
  useEffect(() => {
    if (tablesQ.isPending || roomsQ.isPending) return;
    const loose = serverTables.some((t) => !roomIdOf(t));
    if (roomId && rooms.some((r) => r._id === roomId)) return;
    if (roomId === NONE && (loose || !rooms.length)) return;
    if (!rooms.length && !serverTables.length) return;
    const withTables = rooms.find((r) => serverTables.some((t) => roomIdOf(t) === r._id));
    setRoomId(withTables?._id || rooms[0]?._id || NONE);
  }, [rooms, serverTables, roomId, tablesQ.isPending, roomsQ.isPending]);

  const room = rooms.find((r) => r._id === roomId) || null;
  const inRoom = useCallback((t) => (roomId === NONE ? !roomIdOf(t) : roomIdOf(t) === roomId), [roomId]);
  const roomTables = useMemo(() => tables.filter(inRoom), [tables, inRoom]);
  const elements = (room && (elementsBy[room._id] ?? room.elements)) || EMPTY;

  const placed = useMemo(() => arrangeUnplaced(roomTables.map(placeTable)), [roomTables]);
  const placedById = useMemo(() => Object.fromEntries(placed.map((p) => [p.id, p])), [placed]);
  const bounds = useMemo(() => boundsOf(placed, elements), [placed, elements]);
  const ready = !tablesQ.isPending && !roomsQ.isPending;

  const tabs = useMemo(() => {
    const list = rooms.map((r) => ({ id: r._id, label: r.name, count: tables.filter((t) => roomIdOf(t) === r._id).length }));
    const loose = tables.filter((t) => !roomIdOf(t)).length;
    if (loose || !rooms.length) list.push({ id: NONE, label: 'Sin sala', count: loose });
    return list;
  }, [rooms, tables]);

  /* ── Saving ── */
  const track = useCallback(async (fn) => {
    setSaving((n) => n + 1);
    try { const out = await fn(); setSavedAt(Date.now()); return out; } catch (err) { notify(errText(err, 'No se ha podido guardar'), 'error'); return null; } finally { setSaving((n) => n - 1); }
  }, []);

  const pendingTable = useRef({}); const tableTimers = useRef({});
  const saveTable = useCallback((id, patch, delay = 350) => {
    pendingTable.current[id] = { ...(pendingTable.current[id] || {}), ...patch };
    clearTimeout(tableTimers.current[id]);
    tableTimers.current[id] = setTimeout(() => {
      const body = pendingTable.current[id]; delete pendingTable.current[id];
      track(() => api.put(`/tables/${id}`, body));
    }, delay);
  }, [track]);

  const elTimers = useRef({});
  const saveElements = useCallback((rid, list, delay = 450) => {
    clearTimeout(elTimers.current[rid]);
    elTimers.current[rid] = setTimeout(() => {
      track(() => api.put(`/rooms/${rid}`, { elements: list }));
    }, delay);
  }, [track]);

  // Flush on leave.
  useEffect(() => () => {
    Object.entries(pendingTable.current).forEach(([id, body]) => api.put(`/tables/${id}`, body).catch(() => {}));
  }, []);

  const patchTable = useCallback((id, patch, { record = true, save = true } = {}) => {
    const cur = tables.find((t) => t._id === id); if (!cur) return;
    if (record) setUndo((u) => [...u.slice(-40), { type: 'table', id, prev: Object.fromEntries(Object.keys(patch).map((k) => [k, k === 'roomId' ? roomIdOf(cur) : cur[k] ?? null])) }]);
    setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), ...patch } }));
    if (save) saveTable(id, patch);
  }, [tables, saveTable]);

  const setElements = useCallback((rid, list, { record = true, prev } = {}) => {
    if (record) setUndo((u) => [...u.slice(-40), { type: 'elements', roomId: rid, prev: prev || elementsBy[rid] || rooms.find((r) => r._id === rid)?.elements || [] }]);
    setElementsBy((m) => ({ ...m, [rid]: list }));
    saveElements(rid, list);
  }, [elementsBy, rooms, saveElements]);

  const doUndo = useCallback(() => {
    setUndo((u) => {
      const last = u[u.length - 1]; if (!last) return u;
      if (last.type === 'table') {
        setOverrides((o) => ({ ...o, [last.id]: { ...(o[last.id] || {}), ...last.prev } }));
        saveTable(last.id, last.prev, 0);
      } else {
        setElementsBy((m) => ({ ...m, [last.roomId]: last.prev }));
        saveElements(last.roomId, last.prev, 0);
      }
      return u.slice(0, -1);
    });
  }, [saveTable, saveElements]);

  /* ── Adding ── */
  const addTable = useCallback(async (preset, at) => {
    if (atLimit) { notify(`Tu plan permite ${maxTables} mesas`, 'error'); return; }
    const { w, h } = tableSize(preset.capacity, preset.shape);
    const c = at || canvas.current?.center() || { x: 300, y: 200 };
    const spot = at ? { cx: snap(c.x), cy: snap(c.y) } : freeSpot([...placed, ...elements.map((e) => ({ ...placeElement(e), w: e.w, h: e.h, angle: e.angle }))], w, h, c.x, c.y);
    const xy = storedXY(spot.cx, spot.cy, w, h, 0);
    const body = { name: nextTableName(tables), capacity: preset.capacity, shape: preset.shape, angle: 0, roomId: room?._id || null, ...xy };
    const created = await track(() => api.post('/tables', body).then((r) => r.data));
    if (created) {
      queryClient.setQueryData(['tables'], (old) => [...(old || []), created]);
      setSel({ type: 'table', id: created._id });
      setSheet(null);
    }
  }, [atLimit, maxTables, placed, elements, tables, room, track]);

  const addElement = useCallback((kind, at) => {
    if (!room) return;
    const def = ELEMENTS[kind];
    const c = at || canvas.current?.center() || { x: 300, y: 200 };
    const spot = at ? { cx: snap(c.x), cy: snap(c.y) } : freeSpot([...placed, ...elements.map((e) => ({ ...placeElement(e), w: e.w, h: e.h, angle: e.angle }))], def.w, def.h, c.x, c.y);
    const el = { _id: oid(), kind, w: def.w, h: def.h, angle: 0, label: '', ...elementXY(spot.cx, spot.cy, def.w, def.h, 0) };
    setElements(room._id, [...elements, el]);
    setSel({ type: 'element', id: el._id });
    setSheet(null);
  }, [room, placed, elements, setElements]);

  const onDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-floor'); if (!raw) return;
    e.preventDefault();
    const item = JSON.parse(raw);
    const at = canvas.current.toWorld(e.clientX, e.clientY);
    if (item.type === 'table') addTable(item, at); else addElement(item.kind, at);
  };

  /* ── Selection helpers ── */
  const selTable = sel?.type === 'table' ? tables.find((t) => t._id === sel.id) : null;
  const selEl = sel?.type === 'element' ? elements.find((e) => e._id === sel.id) : null;
  useEffect(() => { if (sel && !selTable && !selEl) setSel(null); }, [sel, selTable, selEl]);

  const rotateSel = (delta) => {
    if (selTable) {
      const p = placedById[selTable._id]; const angle = (p.angle + delta + 360) % 360;
      patchTable(selTable._id, { angle, ...storedXY(p.cx, p.cy, p.w, p.h, angle) });
    } else if (selEl) {
      const { cx, cy } = placeElement(selEl); const angle = ((selEl.angle || 0) + delta + 360) % 360;
      setElements(room._id, elements.map((e) => (e._id === selEl._id ? { ...e, angle, ...elementXY(cx, cy, e.w, e.h, angle) } : e)));
    }
  };

  const changeTable = (patch) => {
    if (!selTable) return;
    const p = placedById[selTable._id];
    const next = { ...patch };
    if ('capacity' in patch || 'shape' in patch || 'angle' in patch) {
      const shape = patch.shape || p.shape; const cap = patch.capacity ?? selTable.capacity; const angle = patch.angle ?? p.angle;
      const { w, h } = tableSize(cap, shape);
      Object.assign(next, storedXY(p.cx, p.cy, w, h, angle));
    }
    if ('roomId' in patch) { setSel(null); notify(`${selTable.name} se ha movido de sala`); }
    patchTable(selTable._id, next);
  };

  const changeElement = (patch) => {
    if (!selEl) return;
    const { cx, cy } = placeElement(selEl);
    setElements(room._id, elements.map((e) => {
      if (e._id !== selEl._id) return e;
      const n = { ...e, ...patch };
      return { ...n, ...elementXY(cx, cy, n.w, n.h, n.angle || 0) };
    }));
  };

  const duplicateSel = () => {
    if (selTable) {
      const p = placedById[selTable._id];
      const others = [...placed, ...elements.map((e) => ({ ...placeElement(e), w: e.w, h: e.h, angle: e.angle }))];
      const spot = freeSpot(others, p.w, p.h, p.cx + p.w / 2 + 40, p.cy);
      addTable({ shape: p.shape, capacity: selTable.capacity }, { x: spot.cx, y: spot.cy });
    } else if (selEl) {
      const { cx, cy } = placeElement(selEl);
      const el = { ...selEl, _id: oid(), ...elementXY(cx + 40, cy + 40, selEl.w, selEl.h, selEl.angle || 0) };
      setElements(room._id, [...elements, el]);
      setSel({ type: 'element', id: el._id });
    }
  };

  const deleteSel = async () => {
    if (selTable) {
      if (!await confirmDialog(`¿Eliminar ${selTable.name}? Las reservas que la tengan asignada se quedan sin mesa.`)) return;
      const id = selTable._id;
      const ok = await track(() => api.delete(`/tables/${id}`));
      if (ok !== null) { queryClient.setQueryData(['tables'], (old) => (old || []).filter((t) => t._id !== id)); setSel(null); setSheet(null); }
    } else if (selEl) {
      setElements(room._id, elements.filter((e) => e._id !== selEl._id));
      setSel(null); setSheet(null);
    }
  };

  /* ── Dragging (tables and elements), with snapping and guides ── */
  const startDrag = (e, type, id) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    setSel({ type, id });
    const start = canvas.current.toWorld(e.clientX, e.clientY);
    const sx = e.clientX; const sy = e.clientY;
    const base = type === 'table' ? placedById[id] : (() => { const el = elements.find((x) => x._id === id); return { ...placeElement(el), w: el.w, h: el.h, angle: el.angle || 0 }; })();
    const before = type === 'table' ? { x: tables.find((t) => t._id === id)?.x ?? null, y: tables.find((t) => t._id === id)?.y ?? null } : elements;
    const others = [
      ...placed.filter((p) => !(type === 'table' && p.id === id)).map((p) => ({ cx: p.cx, cy: p.cy })),
      ...elements.filter((el) => !(type === 'element' && el._id === id)).map((el) => placeElement(el)),
    ];
    let moved = false; let last = null;
    const onMove = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      moved = true; setLifted(id);
      const wpt = canvas.current.toWorld(ev.clientX, ev.clientY);
      let cx = snap(base.cx + (wpt.x - start.x)); let cy = snap(base.cy + (wpt.y - start.y));
      const thr = 8 / (canvas.current.k || 1);
      let gx = null; let gy = null;
      for (const o of others) {
        if (gx === null && Math.abs(o.cx - cx) < thr) { cx = o.cx; gx = cx; }
        if (gy === null && Math.abs(o.cy - cy) < thr) { cy = o.cy; gy = cy; }
      }
      setGuides(gx !== null || gy !== null ? { x: gx, y: gy } : null);
      last = { cx, cy };
      if (type === 'table') {
        setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), ...storedXY(cx, cy, base.w, base.h, base.angle) } }));
      } else {
        setElementsBy((m) => ({ ...m, [room._id]: (m[room._id] ?? room.elements ?? []).map((el) => (el._id === id ? { ...el, ...elementXY(cx, cy, el.w, el.h, el.angle || 0) } : el)) }));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      setGuides(null); setLifted(null);
      if (!moved || !last) return;
      if (type === 'table') {
        setUndo((u) => [...u.slice(-40), { type: 'table', id, prev: before }]);
        saveTable(id, storedXY(last.cx, last.cy, base.w, base.h, base.angle), 0);
      } else {
        setElementsBy((m) => {
          const list = m[room._id] ?? room.elements ?? [];
          saveElements(room._id, list, 0);
          return m;
        });
        setUndo((u) => [...u.slice(-40), { type: 'elements', roomId: room._id, prev: before }]);
      }
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  };

  const startResize = (e, el) => {
    e.stopPropagation();
    const start = canvas.current.toWorld(e.clientX, e.clientY);
    const a = ((el.angle || 0) * Math.PI) / 180;
    const { cx, cy } = placeElement(el);
    const before = elements;
    const onMove = (ev) => {
      const p = canvas.current.toWorld(ev.clientX, ev.clientY);
      const dx = p.x - start.x; const dy = p.y - start.y;
      const lx = dx * Math.cos(a) + dy * Math.sin(a); const ly = -dx * Math.sin(a) + dy * Math.cos(a);
      const w = clamp(snap(el.w + lx * 2, GRID / 2), 4, 4000); const h = clamp(snap(el.h + ly * 2, el.kind === 'wall' || el.kind === 'window' ? 2 : GRID / 2), 4, 4000);
      setElementsBy((m) => ({ ...m, [room._id]: (m[room._id] ?? room.elements ?? []).map((x) => (x._id === el._id ? { ...x, w, h, ...elementXY(cx, cy, w, h, x.angle || 0) } : x)) }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      setElementsBy((m) => { saveElements(room._id, m[room._id] ?? [], 0); return m; });
      setUndo((u) => [...u.slice(-40), { type: 'elements', roomId: room._id, prev: before }]);
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
      if (!sel) return;
      if (e.key === 'Escape') { setSel(null); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); return; }
      if (e.key.toLowerCase() === 'r' && !mod) { e.preventDefault(); rotateSel(e.shiftKey ? -15 : 15); return; }
      const step = e.shiftKey ? GRID * 2 : GRID / 2;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      if (selTable) {
        const p = placedById[selTable._id];
        patchTable(selTable._id, storedXY(p.cx + d[0], p.cy + d[1], p.w, p.h, p.angle));
      } else if (selEl) {
        setElements(room._id, elements.map((x) => (x._id === selEl._id ? { ...x, x: x.x + d[0], y: x.y + d[1] } : x)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── Rooms ── */
  const deleteRoom = async () => {
    if (!room) return;
    const n = roomTables.length;
    if (!await confirmDialog(`¿Eliminar la sala ${room.name}?${n ? ` Sus ${n} mesas pasan a «Sin sala».` : ''}`)) return;
    const ok = await track(() => api.delete(`/rooms/${room._id}`));
    if (ok !== null) { setRoomId(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }); queryClient.invalidateQueries({ queryKey: ['tables'] }); }
  };

  const seats = roomTables.filter((t) => !t.isLocked).reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  const status = saving > 0 ? 'Guardando…' : savedAt ? 'Guardado' : null;
  const limitText = atLimit ? `Has llegado al límite de ${maxTables} mesas de tu plan.` : null;
  const selPlaced = selTable ? placedById[selTable._id] : null;

  const inspector = selTable && selPlaced ? (
    <TableInspector t={selTable} p={selPlaced} rooms={rooms} onChange={changeTable} onDuplicate={duplicateSel} onDelete={deleteSel} nameRef={nameRef} />
  ) : selEl ? (
    <ElementInspector e={selEl} onChange={changeElement} onDuplicate={duplicateSel} onDelete={deleteSel} />
  ) : null;

  /* ── Render ── */
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Top bar: rooms, save state, undo */}
      <div className="shrink-0 px-4 lg:px-8 pt-3 lg:pt-6 pb-3 space-y-3">
        {header}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2">
              {tabs.length > 0 && (
                <Segmented value={roomId} onChange={(v) => { setRoomId(v); setSel(null); }}
                  options={tabs.map((t) => [t.id, <span key={t.id} className="inline-flex items-center gap-1.5">{t.label}<span className={`text-[11px] tabular-nums ${roomId === t.id ? 'text-violet-600' : 'text-gray-400'}`}>{t.count}</span></span>])} />
              )}
              <button type="button" onClick={() => setRoomDialog({})}
                className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold text-violet-700 hover:bg-violet-50">
                <Icon name="plus" className="w-4 h-4" strokeWidth={2} />Sala
              </button>
            </div>
          </div>
          <span className={`hidden sm:inline text-xs tabular-nums ${saving ? 'text-gray-500' : 'text-gray-400'}`}>{status}</span>
          <button type="button" onClick={doUndo} disabled={!undo.length} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M7.5 6H13a4 4 0 0 1 0 8H8" strokeLinecap="round" /><path d="M10 3 7 6l3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {room && (
            <MenuButton ariaLabel="Opciones de la sala" className="w-9 h-9 justify-center text-gray-600"
              items={[{ label: `Renombrar ${room.name}`, onClick: () => setRoomDialog(room) }, { label: 'Eliminar sala', onClick: deleteRoom }]}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><circle cx="4.5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="15.5" cy="10" r="1.5" /></svg>
            </MenuButton>
          )}
        </div>
      </div>

      {/* Canvas with floating palette and inspector */}
      <div className="relative flex-1 min-h-0 border-t border-gray-100">
        <FloorCanvas ref={canvas} className="h-full w-full" bounds={bounds} minFit={desktop ? 0.2 : 0.85}
          insets={desktop ? { left: 200, right: 312 } : { bottom: 56 }} fitKey={`${roomId}|${ready}`}
          onBackground={() => { setSel(null); if (!desktop) setSheet(null); }}
          dropProps={{ onDragOver: (e) => { if (e.dataTransfer.types.includes('application/x-floor')) e.preventDefault(); }, onDrop }}>
          {(k) => (
            <>
              {elements.filter((el) => el.kind === 'zone').concat(elements.filter((el) => el.kind !== 'zone')).map((el) => (
                <ElementGlyph key={el._id} e={el} selected={sel?.type === 'element' && sel.id === el._id}
                  cursor={lifted === el._id ? 'grabbing' : 'grab'}
                  onPointerDown={(ev) => startDrag(ev, 'element', el._id)} />
              ))}
              {placed.map((p) => {
                const t = roomTables.find((x) => x._id === p.id);
                return (
                  <TableGlyph key={p.id} p={p} name={t.name} capacity={t.capacity}
                    look={t.isLocked ? LOOKS.locked : LOOKS.plain}
                    line2={t.isLocked ? 'Bloqueada' : `${t.capacity} pax`}
                    selected={sel?.type === 'table' && sel.id === p.id} lifted={lifted === p.id}
                    cursor={lifted === p.id ? 'grabbing' : 'grab'}
                    onPointerDown={(ev) => startDrag(ev, 'table', p.id)}
                    onDoubleClick={() => { if (desktop) setTimeout(() => nameRef.current?.select(), 0); else setSheet('edit'); }} />
                );
              })}
              {guides && bounds && (
                <g style={{ pointerEvents: 'none' }}>
                  {guides.x !== null && <line x1={guides.x} x2={guides.x} y1={bounds.minY - 400} y2={bounds.maxY + 400} stroke="#8b5cf6" strokeWidth={1 / k} strokeDasharray={`${5 / k} ${4 / k}`} />}
                  {guides.y !== null && <line y1={guides.y} y2={guides.y} x1={bounds.minX - 400} x2={bounds.maxX + 400} stroke="#8b5cf6" strokeWidth={1 / k} strokeDasharray={`${5 / k} ${4 / k}`} />}
                </g>
              )}
              {/* resize handle for the selected element */}
              {selEl && !lifted && (() => {
                const { cx, cy } = placeElement(selEl); const a = ((selEl.angle || 0) * Math.PI) / 180;
                const hx = selEl.w / 2 + 6; const hy = selEl.h / 2 + 6;
                const x = cx + hx * Math.cos(a) - hy * Math.sin(a); const y = cy + hx * Math.sin(a) + hy * Math.cos(a);
                return <circle cx={x} cy={y} r={7 / k} fill="#fff" stroke="#7c3aed" strokeWidth={2 / k} style={{ cursor: 'nwse-resize' }} onPointerDown={(ev) => startResize(ev, selEl)} />;
              })()}
              {/* mini toolbar over the selection */}
              {!lifted && (selPlaced || selEl) && (() => {
                const c = selPlaced || { ...placeElement(selEl), w: selEl.w, h: selEl.h, angle: selEl.angle || 0 };
                const { hy } = rotatedHalf(c.w + (selPlaced ? 40 : 12), c.h + (selPlaced ? 40 : 12), c.angle);
                return <CanvasToolbar x={c.cx} y={c.cy - hy} k={k} onRotate={rotateSel} onDuplicate={duplicateSel} onDelete={deleteSel} />;
              })()}
            </>
          )}
        </FloorCanvas>

        {/* Empty states */}
        {ready && !placed.length && !elements.length && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
            <div className="text-center max-w-xs">
              <p className="text-[15px] font-semibold text-gray-900">{rooms.length ? 'Esta sala está vacía' : 'Dibuja tu restaurante'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {rooms.length
                  ? `${desktop ? 'Arrastra' : 'Toca «Añadir» y elige'} mesas y elementos${desktop ? ' desde la izquierda' : ''}. Se guarda solo.`
                  : 'Empieza creando una sala (Sala, Terraza…) y añade mesas.'}
              </p>
              {!rooms.length && (
                <button type="button" onClick={() => setRoomDialog({})} className="pointer-events-auto mt-3 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">Crear la primera sala</button>
              )}
            </div>
          </div>
        )}

        {/* Desktop: palette on the left */}
        {desktop && (
          <div className="absolute top-3 left-3 bottom-16 w-[188px] overflow-y-auto rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-sm p-2.5 [scrollbar-width:thin]"
            onPointerDown={(e) => e.stopPropagation()}>
            <Palette onAddTable={(p) => addTable(p)} onAddElement={(k) => addElement(k)} canAddTables={!atLimit} canAddElements={!!room} limitText={limitText} />
          </div>
        )}

        {/* Desktop: inspector on the right */}
        {desktop && (
          <div className="absolute top-3 right-3 w-[300px] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-sm"
            onPointerDown={(e) => e.stopPropagation()}>
            {inspector ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{selTable ? 'Mesa' : ELEMENTS[selEl.kind].label}</p>
                  <button type="button" onClick={() => setSel(null)} aria-label="Cerrar" className="w-7 h-7 -mr-1 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center"><Icon name="x" className="w-4 h-4" strokeWidth={2} /></button>
                </div>
                {inspector}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">{room?.name || 'Sin sala'}</p>
                  <p className="text-[13px] text-gray-500">{roomTables.length} {roomTables.length === 1 ? 'mesa' : 'mesas'} · {seats} plazas{room?.capacity ? ` · aforo ${room.capacity}` : ''}</p>
                </div>
                <ul className="text-[13px] text-gray-600 space-y-1.5">
                  <li>Arrastra para mover; se alinea solo con las demás.</li>
                  <li>Toca una mesa para cambiar nombre, personas, forma o giro.</li>
                  <li className="text-gray-400"><kbd className="font-sans">R</kbd> girar · <kbd className="font-sans">Ctrl D</kbd> duplicar · <kbd className="font-sans">Supr</kbd> borrar · <kbd className="font-sans">Ctrl Z</kbd> deshacer</li>
                </ul>
                <p className="text-xs text-gray-400">{activeCount}{maxTables !== Infinity ? ` de ${maxTables}` : ''} mesas en total.</p>
              </div>
            )}
          </div>
        )}

        {/* Phone: add button and sheets */}
        {!desktop && (
          <>
            <div className="absolute bottom-6 left-3 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setSheet('add')}
                className="h-10 px-4 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-lg inline-flex items-center gap-1.5">
                <Icon name="plus" className="w-4 h-4" strokeWidth={2.2} />Añadir
              </button>
              {inspector && (
                <button type="button" onClick={() => setSheet('edit')}
                  className="h-10 px-4 rounded-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold shadow-sm">Editar</button>
              )}
            </div>
            {status && <span className="absolute top-2 right-3 text-[11px] text-gray-400">{status}</span>}
            {sheet && (
              <div className="absolute inset-x-0 bottom-0 max-h-[62%] overflow-y-auto rounded-t-2xl bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white flex items-center justify-between px-4 pt-3 pb-2">
                  <p className="text-[15px] font-semibold text-gray-900">
                    {sheet === 'add' ? 'Añadir' : selTable ? selTable.name : selEl ? ELEMENTS[selEl.kind].label : ''}
                  </p>
                  <button type="button" onClick={() => setSheet(null)} className="h-8 px-3 rounded-full text-[13px] font-semibold text-violet-700">Hecho</button>
                </div>
                <div className="px-4 pb-24">
                  {sheet === 'add'
                    ? <Palette compact onAddTable={(p) => addTable(p)} onAddElement={(k) => addElement(k)} canAddTables={!atLimit} canAddElements={!!room} limitText={limitText} />
                    : inspector}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {roomDialog && (
        <RoomDialog room={roomDialog._id ? roomDialog : null} onClose={() => setRoomDialog(null)}
          onSaved={(r) => { setRoomDialog(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }); if (r?._id) setRoomId(r._id); }} />
      )}
    </div>
  );
}
