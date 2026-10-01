import { useEffect, useState } from 'react';

// Trimmed versions of each logo URL (computed once per session).
const trimmed = new Map();

/**
 * Many logos are uploaded as a big square with the drawing small in the
 * middle. Cut away the empty (white or transparent) margin so the logo shows
 * as big as its tile allows. Falls back to the original image if the browser
 * can't read it.
 */
function trimLogo(url) {
  if (trimmed.has(url)) return trimmed.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const max = 256;
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            const empty = data[i + 3] < 16 || (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238);
            if (!empty) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
        }
        if (x1 < 0) return resolve(url);
        // Square crop around the drawing with a little air.
        const side = Math.max(x1 - x0, y1 - y0) * 1.12 + 2;
        if (side >= Math.max(w, h) * 0.9) return resolve(url); // already fills its image
        const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
        const out = document.createElement('canvas');
        out.width = 160; out.height = 160;
        const o = out.getContext('2d');
        o.fillStyle = '#fff';
        o.fillRect(0, 0, 160, 160);
        o.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, 160, 160);
        resolve(out.toDataURL('image/png'));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
  trimmed.set(url, p);
  return p;
}

/** The business logo in a tile (or its initial on the business colour). */
export default function BusinessLogo({ business, size = 32, className = '' }) {
  const url = business?.logoUrl || null;
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (url) trimLogo(url).then((s) => alive && setSrc(s));
    return () => { alive = false; };
  }, [url]);

  const style = { width: size, height: size };
  const radius = size >= 48 ? 'rounded-2xl' : size >= 36 ? 'rounded-xl' : 'rounded-lg';
  if (!url) {
    return (
      <span className={`${radius} shrink-0 flex items-center justify-center text-white font-semibold ${className}`}
        style={{ ...style, backgroundColor: business?.brandColor || '#111827', fontSize: Math.round(size * 0.42) }}>
        {(business?.name || 'V')[0].toUpperCase()}
      </span>
    );
  }
  return (
    <span className={`${radius} shrink-0 overflow-hidden bg-white ring-1 ring-gray-200 ${className}`} style={style}>
      {src && <img src={src} alt="" draggable={false} className="w-full h-full object-contain" />}
    </span>
  );
}
