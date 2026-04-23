import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';

// ─── World & grid ───────────────────────────────────────────────────────────
const WORLD_W  = 2400;
const WORLD_H  = 1600;
const GRID     = 24;
const snap     = v => Math.round(v / GRID) * GRID;
const clamp    = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

// ─── Table geometry ──────────────────────────────────────────────────────────
const TABLE_SHAPES = {
  circle: { label: 'Circular' },
  square: { label: 'Cuadrada' },
  rect: { label: 'Rectangular' },
};

function inferShapeFromCapacity(capacity) {
  if (capacity <= 2) return 'circle';
  if (capacity <= 4) return 'square';
  return 'rect';
}

function resolveTableShape(table) {
  return TABLE_SHAPES[table?.shape] ? table.shape : inferShapeFromCapacity(Number(table?.capacity) || 2);
}

function tableGeometry(capacity, shape) {
  const cap = Number(capacity) || 2;
  const resolvedShape = TABLE_SHAPES[shape] ? shape : inferShapeFromCapacity(cap);

  if (resolvedShape === 'circle') {
    if (cap <= 2) return { w: 88, h: 88, shape: resolvedShape };
    if (cap <= 4) return { w: 104, h: 104, shape: resolvedShape };
    if (cap <= 6) return { w: 118, h: 118, shape: resolvedShape };
    return { w: 130, h: 130, shape: resolvedShape };
  }

  if (resolvedShape === 'square') {
    if (cap <= 2) return { w: 86, h: 86, shape: resolvedShape };
    if (cap <= 4) return { w: 104, h: 104, shape: resolvedShape };
    if (cap <= 6) return { w: 116, h: 116, shape: resolvedShape };
    return { w: 126, h: 126, shape: resolvedShape };
  }

  if (cap <= 4) return { w: 130, h: 82, shape: resolvedShape };
  if (cap <= 6) return { w: 152, h: 90, shape: resolvedShape };
  if (cap <= 8) return { w: 182, h: 92, shape: resolvedShape };
  if (cap <= 10) return { w: 204, h: 94, shape: resolvedShape };
  return { w: 228, h: 96, shape: resolvedShape };
}

// ─── Chair positions (relative to table top-left) ────────────────────────────
const CW = 18, CH = 10, CHAIR_GAP = 7;

function generateChairs(capacity, w, h, shape) {
  const chairs = [];
  const cap = Math.min(capacity, 12);

  if (shape === 'circle') {
    const r = w / 2 + CHAIR_GAP + CH / 2;
    for (let i = 0; i < cap; i++) {
      const a = (i / cap) * 2 * Math.PI - Math.PI / 2;
      chairs.push({ cx: w / 2 + r * Math.cos(a), cy: h / 2 + r * Math.sin(a), rot: a * 180 / Math.PI + 90, wide: false });
    }
    return chairs;
  }

  // Distribute across 4 sides
  let top = 0, bot = 0, lft = 0, rgt = 0;
  if (cap <= 2)      { top = 1; bot = 1; }
  else if (cap <= 4) { top = 2; bot = 2; }
  else if (cap <= 6) { top = 2; bot = 2; lft = 1; rgt = 1; }
  else if (cap <= 8) { top = 3; bot = 3; lft = 1; rgt = 1; }
  else               { top = 4; bot = 4; lft = Math.ceil((cap-8)/2); rgt = Math.floor((cap-8)/2); }

  const rowChairs = (count, cx0, cx1, cy, rotDeg) => {
    if (count === 0) return;
    const step = count === 1 ? 0 : (cx1 - cx0) / (count - 1);
    for (let i = 0; i < count; i++)
      chairs.push({ cx: count === 1 ? (cx0 + cx1) / 2 : cx0 + i * step, cy, rot: rotDeg, wide: true });
  };
  const colChairs = (count, cy0, cy1, cx, rotDeg) => {
    if (count === 0) return;
    const step = count === 1 ? 0 : (cy1 - cy0) / (count - 1);
    for (let i = 0; i < count; i++)
      chairs.push({ cx, cy: count === 1 ? (cy0 + cy1) / 2 : cy0 + i * step, rot: rotDeg, wide: false });
  };

  const px = 16; // padding from corners
  rowChairs(top, px,     w - px, -(CHAIR_GAP + CH / 2),  0  );
  rowChairs(bot, px,     w - px, h + CHAIR_GAP + CH / 2, 180);
  colChairs(lft, px,     h - px, -(CHAIR_GAP + CH / 2),  270);
  colChairs(rgt, px,     h - px, w + CHAIR_GAP + CH / 2, 90 );

  return chairs;
}

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS = {
  free:     { label: 'Libre',     accent: '#34d399', bg: '#ffffff', ring: '#d1fae5', text: '#065f46', dot: '#10b981' },
  reserved: { label: 'Reservada', accent: '#f59e0b', bg: '#fffbeb', ring: '#fde68a', text: '#78350f', dot: '#f59e0b' },
  occupied: { label: 'Ocupada',   accent: '#f43f5e', bg: '#fff1f2', ring: '#fecdd3', text: '#881337', dot: '#f43f5e' },
};

