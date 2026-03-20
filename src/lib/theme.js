const DEFAULT_BRAND = '#4F46E5';

function clamp(n, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input) {
  const raw = (input || '').trim().replace('#', '');
  if (!raw) return DEFAULT_BRAND;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw}`.toUpperCase();
  }
  return DEFAULT_BRAND;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function mix(hexA, hexB, weightB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex({
    r: Math.round(a.r * (1 - w) + b.r * w),
    g: Math.round(a.g * (1 - w) + b.g * w),
    b: Math.round(a.b * (1 - w) + b.b * w),
  });
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const norm = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

export function buildBrandTheme(baseColor) {
  const base = normalizeHex(baseColor);
  const vars = {
    '--brand-50': mix(base, '#FFFFFF', 0.92),
    '--brand-100': mix(base, '#FFFFFF', 0.84),
    '--brand-200': mix(base, '#FFFFFF', 0.72),
    '--brand-300': mix(base, '#FFFFFF', 0.56),
    '--brand-400': mix(base, '#FFFFFF', 0.32),
    '--brand-500': base,
    '--brand-600': mix(base, '#000000', 0.12),
    '--brand-700': mix(base, '#000000', 0.24),
    '--brand-800': mix(base, '#000000', 0.36),
    '--brand-900': mix(base, '#000000', 0.48),
    '--brand-contrast': luminance(base) > 0.5 ? '#111827' : '#FFFFFF',
  };
  return vars;
}

export function applyBrandTheme(baseColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = buildBrandTheme(baseColor);
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
}

export { DEFAULT_BRAND };
