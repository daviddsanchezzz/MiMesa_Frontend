/**
 * Floor plan geometry, shared by the editor (Mesas) and the live view
 * (Reservas → Plano). World units are "points" (≈ 1 cm = 1 pt at 100 %).
 *
 * A table is stored with x/y = top-left corner of its axis-aligned bounding
 * box (the table surface, without chairs) — the same meaning the old plan used,
 * so existing layouts keep their place. Internally we work with the centre.
 */

export const GRID = 20;
export const snap = (v, step = GRID / 2) => Math.round(v / step) * step;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const SHAPES = {
  circle: { label: 'Redonda' },
  square: { label: 'Cuadrada' },
  rect: { label: 'Rectangular' },
  booth: { label: 'Banco corrido' },
};

export function shapeOf(table) {
  if (SHAPES[table?.shape]) return table.shape;
  return (Number(table?.capacity) || 2) <= 4 ? 'square' : 'rect';
}

export const angleOf = (t) => {
  const n = Number(t?.angle) || 0;
  return ((Math.round(n) % 360) + 360) % 360;
};

/** Size of the table surface (unrotated, long side horizontal). */
export function tableSize(capacity, shape) {
  const cap = Math.max(1, Number(capacity) || 2);
  if (shape === 'circle') {
    const d = cap <= 2 ? 68 : cap <= 4 ? 84 : cap <= 6 ? 100 : cap <= 8 ? 116 : 132;
    return { w: d, h: d };
  }
  if (shape === 'square') {
    const s = cap <= 2 ? 64 : cap <= 4 ? 80 : 96;
    return { w: s, h: s };
  }
  const perSide = Math.ceil((cap >= 10 ? cap - 2 : cap) / 2);
  const w = Math.max(shape === 'booth' ? 104 : 112, perSide * 42 + 26);
  return { w, h: shape === 'booth' ? 64 : 72 };
}

export const CHAIR = { w: 22, h: 12, gap: 7 };

/**
 * Seats around a table, in table-local coordinates (origin = table centre,
 * unrotated). Chairs are { kind:'chair', x, y, rot }; booths return benches
 * { kind:'bench', x, y, w, h }.
 */
export function seatsFor(capacity, shape, w, h) {
  const cap = Math.min(Math.max(1, Number(capacity) || 2), 16);
  const out = [];
  const off = CHAIR.gap + CHAIR.h / 2;
  if (shape === 'circle') {
    const r = w / 2 + off;
    for (let i = 0; i < cap; i += 1) {
      const a = (i / cap) * Math.PI * 2 - Math.PI / 2;
      out.push({ kind: 'chair', x: Math.cos(a) * r, y: Math.sin(a) * r, rot: (a * 180) / Math.PI + 90 });
    }
    return out;
  }
  if (shape === 'booth') {
    const bh = 14;
    out.push({ kind: 'bench', x: 0, y: -h / 2 - 5 - bh / 2, w: w - 4, h: bh });
    if (cap > 2) out.push({ kind: 'bench', x: 0, y: h / 2 + 5 + bh / 2, w: w - 4, h: bh });
    return out;
  }
  let top; let bottom; let left = 0; let right = 0;
  if (shape === 'square') {
    if (cap <= 2) { top = 1; bottom = 1; }
    else if (cap <= 4) { top = 1; bottom = 1; left = 1; right = 1; if (cap === 3) right = 0; }
    else { top = 2; bottom = 2; left = Math.ceil((cap - 4) / 2); right = Math.floor((cap - 4) / 2); }
  } else {
    const ends = cap >= 10 ? 2 : 0;
    const sides = cap - ends;
    top = Math.ceil(sides / 2); bottom = Math.floor(sides / 2);
    left = ends ? 1 : 0; right = ends ? 1 : 0;
  }
  const row = (n, y, rot) => {
    const span = w - 24;
    for (let i = 0; i < n; i += 1) out.push({ kind: 'chair', x: n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), y, rot });
  };
  const col = (n, x, rot) => {
    const span = h - 24;
    for (let i = 0; i < n; i += 1) out.push({ kind: 'chair', x, y: n === 1 ? 0 : -span / 2 + (span * i) / (n - 1), rot });
  };
  row(top, -h / 2 - off, 0);
  row(bottom, h / 2 + off, 180);
  col(left, -w / 2 - off, 270);
  col(right, w / 2 + off, 90);
  return out;
}

/** Half extents of a w×h box rotated by `angle` degrees. */
export function rotatedHalf(w, h, angle) {
  const a = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(a)); const s = Math.abs(Math.sin(a));
  return { hx: (w * c + h * s) / 2, hy: (w * s + h * c) / 2 };
}

/** Table → { id, cx, cy, w, h, angle, shape } (centre based). */
export function placeTable(t) {
  const shape = shapeOf(t);
  const { w, h } = tableSize(t.capacity, shape);
  const angle = angleOf(t);
  if (t.x == null || t.y == null) return { id: t._id, shape, w, h, angle, cx: null, cy: null };
  const { hx, hy } = rotatedHalf(w, h, angle);
  return { id: t._id, shape, w, h, angle, cx: Number(t.x) + hx, cy: Number(t.y) + hy };
}

