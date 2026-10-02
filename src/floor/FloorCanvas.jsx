import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { GRID, clamp } from './geometry';
import { SvgDefs } from './Glyphs';

const MIN_K = 0.2;
const MAX_K = 3;

/**
 * The plan's viewport: an SVG you can pan (drag the floor, two fingers) and
 * zoom (wheel, pinch, buttons), that fits its content when it changes.
 * Things inside are drawn in world units by `children(k)`.
 *
 * ref → { fit(), toWorld(clientX, clientY), center(), zoomBy(f), el }
 */
const FloorCanvas = forwardRef(function FloorCanvas({
  bounds, fitKey, children, onBackground, overlay, controls = true, maxFit = 1.4, minFit = 0.2, padding = 56, insets, className = '', dropProps,
}, ref) {
  const wrap = useRef(null);
  const [view, setViewState] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  const touched = useRef(false); // the user moved the view: don't refit on resize
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  const setView = useCallback((v) => {
    const next = typeof v === 'function' ? v(viewRef.current) : v;
    viewRef.current = next;
    setViewState(next);
  }, []);

  const fit = useCallback(() => {
    const el = wrap.current; const b = boundsRef.current;
    if (!el) return;
    const W = el.clientWidth; const H = el.clientHeight;
    if (!W || !H) return;
    if (!b) { setView({ x: W / 2 - 300, y: H / 2 - 200, k: 1 }); return; }
    const pad = Math.min(padding, W * 0.08 + 16);
    const ins = insetsRef.current || {};
    const L = ins.left || 0; const R = ins.right || 0; const T = ins.top || 0; const B = ins.bottom || 0;
    const aw = W - L - R; const ah = H - T - B;
    const natural = Math.min((aw - pad * 2) / Math.max(b.w, 1), (ah - pad * 2) / Math.max(b.h, 1));
    const k = clamp(natural, Math.max(MIN_K, minFit), maxFit);
    // Too big to fit at a readable size: start from the top-left corner and let the user slide.
    const x = b.w * k > aw - pad * 2 ? L + pad / 2 - b.minX * k : L + aw / 2 - (b.minX + b.w / 2) * k;
    const y = b.h * k > ah - pad * 2 ? T + pad / 2 - b.minY * k : T + ah / 2 - (b.minY + b.h / 2) * k;
    setView({ k, x, y });
    touched.current = false;
  }, [padding, maxFit, minFit, setView]);

  const toWorld = useCallback((clientX, clientY) => {
    const r = wrap.current.getBoundingClientRect(); const v = viewRef.current;
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k };
  }, []);

  const zoomAt = useCallback((factor, sx, sy) => {
    const el = wrap.current; if (!el) return;
    const v = viewRef.current;
    const k = clamp(v.k * factor, MIN_K, MAX_K);
    const px = sx ?? el.clientWidth / 2; const py = sy ?? el.clientHeight / 2;
    setView({ k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k });
    touched.current = true;
  }, [setView]);

  useImperativeHandle(ref, () => ({
    fit, toWorld, zoomBy: (f) => zoomAt(f),
    center: () => { const el = wrap.current; const r = el.getBoundingClientRect(); return toWorld(r.left + el.clientWidth / 2, r.top + el.clientHeight / 2); },
    get el() { return wrap.current; },
    get k() { return viewRef.current.k; },
  }), [fit, toWorld, zoomAt]);

  // Fit when the content set changes (room, first load…) and on resize until the user moves.
  useLayoutEffect(() => { fit(); }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => { if (!touched.current) fit(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Wheel: mouse wheel / pinch zooms; trackpad two-finger scroll pans.
  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      // Trackpads send small pixel deltas (and sideways ones); mouse wheels send notches of ~100.
      const trackpadPan = !e.ctrlKey && e.deltaMode === 0
        && (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 || Math.abs(e.deltaY) < 50);
      if (trackpadPan) {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
        touched.current = true;
        return;
      }
      const factor = e.ctrlKey ? Math.exp(-e.deltaY * 0.01) : (e.deltaY < 0 ? 1.12 : 1 / 1.12);
      zoomAt(factor, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView, zoomAt]);

  // Background gestures: one pointer pans (a tap = onBackground), two pinch.
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    wrap.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const v = viewRef.current;
    if (pts.length === 1) gesture.current = { type: 'pan', sx: e.clientX, sy: e.clientY, v, moved: false };
    else if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v, moved: true };
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current; if (!g) return;
    if (g.type === 'pan') {
      const dx = e.clientX - g.sx; const dy = e.clientY - g.sy;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true; touched.current = true;
      setView({ ...g.v, x: g.v.x + dx, y: g.v.y + dy });
    } else if (g.type === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const r = wrap.current.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = clamp(g.v.k * (d / g.d), MIN_K, MAX_K);
      const mx = (a.x + b.x) / 2 - r.left; const my = (a.y + b.y) / 2 - r.top;
      const ox = g.mx - r.left; const oy = g.my - r.top;
      const wx = (ox - g.v.x) / g.v.k; const wy = (oy - g.v.y) / g.v.k;
      touched.current = true;
      setView({ k, x: mx - wx * k, y: my - wy * k });
    }
  };
  const onPointerUp = (e) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      if (g?.type === 'pan' && !g.moved) onBackground?.(e);
      gesture.current = null;
    } else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'pan', sx: p.x, sy: p.y, v: viewRef.current, moved: true };
    }
  };

  const dot = GRID * 2 * view.k;
  return (
    <div ref={wrap} className={`relative overflow-hidden select-none ${className}`}
      style={{
        touchAction: 'none',
        backgroundColor: '#fafafa',
        backgroundImage: dot > 9 ? 'radial-gradient(circle, #d4d4d8 1px, transparent 1.2px)' : 'none',
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${view.x % dot}px ${view.y % dot}px`,
      }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      {...dropProps}>
      <svg className="absolute inset-0 w-full h-full" style={{ fontFamily: 'inherit' }}>
        <SvgDefs />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{children(view.k)}</g>
      </svg>
      {overlay}
      {controls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur border border-gray-200 shadow-sm p-1"
          onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Alejar" onClick={() => zoomAt(1 / 1.25)} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700 text-lg leading-none">−</button>
          <span className="hidden sm:block w-11 text-center text-xs font-semibold tabular-nums text-gray-500">{Math.round(view.k * 100)}%</span>
          <button type="button" aria-label="Acercar" onClick={() => zoomAt(1.25)} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700 text-lg leading-none">+</button>
          <span className="w-px h-4 bg-gray-200 mx-0.5" />
          <button type="button" aria-label="Ver todo" title="Ver todo" onClick={fit} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4"><path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
    </div>
  );
});

export default FloorCanvas;
