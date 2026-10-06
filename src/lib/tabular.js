/**
 * Reading the CSV/TSV a POS (TPV) exports, whatever its layout: split it into cells, find the
 * header, guess which column is which and turn the lines into rows. No knowledge of any
 * particular TPV lives here: the screen lets the person correct the guess.
 */

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** ';' (Excel in Spanish), tab or ',' — whichever separates the most in the first lines. */
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best = ';';
  let bestCount = -1;
  for (const d of [';', '\t', ',']) {
    const n = lines.reduce((s, l) => s + (l.split(d).length - 1), 0);
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

/** Text → array of rows of strings. Handles quotes ("a;b", "" inside), CRLF and a BOM. */
export function parseDelimited(text, delimiter = detectDelimiter(text)) {
  const src = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row.map((c) => c.trim()));
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row.map((c) => c.trim()));
  return rows;
}

/** "1.234,56 €" · "1234,5" · "1,234.56" · "12" → number; anything else → null. */
export function parseNumber(value) {
  let t = String(value ?? '').replace(/[€\s ]/g, '');
  if (!t || !/^-?[\d.,]+$/.test(t)) return null;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // the one that comes last is the decimal separator
    t = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // money has two decimals: "1,234" is a thousand, "12,5" a decimal
    t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (lastDot !== -1 && /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "05/10/2026" · "5-10-26" · "2026-10-05" · "05/10/2026 23:59" → "2026-10-05"; else null. */
export function parseDate(value) {
  const t = String(value ?? '').trim().split(/[ T]/)[0];
  let y; let m; let d;
  let match = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) [, y, m, d] = match; else if ((match = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) {
    [, d, m, y] = match;
    if (y.length === 2) y = `20${y}`;
  } else return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

export const FIELDS = [
  { key: 'date', label: 'Fecha', required: true, words: ['fecha', 'dia', 'date', 'jornada'] },
  { key: 'total', label: 'Total', words: ['total', 'importe total', 'venta total', 'ventas', 'facturacion', 'importe', 'total ventas'] },
  { key: 'cash', label: 'Efectivo', words: ['efectivo', 'metalico', 'cash'] },
  { key: 'card', label: 'Tarjeta', words: ['tarjeta', 'tarjetas', 'visa', 'datafono', 'card'] },
  { key: 'bizum', label: 'Bizum', words: ['bizum'] },
  { key: 'other', label: 'Otros', words: ['otros', 'otro', 'transferencia', 'vales'] },
  { key: 'tips', label: 'Propinas', words: ['propina', 'propinas', 'tips'] },
  { key: 'tickets', label: 'Tickets', words: ['tickets', 'ticket', 'n tickets', 'num tickets', 'cuentas', 'operaciones', 'facturas'] },
  { key: 'covers', label: 'Comensales', words: ['comensales', 'cubiertos', 'personas', 'pax', 'covers'] },
];

/** { fieldKey: columnIndex } guessed from the header names (each column used at most once). */
export function guessMapping(headers, fields = FIELDS) {
  const norm = headers.map(strip);
  const used = new Set();
  const out = {};
  for (const f of fields) {
    // exact name first, then "contains"
    let idx = norm.findIndex((h, i) => !used.has(i) && f.words.includes(h));
    if (idx === -1) idx = norm.findIndex((h, i) => !used.has(i) && h && f.words.some((w) => h.includes(w)));
    if (idx !== -1) { out[f.key] = idx; used.add(idx); }
  }
  return out;
}

/** The header is the first line that names a date and something else (reports start with titles). */
export function findHeaderRow(table, fields = FIELDS, anchor = 'date') {
  for (let i = 0; i < Math.min(table.length, 25); i++) {
    const m = guessMapping(table[i], fields);
    if (m[anchor] !== undefined && Object.keys(m).length >= 2) return i;
  }
  return 0;
}

/** The articles of a POS, for the menu. */
export const MENU_FIELDS = [
  { key: 'name', label: 'Nombre del plato', required: true, words: ['nombre', 'articulo', 'descripcion', 'producto', 'plato', 'denominacion'] },
  { key: 'price', label: 'Precio', words: ['precio', 'pvp', 'tarifa', 'precio venta', 'importe', 'p.v.p.'] },
  { key: 'description', label: 'Descripción', words: ['descripcion', 'detalle', 'ingredientes', 'composicion', 'texto'] },
  { key: 'category', label: 'Categoría', words: ['familia', 'categoria', 'grupo', 'seccion', 'subfamilia', 'tipo'] },
  { key: 'externalId', label: 'Código', words: ['codigo', 'cod', 'referencia', 'ref', 'id', 'cod. articulo', 'sku'] },
];

/** Lines → { externalId, category, name, price } for the menu import; lines without a name are skipped. */
export function buildMenuRows(table, headerRow, mapping) {
  const rows = [];
  let skipped = 0;
  for (const cells of table.slice(headerRow + 1)) {
    const name = mapping.name === undefined ? '' : String(cells[mapping.name] ?? '').trim();
    if (!name) { skipped++; continue; }
    const row = { name };
    if (mapping.category !== undefined) row.category = String(cells[mapping.category] ?? '').trim();
    if (mapping.externalId !== undefined) row.externalId = String(cells[mapping.externalId] ?? '').trim();
    if (mapping.description !== undefined) row.description = String(cells[mapping.description] ?? '').trim();
    if (mapping.price !== undefined) {
      const n = parseNumber(cells[mapping.price]);
      if (n !== null) row.price = n;
    }
    rows.push(row);
  }
  return { rows, skipped };
}

/**
 * Lines → rows of { date, total, cash, … } for the backend. Lines without a valid date (subtotals,
 * footers) are skipped and counted.
 */
export function buildRows(table, headerRow, mapping) {
  const rows = [];
  let skipped = 0;
  for (const cells of table.slice(headerRow + 1)) {
    const date = mapping.date === undefined ? null : parseDate(cells[mapping.date]);
    if (!date) { skipped++; continue; }
    const row = { date };
    for (const f of FIELDS) {
      if (f.key === 'date' || mapping[f.key] === undefined) continue;
      const n = parseNumber(cells[mapping[f.key]]);
      if (n !== null) row[f.key] = ['tickets', 'covers'].includes(f.key) ? Math.round(n) : n;
    }
    rows.push(row);
  }
  return { rows, skipped };
}

/** Reads a file as text; Spanish TPVs often save as Windows-1252, which UTF-8 would garble. */
export async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}
