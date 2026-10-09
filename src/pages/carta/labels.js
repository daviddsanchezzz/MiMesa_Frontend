import { eur as formatEur } from '../../lib/format.js';

export const ALLERGENS = [
  { key: 'gluten', label: 'Gluten', icon: '🌾' },
  { key: 'crustaceos', label: 'Crustáceos', icon: '🦐' },
  { key: 'huevos', label: 'Huevos', icon: '🥚' },
  { key: 'pescado', label: 'Pescado', icon: '🐟' },
  { key: 'cacahuetes', label: 'Cacahuetes', icon: '🥜' },
  { key: 'soja', label: 'Soja', icon: '🫘' },
  { key: 'lacteos', label: 'Lácteos', icon: '🥛' },
  { key: 'frutos_secos', label: 'Frutos secos', icon: '🌰' },
  { key: 'apio', label: 'Apio', icon: '🥬' },
  { key: 'mostaza', label: 'Mostaza', icon: '🟡' },
  { key: 'sesamo', label: 'Sésamo', icon: '⚪' },
  { key: 'sulfitos', label: 'Sulfitos', icon: '🍷' },
  { key: 'altramuces', label: 'Altramuces', icon: '🌼' },
  { key: 'moluscos', label: 'Moluscos', icon: '🐚' },
];

export const TAGS = [
  { key: 'recomendado', label: 'Recomendado', icon: '⭐' },
  { key: 'nuevo', label: 'Nuevo', icon: '✨' },
  { key: 'vegano', label: 'Vegano', icon: '🌱' },
  { key: 'vegetariano', label: 'Vegetariano', icon: '🥕' },
  { key: 'sin_gluten', label: 'Sin gluten', icon: '🚫' },
  { key: 'picante', label: 'Picante', icon: '🌶️' },
];

export const LANGUAGES = [
  ['es', 'Español'], ['en', 'English'], ['ca', 'Català'], ['eu', 'Euskara'], ['gl', 'Galego'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'], ['ru', 'Русский'], ['zh', '中文'], ['ja', '日本語'], ['ar', 'العربية'],
];
export const languageName = (code) => (LANGUAGES.find(([c]) => c === code) || [code, code.toUpperCase()])[1];

export const eur = (n) => (n === null || n === undefined ? 'Consultar' : formatEur(n));

/** The text in the main language, or the first one written. */
export const textOf = (texts, language) => (texts && (texts[language] || Object.values(texts)[0])) || '';

export const chipCls = (on) => `inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[13px] font-medium transition-colors ${on ? 'border-violet-600 bg-violet-50 text-violet-800 ring-1 ring-violet-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`;

const plain = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_');

/** "gluten, Lácteos; frutos secos" → ['gluten', 'lacteos', 'frutos_secos']: by key or by label, unknown words dropped. */
export function toKeys(text, list) {
  const out = [];
  for (const token of String(text ?? '').split(/[,;|/]+/)) {
    const t = plain(token);
    const found = t && list.find((x) => x.key === t || plain(x.label) === t);
    if (found && !out.includes(found.key)) out.push(found.key);
  }
  return out;
}
export { inputCls } from '../../ui/formStyles.js';
