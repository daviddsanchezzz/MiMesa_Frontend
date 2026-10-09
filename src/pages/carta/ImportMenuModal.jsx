import { useMemo, useRef, useState } from 'react';
import { notify } from '../../lib/notify';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { MENU_FIELDS, buildMenuRows, findHeaderRow, guessMapping, parseDelimited, readTextFile } from '../../lib/tabular';
import { ALLERGENS, TAGS, eur, toKeys } from './labels';
import { selectCls } from '../../ui/form';
import { ErrorBanner } from '../../ui/feedback';

const SAVED = 'menu-import:columns';
const readSaved = () => { try { return JSON.parse(window.localStorage.getItem(SAVED) || '{}'); } catch { return {}; } };
const writeSaved = (v) => { try { window.localStorage.setItem(SAVED, JSON.stringify(v)); } catch { /* ignore */ } };
const BADGE = {
  new: ['Nuevo', 'bg-emerald-50 text-emerald-700'],
  price: ['Cambia el precio', 'bg-amber-50 text-amber-700'],
  link: ['Se une al TPV', 'bg-sky-50 text-sky-700'],
  same: ['Igual', 'bg-gray-100 text-gray-500'],
};

/** Articles of the POS (CSV) → dishes: price and existence come from the TPV, the rest stays yours. */
export default function ImportMenuModal({ onClose, onDone }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState(null);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState({});
  const [retireMissing, setRetireMissing] = useState(false);
  // Where the prices come from is asked every time, never assumed: from the till they are locked here,
  // from anywhere else (a website, a PDF…) they stay editable. null = not answered yet.
  const [fromTill, setFromTill] = useState(null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const headers = table ? table[headerRow] || [] : [];
  const built = useMemo(() => (table ? buildMenuRows(table, headerRow, mapping) : { rows: [], skipped: 0 }), [table, headerRow, mapping]);
  const ready = mapping.name !== undefined && built.rows.length > 0 && fromTill !== null;

  async function pick(file) {
    if (!file) return;
    setError('');
    try {
      const rows = parseDelimited(await readTextFile(file));
      if (rows.length < 2) throw new Error('El archivo está vacío');
      const h = findHeaderRow(rows, MENU_FIELDS, 'name');
      const guess = guessMapping(rows[h], MENU_FIELDS);
      const saved = readSaved();
      const names = rows[h].map((x) => x.trim().toLowerCase());
      for (const f of MENU_FIELDS) {
        const idx = saved[f.key] ? names.indexOf(saved[f.key]) : -1;
        if (idx !== -1) guess[f.key] = idx;
      }
      setFileName(file.name);
      setTable(rows);
      setHeaderRow(h);
      setMapping(guess);
    } catch (err) {
      setTable(null);
      setError(err.message || 'No se ha podido leer el archivo');
    }
  }

  const setField = (key, value) => setMapping((m) => {
    const next = { ...m };
    if (value === '') delete next[key]; else next[key] = Number(value);
    return next;
  });

  async function send(apply) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/menu/import', { rows: built.rows.map((r) => ({ ...r, allergens: toKeys(r.allergens, ALLERGENS), tags: toKeys(r.tags, TAGS) })), apply, retireMissing, priceSource: fromTill ? 'tpv' : 'manual' });
      setPlan(data);
      if (apply) {
        writeSaved(Object.fromEntries(Object.entries(mapping).map(([k, i]) => [k, (headers[i] || '').trim().toLowerCase()])));
        notify.success('Carta actualizada');
        onDone?.();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido importar');
    } finally {
      setBusy(false);
    }
  }

  const s = plan?.summary;
  const changes = s ? s.new + s.price + s.link + (s.fill || 0) : 0;
  const footer = (
    <div className="space-y-2">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="flex gap-2">
        <button type="button" onClick={() => (plan ? setPlan(null) : onClose())} className="h-11 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">{plan ? 'Atrás' : 'Cancelar'}</button>
        {table && !plan && (
          <button type="button" disabled={!ready || busy} onClick={() => send(false)} className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40">
            {busy ? 'Revisando…' : fromTill === null && mapping.name !== undefined && built.rows.length > 0 ? 'Elige de dónde vienen los precios' : `Revisar ${built.rows.length} platos`}
          </button>
        )}
        {plan && (
          <button type="button" disabled={busy || (!changes && !(retireMissing && s.missing))} onClick={() => send(true)} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">
            {busy ? 'Importando…' : changes ? 'Aplicar cambios' : 'No hay nada que cambiar'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal title="Importar platos" subtitle="Listado de platos con su precio" onClose={() => !busy && onClose()} size="lg" footer={footer}>
      {!table && (
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-400 px-4 py-10 text-center transition-colors">
            <span className="block text-[15px] font-semibold text-gray-900">Elegir archivo</span>
            <span className="block text-sm text-gray-500 mt-1">CSV, TXT o TSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="text-[13px] text-gray-500">
            Sube el listado de tus platos, del TPV o de donde lo tengas (si sale en Excel: <b>Archivo → Guardar como → CSV</b>). Una importación nunca cambia el nombre, la descripción, los alérgenos ni las traducciones de un plato que ya tienes; solo el precio. Con una columna de descripción, se rellena en los platos nuevos.
          </p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {table && !plan && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600"><b className="text-gray-900">{fileName}</b> · {built.rows.length} platos encontrados</p>
          <div>
            <p className="text-xs font-semibold text-gray-500">¿Qué columna de tu archivo es cada cosa?</p>
            <p className="text-xs text-gray-400 mt-0.5">Ya está adivinado por los títulos de tu archivo; cambia lo que no sea correcto. Cada desplegable lista las columnas de tu archivo.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {MENU_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-[11px] font-medium text-gray-500 mb-1">{f.label}{f.required && ' *'}{f.key === 'externalId' && ' (opcional)'}</span>
                <select className={selectCls} value={mapping[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                  <option value="">— no está —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 mb-2">¿De dónde vienen estos precios? *</legend>
            <div className="space-y-2">
              {[[true, 'De mi TPV', 'Se bloquean aquí: para cambiar un precio lo cambias en el TPV y vuelves a importar.'],
                [false, 'De otro sitio (web, PDF, carta en papel…)', 'Quedan editables aquí.']].map(([value, label, hint]) => (
                <label key={label} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${fromTill === value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="price-source" className="mt-1 accent-violet-600" checked={fromTill === value} onChange={() => setFromTill(value)} />
                  <span><span className="block text-sm font-semibold text-gray-900">{label}</span><span className="block text-xs text-gray-500 mt-0.5">{hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {fromTill === true && mapping.externalId === undefined && <p className="text-xs text-gray-500">Sin columna de código, los platos se reconocen por su nombre. Con código, un cambio de nombre en el TPV no duplica el plato.</p>}
          {built.rows.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
              {built.rows.slice(0, 3).map((r, i) => (
                <li key={i} className="px-3 py-2 flex justify-between gap-3">
                  <span className="min-w-0 truncate text-gray-800">{r.name}{r.category && <span className="text-gray-400"> · {r.category}{r.subcategory ? ` › ${r.subcategory}` : ''}</span>}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{r.price !== undefined ? eur(r.price) : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {s.new > 0 && <span><b className="text-gray-900">{s.new}</b> nuevos · </span>}
            {s.price > 0 && <span><b className="text-gray-900">{s.price}</b> cambian de precio · </span>}
            {s.link > 0 && <span><b className="text-gray-900">{s.link}</b> se unen al TPV · </span>}
            {s.fill > 0 && <span><b className="text-gray-900">{s.fill}</b> se completan · </span>}
            {s.same > 0 && <span>{s.same} iguales</span>}
            {s.newCategories > 0 && <span> · {s.newCategories} categorías nuevas</span>}
            {s.newSubcategories > 0 && <span> · {s.newSubcategories} subcategorías nuevas</span>}
          </p>
          {s.fill > 0 && <p className="text-xs text-gray-500">«Se completan»: platos que ya tienes y a los que les faltaban alérgenos, etiquetas o descripción. Lo que ya habías escrito no se toca.</p>}
          {s.link > 0 && <p className="text-xs text-gray-500">«Se une al TPV»: ya estaba en tu carta; desde ahora su precio lo marca el TPV (su texto, alérgenos y traducciones no cambian).</p>}
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 max-h-72 overflow-y-auto">
            {plan.plan.filter((p) => p.status !== 'same' || p.fills?.length).map((p, i) => (
              <li key={i} className="px-3 py-2 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{p.name}</span>
                  <span className="block text-xs text-gray-400 truncate">{p.category}{p.subcategory ? ` › ${p.subcategory}` : ''}{p.categoryNew && ' (categoría nueva)'}{!p.categoryNew && p.subcategoryNew && ' (subcategoría nueva)'}</span>
                </span>
                {p.previous !== null && p.previous !== p.price && <span className="text-xs text-gray-400 line-through tabular-nums">{eur(p.previous)}</span>}
                <span className="text-sm font-semibold tabular-nums text-gray-900">{eur(p.price)}</span>
                <span className={`hidden sm:inline text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.status === 'same' ? 'bg-sky-50 text-sky-700' : BADGE[p.status][1]}`}>{p.status === 'same' ? 'Se completa' : BADGE[p.status][0]}</span>
              </li>
            ))}
            {plan.plan.every((p) => p.status === 'same' && !p.fills?.length) && <li className="px-3 py-3 text-sm text-gray-500">Todo está igual que en la carta.</li>}
          </ul>
          {s.missing > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900">
              <p className="font-semibold">{s.missing} {s.missing === 1 ? 'plato ya no está' : 'platos ya no están'} en el TPV</p>
              <p className="text-xs mt-0.5 truncate">{plan.missing.slice(0, 4).map((m) => m.name).join(', ')}{s.missing > 4 && '…'}</p>
              <label className="flex items-center gap-2 mt-1.5">
                <input type="checkbox" checked={retireMissing} onChange={(e) => setRetireMissing(e.target.checked)} />
                Marcarlos como «retirados» (no se borran, decides tú después)
              </label>
            </div>
          )}
          {plan.errors.length > 0 && <p className="text-xs text-gray-500">{plan.errors.length} líneas no se han podido leer y se han dejado fuera.</p>}
        </div>
      )}
    </Modal>
  );
}