/** Centre → stored x/y (top-left of the rotated bounding box). */
export function storedXY(cx, cy, w, h, angle) {
  const { hx, hy } = rotatedHalf(w, h, angle);
  return { x: Math.round(cx - hx), y: Math.round(cy - hy) };
}

/** Room elements: what can be drawn besides tables. */
export const ELEMENTS = {
  bar:      { label: 'Barra',    w: 240, h: 56 },
  wall:     { label: 'Pared',    w: 240, h: 10 },
  window:   { label: 'Ventana',  w: 160, h: 10 },
  entrance: { label: 'Entrada',  w: 100, h: 14 },
  kitchen:  { label: 'Cocina',   w: 200, h: 120 },
  wc:       { label: 'Aseos',    w: 110, h: 90 },
  zone:     { label: 'Zona',     w: 320, h: 200 },
  plant:    { label: 'Planta',   w: 36,  h: 36 },
  column:   { label: 'Columna',  w: 30,  h: 30 },
  label:    { label: 'Texto',    w: 120, h: 28 },
};

export function placeElement(e) {
  const { hx, hy } = rotatedHalf(e.w, e.h, e.angle || 0);
  return { cx: e.x + hx, cy: e.y + hy };
}
export function elementXY(cx, cy, w, h, angle) {
  const { hx, hy } = rotatedHalf(w, h, angle || 0);
  return { x: Math.round(cx - hx), y: Math.round(cy - hy) };
}

/** Bounding box (with chairs) of placed tables and elements. */
export function boundsOf(tables, elements = []) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const add = (cx, cy, hx, hy) => {
    minX = Math.min(minX, cx - hx); minY = Math.min(minY, cy - hy);
    maxX = Math.max(maxX, cx + hx); maxY = Math.max(maxY, cy + hy);
  };
  for (const t of tables) {
    if (t.cx == null) continue;
    const pad = CHAIR.gap + CHAIR.h + 2;
    const { hx, hy } = rotatedHalf(t.w + pad * 2, t.h + pad * 2, t.angle);
    add(t.cx, t.cy, hx, hy);
  }
  for (const e of elements) {
    const { cx, cy } = placeElement(e);
    const { hx, hy } = rotatedHalf(e.w, e.h, e.angle || 0);
    add(cx, cy, hx, hy);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** A free spot near (cx, cy) for a new w×h thing, scanning outward on the grid. */
export function freeSpot(placed, w, h, cx, cy) {
  const pad = CHAIR.gap + CHAIR.h + 14;
  const boxes = placed.filter((p) => p.cx != null).map((p) => {
    const { hx, hy } = rotatedHalf((p.w || 0) + pad * 2, (p.h || 0) + pad * 2, p.angle || 0);
    return { x0: p.cx - hx, y0: p.cy - hy, x1: p.cx + hx, y1: p.cy + hy };
  });
  const fits = (x, y) => boxes.every((b) => x + w / 2 < b.x0 || x - w / 2 > b.x1 || y + h / 2 < b.y0 || y - h / 2 > b.y1);
  const step = GRID * 2;
  for (let r = 0; r < 40; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = snap(cx + dx * step); const y = snap(cy + dy * step);
        if (fits(x, y)) return { cx: x, cy: y };
      }
    }
  }
  return { cx: snap(cx), cy: snap(cy) };
}

/** Lay out tables that were never placed, in rows after the placed ones. */
export function arrangeUnplaced(placed) {
  const done = placed.filter((p) => p.cx != null);
  const todo = placed.filter((p) => p.cx == null);
  if (!todo.length) return placed;
  const b = boundsOf(done);
  let x = 60; let y = b ? b.maxY + 70 : 60; let rowH = 0;
  const pad = CHAIR.gap + CHAIR.h + 30;
  const maxW = Math.max(900, b ? b.w : 0);
  const out = new Map();
  for (const t of todo) {
    const tw = t.w + pad * 2; const th = t.h + pad * 2;
    if (x + tw > maxW + 60 && x > 60) { x = 60; y += rowH; rowH = 0; }
    out.set(t.id, { ...t, cx: x + tw / 2, cy: y + th / 2 });
    x += tw; rowH = Math.max(rowH, th);
  }
  return placed.map((p) => out.get(p.id) || p);
}

/** «Mesa 7» after «Mesa 6»; keeps the prefix most tables use ("M", "T", "Mesa "). */
export function nextTableName(tables) {
  const counts = {}; let max = 0;
  for (const t of tables) {
    const m = String(t.name || '').match(/^(.*?)(\d+)$/);
    if (!m) continue;
    counts[m[1]] = (counts[m[1]] || 0) + 1;
    max = Math.max(max, Number(m[2]));
  }
  const prefix = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Mesa ';
  return `${prefix}${max + 1}`;
}

export const roomIdOf = (t) => (t.roomId?._id || t.roomId || null);
