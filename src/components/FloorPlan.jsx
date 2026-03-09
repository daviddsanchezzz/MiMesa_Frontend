import { useState, useRef, useCallback } from 'react';
import api from '../services/api';

// ─── Config ────────────────────────────────────────────────────────────────
const GRID     = 20;
const CANVAS_H = 560;

const snap  = v => Math.round(v / GRID) * GRID;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function tableSize(capacity) {
  if (capacity <= 2) return [90,  80];
  if (capacity <= 4) return [110, 80];
  if (capacity <= 6) return [130, 84];
  return [150, 88];
}

function autoArrange(tables, canvasW = 900) {
  const GAP = 24;
  let x = 40, y = 40, rowH = 0;
  return tables.map(t => {
    const [w, h] = tableSize(t.capacity);
    if (x + w > canvasW - 40) { x = 40; y += rowH + GAP; rowH = 0; }
    const pos = { x, y };
    x += w + GAP;
    rowH = Math.max(rowH, h);
    return { ...t, ...pos };
  });
}

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS = {
  free:     { label: 'Libre',     top: '#34d399', bg: '#f0fdf4', border: '#6ee7b7', text: '#065f46' },
  reserved: { label: 'Reservada', top: '#fbbf24', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  occupied: { label: 'Ocupada',   top: '#fb7185', bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
};

const NEXT_STATUS = {
  free:     [{ s: 'reserved', label: 'Marcar reservada' }, { s: 'occupied', label: 'Marcar ocupada' }],
  reserved: [{ s: 'occupied', label: 'Sentar clientes'  }, { s: 'free',     label: 'Liberar'         }],
  occupied: [{ s: 'free',     label: 'Liberar mesa'     }],
};

// ─── TableNode ──────────────────────────────────────────────────────────────
function TableNode({ table, isActive, isDragging, editMode, onPointerDown, onClick }) {
  const [w, h] = tableSize(table.capacity);
  const st = STATUS[table.status];

  let cursor = 'default';
  if (editMode)   cursor = isDragging ? 'grabbing' : 'grab';
  else if (!editMode) cursor = 'pointer';

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: table.x, top: table.y,
        width: w, height: h,
        backgroundColor: st.bg,
        border: `1.5px solid ${st.border}`,
        borderTop: `3px solid ${st.top}`,
        borderRadius: 12,
        boxShadow: isDragging
          ? '0 12px 28px rgba(0,0,0,0.20)'
          : isActive
          ? '0 4px 16px rgba(99,102,241,0.30)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        cursor,
        zIndex: isDragging ? 100 : isActive ? 50 : 10,
        transition: isDragging ? 'none' : 'box-shadow 0.15s',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '8px 10px',
        outline: isActive ? '2px solid #6366f1' : editMode ? '1.5px dashed #a5b4fc' : 'none',
        outlineOffset: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {table.name}
        </span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: st.top, flexShrink: 0, marginTop: 2 }} />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill={st.text} style={{ width: 10, height: 10, flexShrink: 0 }}>
            <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 10a.5.5 0 0 0 .5-.5 4 4 0 0 0-8 0 .5.5 0 0 0 .5.5h7Z" />
          </svg>
          <span style={{ fontSize: 11, color: st.text, fontWeight: 500 }}>{table.capacity} px</span>
        </div>
        <span style={{ fontSize: 10, color: st.text, opacity: 0.75 }}>{st.label}</span>
      </div>

      {/* Drag handle icon visible only in edit mode */}
      {editMode && !isDragging && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          color: '#a5b4fc', pointerEvents: 'none',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" style={{ width: 10, height: 10 }}>
            <path d="M5 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Status popup ────────────────────────────────────────────────────────────
function StatusPopup({ table, onStatusChange, onClose }) {
  const [w] = tableSize(table.capacity);
  const [h] = tableSize(table.capacity);
  return (
    <div
      style={{
        position: 'absolute',
        left: table.x,
        top: table.y + h + 10,
        width: Math.max(w, 168),
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        zIndex: 200,
        padding: 8,
      }}
      onClick={e => e.stopPropagation()}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px 6px' }}>
        {table.name}
      </p>
      {NEXT_STATUS[table.status]?.map(({ s, label }) => {
        const st = STATUS[s];
        return (
          <button
            key={s}
            onClick={() => { onStatusChange(table._id, s); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, color: st.text,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = st.bg; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: st.top, flexShrink: 0 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function FloorPlan({ tables, rooms, onStatusChange, onRefresh, fullHeight = false }) {
  const canvasRef = useRef(null);
  const dragRef   = useRef(null);
  const posRef    = useRef({});

  const [positions,  _setPositions] = useState({});
  const [activeId,   setActiveId]   = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [editMode,   setEditMode]   = useState(false);

  // Default room: first room, or '__none__' if no rooms defined
  const defaultRoom = rooms.length > 0 ? rooms[0]._id : '__none__';
  const [roomFilter, setRoomFilter] = useState(defaultRoom);

  // Keep posRef in sync
  const setPositions = useCallback((updater) => {
    _setPositions(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      posRef.current = next;
      return next;
    });
  }, []);

  const getPos = useCallback((table) => {
    if (posRef.current[table._id]) return posRef.current[table._id];
    if (table.x != null && table.y != null) return { x: table.x, y: table.y };
    return null;
  }, []);

  // ── Filter: only tables belonging to the selected room ──────────────────
  // NOTE: each room has its own independent canvas — no cross-room mixing
  const filtered = roomFilter === '__none__'
    ? tables.filter(t => !t.roomId)
    : tables.filter(t => t.roomId?._id === roomFilter);

  const withPos  = filtered.map(t => { const p = getPos(t); return p ? { ...t, ...p } : { ...t, x: null, y: null }; });
  const noPos    = withPos.filter(t => t.x === null);
  const hasPos   = withPos.filter(t => t.x !== null);
  const arranged = [...hasPos, ...(noPos.length ? autoArrange(noPos) : [])];

  // ── Pointer events (only active in edit mode) ──────────────────────────
  const onTablePointerDown = useCallback((e, table) => {
    if (!editMode || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    const pos = getPos(table) || { x: 0, y: 0 };
    dragRef.current = {
      id:      table._id,
      offsetX: e.clientX - canvas.left - pos.x,
      offsetY: e.clientY - canvas.top  - pos.y,
      moved:   false,
    };
    canvasRef.current.setPointerCapture(e.pointerId);
    setDraggingId(table._id);
    setActiveId(null);
  }, [editMode, getPos]);

  const onTableClick = useCallback((e, table) => {
    // In view mode a direct click (no drag started) opens status popup
    if (editMode) return; // edit mode uses pointer events for drag
    e.stopPropagation();
    setActiveId(prev => prev === table._id ? null : table._id);
  }, [editMode]);

  const onCanvasPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const [w, h] = tableSize(arranged.find(t => t._id === dragRef.current.id)?.capacity || 2);
    const x = snap(clamp(e.clientX - canvas.left - dragRef.current.offsetX, 0, canvas.width - w));
    const y = snap(clamp(e.clientY - canvas.top  - dragRef.current.offsetY, 0, canvas.height - h));
    setPositions(p => ({ ...p, [dragRef.current.id]: { x, y } }));
    dragRef.current.moved = true;
  }, [arranged, setPositions]);

  const onCanvasPointerUp = useCallback(async () => {
    if (!dragRef.current) return;
    const { id, moved } = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    if (moved) {
      const pos = posRef.current[id];
      if (pos) api.put(`/tables/${id}`, pos).catch(() => {});
    }
    // In edit mode a non-moved click does nothing (no popup — avoid accidental changes)
  }, []);

  const handleAutoArrange = async () => {
    const rearranged = autoArrange(filtered);
    const newPos = Object.fromEntries(rearranged.map(t => [t._id, { x: t.x, y: t.y }]));
    setPositions(p => ({ ...p, ...newPos }));
    await Promise.all(rearranged.map(t => api.put(`/tables/${t._id}`, { x: t.x, y: t.y }).catch(() => {})));
    onRefresh();
  };

  // When switching rooms, close popup and exit edit mode
  const changeRoom = (id) => {
    setRoomFilter(id);
    setActiveId(null);
    setEditMode(false);
  };

  const roomTabs = [
    ...rooms.map(r => ({ id: r._id, label: r.name, count: tables.filter(t => t.roomId?._id === r._id).length })),
    { id: '__none__', label: 'Sin sala', count: tables.filter(t => !t.roomId).length },
  ];

  return (
    <div className={fullHeight ? 'flex flex-col h-full' : 'space-y-3'}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between gap-3 ${fullHeight ? 'px-4 py-2 shrink-0' : ''}`}>
        {/* Room tabs — scrollable on mobile */}
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
                  roomFilter === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={handleAutoArrange}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3Zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3Zm6-6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H9Zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H9Z" clipRule="evenodd" />
              </svg>
              Auto-organizar
            </button>
          )}

          {/* Edit mode toggle */}
          <button
            onClick={() => { setEditMode(m => !m); setActiveId(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              editMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {editMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                Guardar disposición
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 7.5a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5h-1ZM3.5 10a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 3.5 10Zm1.25 1.75a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" />
                </svg>
                Editar disposición
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 mx-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#6366f1" className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-indigo-700 font-medium">
            Modo edición activo — <span className="font-semibold">arrastra las mesas</span> para reposicionarlas. Los cambios de estado están desactivados.
          </p>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`relative w-full overflow-hidden transition-all ${
          fullHeight ? 'flex-1 min-h-0' : 'rounded-2xl'
        } ${editMode ? 'border-2 border-indigo-300' : 'border border-gray-200'}`}
        style={{
          height: fullHeight ? undefined : CANVAS_H,
          backgroundImage:
            editMode
              ? 'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: `${GRID * 2}px ${GRID * 2}px`,
          backgroundColor: editMode ? '#fafafe' : '#f8fafc',
          cursor: draggingId ? 'grabbing' : 'default',
          touchAction: 'none',
        }}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onClick={() => setActiveId(null)}
      >
        {arranged.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 select-none">
            <div className="text-6xl mb-3">🪑</div>
            <p className="text-sm font-medium">No hay mesas en esta sala</p>
          </div>
        ) : (
          arranged.map(table => (
            <TableNode
              key={table._id}
              table={table}
              isDragging={draggingId === table._id}
              isActive={activeId === table._id}
              editMode={editMode}
              onPointerDown={e => onTablePointerDown(e, table)}
              onClick={e => onTableClick(e, table)}
            />
          ))
        )}

        {/* Status popup — only in view mode */}
        {!editMode && activeId && (() => {
          const t = arranged.find(t => t._id === activeId);
          if (!t) return null;
          return <StatusPopup table={t} onStatusChange={onStatusChange} onClose={() => setActiveId(null)} />;
        })()}

        {/* Edit mode overlay hint when empty drag */}
        {editMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600/80 text-white text-[11px] font-medium px-3 py-1.5 rounded-full pointer-events-none select-none backdrop-blur-sm">
            Arrastra las mesas para reposicionarlas
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={`flex items-center justify-end gap-5 flex-wrap ${fullHeight ? 'px-4 py-2 shrink-0' : ''}`}>
        {Object.entries(STATUS).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.top }} />
            <span className="text-xs text-gray-500">{cfg.label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-300 ml-2">
          {editMode ? 'Modo edición — arrastra para mover' : 'Click en una mesa para cambiar estado'}
        </span>
      </div>
    </div>
  );
}