const NEXT_STATUS = {
  free:     [{ s: 'reserved', label: 'Marcar reservada' }, { s: 'occupied', label: 'Marcar ocupada' }],
  reserved: [{ s: 'occupied', label: 'Sentar clientes'  }, { s: 'free',     label: 'Liberar'        }],
  occupied: [{ s: 'free',     label: 'Liberar mesa'     }],
};

// ─── Chair ───────────────────────────────────────────────────────────────────
function Chair({ chair, statusColor, scale }) {
  const { cx, cy, rot, wide } = chair;
  const w = wide ? CW : CH;
  const h = wide ? CH : CW;
  return (
    <div style={{
      position: 'absolute',
      left: cx - w / 2, top: cy - h / 2,
      width: w, height: h,
      backgroundColor: statusColor,
      borderRadius: 4,
      opacity: 0.65,
      transform: `rotate(${rot}deg)`,
      pointerEvents: 'none',
    }} />
  );
}

const NEUTRAL = { bg: '#ffffff', ring: '#e2e8f0', text: '#475569', dot: '#94a3b8', accent: '#cbd5e1' };

// ─── Table node ───────────────────────────────────────────────────────────────
function TableNode({ table, isActive, isDragging, editMode, showStatus, onPointerDown, onClick }) {
  const geo  = tableGeometry(table.capacity, resolveTableShape(table));
  const { w, h, shape } = geo;
  const st   = showStatus ? (STATUS[table.status] ?? STATUS.free) : NEUTRAL;
  const chairs = generateChairs(table.capacity, w, h, shape);

  const CHAIR_BLEED = CHAIR_GAP + Math.max(CW, CH) + 4;
  const wrapW = w + CHAIR_BLEED * 2;
  const wrapH = h + CHAIR_BLEED * 2;

  const borderRadius = shape === 'circle' ? '50%' : shape === 'square' ? 20 : 14;

  return (
    <div
      style={{
        position: 'absolute',
        left:  table.x - CHAIR_BLEED,
        top:   table.y - CHAIR_BLEED,
        width:  wrapW,
        height: wrapH,
        cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        zIndex: isDragging ? 100 : isActive ? 60 : 10,
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {/* Chairs */}
      {chairs.map((c, i) => (
        <Chair
          key={i}
          chair={{ ...c, cx: c.cx + CHAIR_BLEED, cy: c.cy + CHAIR_BLEED }}
          statusColor={st.dot}
        />
      ))}

      {/* Table card */}
      <div style={{
        position: 'absolute',
        left: CHAIR_BLEED, top: CHAIR_BLEED,
        width: w, height: h,
        backgroundColor: st.bg,
        border: `2px solid ${isActive ? '#6366f1' : st.ring}`,
        borderRadius,
        boxShadow: isDragging
          ? '0 16px 40px rgba(0,0,0,0.22)'
          : isActive
          ? '0 0 0 3px rgba(99,102,241,0.25), 0 4px 12px rgba(0,0,0,0.10)'
          : '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        transition: isDragging ? 'none' : 'box-shadow 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        overflow: 'hidden',
        outline: editMode && !isActive ? `1.5px dashed #a5b4fc` : 'none',
        outlineOffset: 2,
      }}>
        {/* Status accent bar — top for rect, ring accent for circle/square */}
        {shape === 'rect' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            backgroundColor: st.accent, borderRadius: '12px 12px 0 0',
          }} />
        )}
        {shape !== 'rect' && (
          <div style={{
            position: 'absolute', inset: -2,
            borderRadius, border: `3px solid ${st.accent}`,
            pointerEvents: 'none',
          }} />
        )}

        <span style={{ fontWeight: 700, fontSize: shape === 'circle' ? 11 : 12, color: '#1e293b', textAlign: 'center', lineHeight: 1.2, padding: '0 8px', wordBreak: 'break-word' }}>
          {table.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <svg viewBox="0 0 12 12" fill={st.dot} style={{ width: 9, height: 9, flexShrink: 0 }}>
            <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 10a.5.5 0 0 0 .5-.5 4 4 0 0 0-8 0 .5.5 0 0 0 .5.5h7Z" />
          </svg>
          <span style={{ fontSize: 10, color: st.text, fontWeight: 600 }}>{table.capacity}</span>
        </div>

        {/* Edit mode drag handle */}
        {editMode && !isDragging && (
          <div style={{ position: 'absolute', top: 5, right: 5, color: '#a5b4fc', pointerEvents: 'none' }}>
            <svg viewBox="0 0 10 10" fill="currentColor" style={{ width: 9, height: 9 }}>
              <circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/>
              <circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status popup ────────────────────────────────────────────────────────────
function StatusPopup({ table, onStatusChange, onClose, pan, scale }) {
  const geo    = tableGeometry(table.capacity, resolveTableShape(table));
  const vx     = table.x * scale + pan.x;
  const vy     = (table.y + geo.h) * scale + pan.y + 12;
  const popupW = 180;

  return (
    <div
      style={{
        position: 'absolute',
        left: vx, top: vy,
        width: popupW,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 300,
        padding: '6px 6px',
        overflow: 'hidden',
      }}
      onClick={e => e.stopPropagation()}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
        {table.name}
      </p>
      {NEXT_STATUS[table.status]?.map(({ s, label }) => {
        const st = STATUS[s];
        return (
          <button
            key={s}
            onClick={() => { onStatusChange(table._id, s); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#374151',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = st.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: st.accent, flexShrink: 0, boxShadow: `0 0 0 2px ${st.ring}` }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Auto-arrange ─────────────────────────────────────────────────────────────
function autoArrange(tables) {
  const GAP = 32;
  let x = 60, y = 60, rowH = 0;
  return tables.map(t => {
    const { w, h } = tableGeometry(t.capacity, resolveTableShape(t));
    const bleed = CHAIR_GAP + Math.max(CW, CH) + 8;
    const totalW = w + bleed * 2 + GAP;
    const totalH = h + bleed * 2;
    if (x + totalW > WORLD_W - 80) { x = 60; y += rowH + GAP + bleed * 2; rowH = 0; }
    const pos = { x: x + bleed, y: y + bleed };
    x += totalW;
    rowH = Math.max(rowH, totalH);
    return { ...t, ...pos };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FloorPlan({ tables, rooms, onStatusChange, onRefresh, editOnly = false, showStatus = true }) {
  const viewportRef  = useRef(null);
  const dragRef      = useRef(null);
  const panDragRef   = useRef(null);
  const posRef       = useRef({});
  const lastMovedRef = useRef(false);
  const snapshotRef  = useRef({});
  // Keep pan/scale in refs so pointer handlers never go stale
  const panRef       = useRef({ x: 40, y: 40 });
  const scaleRef     = useRef(0.75);
  const editModeRef  = useRef(editOnly);

  const [positions,    _setPositions]  = useState({});
  const [activeId,     setActiveId]    = useState(null);
  const [draggingId,   setDraggingId]  = useState(null);
  const [editMode,     _setEditMode]   = useState(editOnly);
  const [pan,          _setPan]        = useState({ x: 40, y: 40 });
  const [scale,        _setScale]      = useState(0.75);
  const [roomFilter,   setRoomFilter]  = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [editForm,     setEditForm]    = useState({ name: '', capacity: 2, shape: 'circle' });
  const [editSaving,   setEditSaving]  = useState(false);
  const [editError,    setEditError]   = useState('');
  const [saving,       setSaving]      = useState(false);

  // Setters that keep refs in sync
  const setPan = useCallback((v) => {
    const next = typeof v === 'function' ? v(panRef.current) : v;
    panRef.current = next;
    _setPan(next);
  }, []);
  const setScale = useCallback((v) => {
    const next = typeof v === 'function' ? v(scaleRef.current) : v;
    scaleRef.current = next;
    _setScale(next);
  }, []);
  const setEditMode = useCallback((v) => {
    const next = typeof v === 'function' ? v(editModeRef.current) : v;
    editModeRef.current = next;
    _setEditMode(next);
  }, []);
  const setPositions = useCallback((updater) => {
    _setPositions(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      posRef.current = next;
      return next;
    });
  }, []);

  // Default room on first load
  useEffect(() => {
    if (roomFilter !== null) return;
    if (rooms.length > 0) setRoomFilter(rooms[0]._id);
    else setRoomFilter('__none__');
  }, [rooms, roomFilter]);

  const getPos = useCallback((table) => {
    if (posRef.current[table._id]) return posRef.current[table._id];
    if (table.x != null && table.y != null) return { x: table.x, y: table.y };
    return null;
  }, []);

  // Filter by room
  const filtered = roomFilter === '__none__'
    ? tables.filter(t => !t.roomId)
    : tables.filter(t => t.roomId?._id === roomFilter || t.roomId === roomFilter);

  const withPos  = filtered.map(t => { const p = getPos(t); return p ? { ...t, ...p } : { ...t, x: null, y: null }; });
  const noPos    = withPos.filter(t => t.x === null);
  const hasPos   = withPos.filter(t => t.x !== null);
  const arranged = [...hasPos, ...(noPos.length ? autoArrange(noPos) : [])];

  // ── Coordinate helpers — reads from refs, never stale ─────────────────────
  const toWorld = useCallback((clientX, clientY) => {
    const el = viewportRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const p = panRef.current, s = scaleRef.current;
    return { x: (clientX - rect.left - p.x) / s, y: (clientY - rect.top - p.y) / s };
  }, []); // stable forever

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoom = useCallback((factor, cx, cy) => {
    const prev = scaleRef.current;
    const next = clamp(prev * factor, MIN_ZOOM, MAX_ZOOM);
    if (cx != null && cy != null) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = cx - rect.left, my = cy - rect.top;
        const p = panRef.current;
        setPan({ x: mx - (mx - p.x) * (next / prev), y: my - (my - p.y) * (next / prev) });
      }
    }
    setScale(next);
  }, [setPan, setScale]);

  const fitToScreen = useCallback(() => {
    if (!viewportRef.current || arranged.length === 0) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const bleed = CHAIR_GAP + Math.max(CW, CH) + 8;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of arranged) {
      const { w, h } = tableGeometry(t.capacity, resolveTableShape(t));
      minX = Math.min(minX, t.x - bleed);
      minY = Math.min(minY, t.y - bleed);
      maxX = Math.max(maxX, t.x + w + bleed);
      maxY = Math.max(maxY, t.y + h + bleed);
    }
    const pad = 40;
    const newScale = clamp(
      Math.min((rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY)),
      MIN_ZOOM, MAX_ZOOM
    );
    setScale(newScale);
    setPan({
      x: (rect.width  - (maxX - minX) * newScale) / 2 - minX * newScale,
      y: (rect.height - (maxY - minY) * newScale) / 2 - minY * newScale,
    });
  }, [arranged, setPan, setScale]);

  // Fit on load / room change
  useEffect(() => {
    const t = setTimeout(fitToScreen, 50);
    return () => clearTimeout(t);
  }, [roomFilter, tables.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  // ── Table drag — all handlers are stable (no stale closures) ──────────────
  const onTablePointerDown = useCallback((e, table) => {
    if (!editModeRef.current || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const pos = posRef.current[table._id] ?? (table.x != null ? { x: table.x, y: table.y } : { x: 0, y: 0 });
    const worldCursor = toWorld(e.clientX, e.clientY);
    dragRef.current = { id: table._id, offX: worldCursor.x - pos.x, offY: worldCursor.y - pos.y, moved: false };
    viewportRef.current?.setPointerCapture(e.pointerId);
    setDraggingId(table._id);
    setActiveId(null);
  }, [toWorld]); // toWorld is stable

  const onTableClick = useCallback((e, table) => {
    e.stopPropagation();
    if (!showStatus) {
      if (!lastMovedRef.current) {
        setEditingTable(table);
        setEditForm({ name: table.name, capacity: table.capacity, shape: resolveTableShape(table) });
        setEditError('');
      }
      return;
    }
    if (editModeRef.current) return;
    setActiveId(prev => prev === table._id ? null : table._id);
  }, [showStatus]);

  // ── Canvas pointer events — all stable ────────────────────────────────────
  const onCanvasPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (dragRef.current) return;
    const p = panRef.current;
    panDragRef.current = { startX: e.clientX - p.x, startY: e.clientY - p.y };
    setActiveId(null);
  }, []);

  const onCanvasPointerMove = useCallback((e) => {
    const dr = dragRef.current;
    if (dr) {
      const world = toWorld(e.clientX, e.clientY);
      const id = dr.id; // capture before any async work
      const x = snap(clamp(world.x - dr.offX, 0, WORLD_W - 200));
      const y = snap(clamp(world.y - dr.offY, 0, WORLD_H - 200));
      setPositions(p => ({ ...p, [id]: { x, y } }));
      dr.moved = true;
      return;
    }
    if (panDragRef.current) {
      setPan({ x: e.clientX - panDragRef.current.startX, y: e.clientY - panDragRef.current.startY });
    }
  }, [toWorld, setPositions, setPan]);

  const onCanvasPointerUp = useCallback(() => {
    if (dragRef.current) {
      const { moved } = dragRef.current;
      lastMovedRef.current = moved;
      dragRef.current = null;
      setDraggingId(null);
      // positions are stored locally — saved only when user clicks "Guardar"
    } else {
      lastMovedRef.current = false;
    }
    panDragRef.current = null;
  }, []);

  // ── Enter / exit edit mode ─────────────────────────────────────────────────
  const enterEditMode = () => {
    snapshotRef.current = { ...posRef.current };
    setEditMode(true);
    setActiveId(null);
  };

  const cancelEditMode = () => {
    setPositions(snapshotRef.current);
    setEditMode(false);
    setEditingTable(null);
    setActiveId(null);
  };

  // ── Save all positions at once ─────────────────────────────────────────────
  const saveAllPositions = async () => {
    setSaving(true);
    try {
      const toSave = arranged.filter(t => posRef.current[t._id]);
      await Promise.all(toSave.map(t =>
        api.put(`/tables/${t._id}`, posRef.current[t._id]).catch(() => {})
      ));
      onRefresh?.();
      if (!editOnly) setEditMode(false);
      setEditingTable(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-arrange (local only, saved with "Guardar") ────────────────────────
  const handleAutoArrange = () => {
    const rearranged = autoArrange(filtered);
    const newPos = Object.fromEntries(rearranged.map(t => [t._id, { x: t.x, y: t.y }]));
    setPositions(p => ({ ...p, ...newPos }));
    setTimeout(fitToScreen, 100);
  };

  // ── Table property edit (name / capacity) ──────────────────────────────────
  const handleEditSave = async () => {
    if (!editForm.name.trim()) { setEditError('El nombre es obligatorio'); return; }
    const cap = Number(editForm.capacity);
    if (!cap || cap < 1) { setEditError('La capacidad debe ser al menos 1'); return; }
    if (!TABLE_SHAPES[editForm.shape]) { setEditError('Selecciona una forma válida'); return; }
    setEditSaving(true); setEditError('');
    try {
      await api.put(`/tables/${editingTable._id}`, {
        name: editForm.name.trim(),
        capacity: cap,
        shape: editForm.shape,
      });
      onRefresh?.();
      setEditingTable(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEditSaving(false);
    }
  };

  const changeRoom = (id) => { setRoomFilter(id); setActiveId(null); setEditingTable(null); if (!editOnly) setEditMode(false); };

  const roomTabs = [
    ...rooms.map(r => ({ id: r._id, label: r.name, count: tables.filter(t => t.roomId?._id === r._id || t.roomId === r._id).length })),
    { id: '__none__', label: 'Sin sala', count: tables.filter(t => !t.roomId).length },
  ];

  const pct = Math.round(scale * 100);
  const editShape = TABLE_SHAPES[editForm.shape] ? editForm.shape : inferShapeFromCapacity(Number(editForm.capacity) || 2);
  const editPreview = tableGeometry(Number(editForm.capacity) || 2, editShape);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 shrink-0">
        {/* Room tabs */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-max">
            {roomTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => changeRoom(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  roomFilter === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  roomFilter === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editMode ? (
            <>
              <button onClick={handleAutoArrange}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-50 border border-gray-200 hover:border-violet-200 transition-all">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3Zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3Zm6-6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H9Zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H9Z" clipRule="evenodd" />
                </svg>
                Auto-organizar
              </button>
              {!editOnly && (
                <button onClick={cancelEditMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all">
                  Cancelar
                </button>
              )}
              <button
                onClick={saveAllPositions}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-all"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                {saving ? 'Guardando...' : 'Guardar disposición'}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:text-violet-600 transition-all"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
              </svg>
              Editar disposición
            </button>
          )}
        </div>
      </div>

      {/* ── Edit mode hint ───────────────────────────────────────────────────── */}
      {editMode && (
        <div className="flex items-center gap-2 bg-violet-50 border-b border-violet-100 px-4 py-2 shrink-0">
          <svg viewBox="0 0 16 16" fill="#6366f1" className="w-3.5 h-3.5 shrink-0">
            <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-violet-700 font-medium">
            Modo edición — <strong>arrastra</strong> para mover mesas · <strong>clic</strong> para editar nombre/personas/forma · arrastra el fondo para mover la vista
          </p>
        </div>
      )}

      {/* ── Viewport ─────────────────────────────────────────────────────────── */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          cursor: panDragRef.current ? 'grabbing' : draggingId ? 'grabbing' : 'default',
          touchAction: 'none',
          backgroundColor: '#f8fafc',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: `${GRID * 2 * scale}px ${GRID * 2 * scale}px`,
          backgroundPosition: `${pan.x % (GRID * 2 * scale)}px ${pan.y % (GRID * 2 * scale)}px`,
        }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onClick={() => setActiveId(null)}
      >
        {/* World */}
        <div style={{ position: 'absolute', left: pan.x, top: pan.y, width: WORLD_W * scale, height: WORLD_H * scale }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            {arranged.length === 0 ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 12 }}>
                <svg viewBox="0 0 64 64" fill="none" style={{ width: 64, height: 64, opacity: 0.4 }}>
                  <rect x="12" y="20" width="40" height="24" rx="6" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="20" y="8" width="6" height="14" rx="3" fill="currentColor" opacity="0.5"/>
                  <rect x="38" y="8" width="6" height="14" rx="3" fill="currentColor" opacity="0.5"/>
                  <rect x="20" y="42" width="6" height="14" rx="3" fill="currentColor" opacity="0.5"/>
                  <rect x="38" y="42" width="6" height="14" rx="3" fill="currentColor" opacity="0.5"/>
                </svg>
                <p style={{ fontSize: 14, fontWeight: 500 }}>No hay mesas en esta sala</p>
              </div>
            ) : arranged.map(table => (
              <TableNode
                key={table._id}
                table={table}
                isDragging={draggingId === table._id}
                isActive={activeId === table._id}
                editMode={editMode}
                showStatus={showStatus}
                onPointerDown={e => onTablePointerDown(e, table)}
                onClick={e => onTableClick(e, table)}
              />
            ))}
          </div>
        </div>

        {/* Status popup — only in operational view */}
        {showStatus && !editMode && activeId && (() => {
          const t = arranged.find(t => t._id === activeId);
          if (!t) return null;
          return (
            <StatusPopup
              table={t}
              onStatusChange={onStatusChange}
              onClose={() => setActiveId(null)}
              pan={pan}
              scale={scale}
            />
          );
        })()}

        {/* ── Table edit panel ────────────────────────────────────────────── */}
        {editingTable && (
          <div
            className="absolute top-4 right-4 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <svg viewBox="0 0 14 14" fill="#6366f1" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v5.75A2.75 2.75 0 0 1 9.25 12H4.75A2.75 2.75 0 0 1 2 9.25V3.5h-.25A.75.75 0 0 1 1 2.75Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800">Editar mesa</span>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Nombre</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Mesa 1, Terraza A..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Personas</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditForm(f => ({ ...f, capacity: Math.max(1, Number(f.capacity) - 1) }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors"
                  >−</button>
                  <input
                    type="number" min="1" max="20"
                    value={editForm.capacity}
                    onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setEditForm(f => ({ ...f, capacity: Math.min(20, Number(f.capacity) + 1) }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors"
                  >+</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Forma</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TABLE_SHAPES).map(([shapeId, shapeCfg]) => {
                    const active = editShape === shapeId;
                    return (
                      <button
                        key={shapeId}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, shape: shapeId }))}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                          active
                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className="mx-auto mb-1 flex h-7 w-10 items-center justify-center">
                          {shapeId === 'circle' && <span className="h-6 w-6 rounded-full border-2 border-current opacity-70" />}
                          {shapeId === 'square' && <span className="h-6 w-6 rounded-md border-2 border-current opacity-70" />}
                          {shapeId === 'rect' && <span className="h-5 w-8 rounded-md border-2 border-current opacity-70" />}
                        </div>
                        {shapeCfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-600 mb-2">Vista previa</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: Math.max(34, Math.min(56, Math.round(editPreview.w * 0.34))),
                        height: Math.max(34, Math.min(56, Math.round(editPreview.h * 0.34))),
                        borderRadius: editPreview.shape === 'circle' ? '999px' : editPreview.shape === 'square' ? 10 : 8,
                        backgroundColor: '#ffffff',
                        border: '2px solid #cbd5e1',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
                      }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{TABLE_SHAPES[editShape].label}</p>
                      <p className="text-[11px] text-gray-500">{Number(editForm.capacity) || 0} personas</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">{editPreview.w}×{editPreview.h}</p>
                </div>
              </div>

              {editError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  {editSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditingTable(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Zoom controls (bottom-right) ────────────────────────────────── */}
        <div
          className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm p-1"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => zoom(1/1.25)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors text-sm font-bold">−</button>
          <span className="text-xs font-semibold text-gray-500 w-10 text-center">{pct}%</span>
          <button onClick={() => zoom(1.25)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors text-sm font-bold">+</button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button onClick={fitToScreen} title="Ajustar a pantalla" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M2.5 3.5a1 1 0 0 1 1-1H5a.5.5 0 0 0 0-1H3.5A2 2 0 0 0 1.5 3.5V5a.5.5 0 0 0 1 0V3.5ZM11 2a.5.5 0 0 0 0 1h1.5a1 1 0 0 1 1 1V5a.5.5 0 0 0 1 0V3.5A2 2 0 0 0 12.5 1.5H11ZM1.5 11a.5.5 0 0 0-1 0V12.5A2 2 0 0 0 2.5 14.5H4a.5.5 0 0 0 0-1H2.5a1 1 0 0 1-1-1V11ZM14 11a.5.5 0 0 0 1 0V12.5A2 2 0 0 0 13 14.5H11.5a.5.5 0 0 0 0 1H13A2 2 0 0 0 15 12.5V11Z" />
            </svg>
          </button>
        </div>

        {/* ── Legend (bottom-left) — only in operational view ─────────────── */}
        {showStatus && (
          <div
            className="absolute bottom-4 left-4 flex items-center gap-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm px-3 py-2"
            onPointerDown={e => e.stopPropagation()}
          >
            {Object.entries(STATUS).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.accent }} />
                <span className="text-xs text-gray-500 font-medium">{cfg.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
