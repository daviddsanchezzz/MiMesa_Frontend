/**
 * Reading customer lists exported from other tools (Excel, Booksy, Google
 * Contacts…): encoding, separator and which column is which.
 */

/** Text of a file: UTF-8 when valid, otherwise Windows-1252 (Excel in Spanish). */
export function decodeFile(buffer) {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** The separator used in the first lines: ; , or tab. */
export function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
  const count = (ch) => {
    let n = 0; let quoted = false;
    for (const c of sample) {
      if (c === '"') quoted = !quoted;
      else if (c === ch && !quoted) n += 1;
    }
    return n;
  };
  const [best, n] = [';', ',', '\t'].map((d) => [d, count(d)]).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? best : ',';
}

/** Rows of cells (RFC 4180: quotes, "" escapes, line breaks inside quotes). */
export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Header words by field, as other tools write them (Spanish and English).
const HEADERS = {
  name: ['nombre', 'nombre completo', 'cliente', 'name', 'full name', 'first name', 'given name', 'nombre y apellidos'],
  surname: ['apellidos', 'apellido', 'last name', 'surname', 'family name'],
  phone: ['telefono', 'movil', 'celular', 'phone', 'mobile', 'tel', 'tlf', 'telf', 'phone 1 - value', 'numero', 'whatsapp'],
  email: ['email', 'e-mail', 'correo', 'correo electronico', 'mail', 'e-mail 1 - value', 'email address'],
  notes: ['notas', 'nota', 'observaciones', 'comentarios', 'notes', 'note', 'comments'],
};

function fieldForHeader(h) {
  const f = fold(h);
  for (const [field, words] of Object.entries(HEADERS)) if (words.includes(f)) return field;
  for (const [field, words] of Object.entries(HEADERS)) if (words.some((w) => w.length > 3 && f.includes(w))) return field;
  return null;
}

const looksEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const looksPhone = (v) => /^[+()\d\s.-]{6,}$/.test(v) && (v.match(/\d/g) || []).length >= 6;

/**
 * Guesses which column is which. Returns { hasHeader, map: { name, surname, phone, email, notes } }
 * with column indexes (or -1).
 */
export function guessColumns(rows) {
  const map = { name: -1, surname: -1, phone: -1, email: -1, notes: -1 };
  const first = rows[0] || [];
  const byHeader = first.map(fieldForHeader);
  const hasHeader = byHeader.filter(Boolean).length >= 1 && !first.some(looksEmail);
  if (hasHeader) {
    byHeader.forEach((field, i) => { if (field && map[field] === -1) map[field] = i; });
  }
  // Fill the gaps from the content of the first rows
  const body = rows.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 20);
  const width = Math.max(0, ...rows.slice(0, 20).map((r) => r.length));
  const share = (i, test) => body.filter((r) => r[i] && test(r[i])).length / Math.max(1, body.filter((r) => r[i]).length);
  const used = () => new Set(Object.values(map).filter((i) => i >= 0));
  if (map.email === -1) for (let i = 0; i < width; i += 1) if (!used().has(i) && share(i, looksEmail) > 0.6) { map.email = i; break; }
  if (map.phone === -1) for (let i = 0; i < width; i += 1) if (!used().has(i) && share(i, looksPhone) > 0.6) { map.phone = i; break; }
  if (map.name === -1) {
    for (let i = 0; i < width; i += 1) {
      if (!used().has(i) && share(i, (v) => /[a-záéíóúñü]/i.test(v) && !looksEmail(v)) > 0.6) { map.name = i; break; }
    }
  }
  return { hasHeader, map };
}

/** Customers from rows and a column map (surname joined to the name). */
export function rowsToCustomers(rows, { hasHeader, map }) {
  const get = (r, i) => (i >= 0 ? String(r[i] || '').trim() : '');
  return rows.slice(hasHeader ? 1 : 0).map((r) => ({
    name: [get(r, map.name), get(r, map.surname)].filter(Boolean).join(' '),
    phone: get(r, map.phone),
    email: get(r, map.email),
    notes: get(r, map.notes),
  }));
}
