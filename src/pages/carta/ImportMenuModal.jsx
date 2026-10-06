import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { MENU_FIELDS, buildMenuRows, findHeaderRow, guessMapping, parseDelimited, readTextFile } from '../../lib/tabular';
import { eur } from './labels';

const SAVED = 'menu-import:columns';
const readSaved = () => { try { return JSON.parse(window.localStorage.getItem(SAVED) || '{}'); } catch { return {}; } };
const writeSaved = (v) => { try { window.localStorage.setItem(SAVED, JSON.stringify(v)); } catch { /* ignore */ } };
const selectCls = 'w-full h-10 rounded-xl border border-gray-200 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
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
  // Prices that come from the till are locked here; a menu copied from a website keeps them editable
  const [fromTill, setFromTill] = useState(true);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const headers = table ? table[headerRow] || [] : [];
  const built = useMemo(() => (table ? buildMenuRows(table, headerRow, mapping) : { rows: [], skipped: 0 }), [table, headerRow, mapping]);
  const ready = mapping.name !== undefined && built.rows.length > 0;

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
      const { data } = await api.post('/menu/import', { rows: built.rows, apply, retireMissing, priceSource: fromTill ? 'tpv' : 'manual' });
      setPlan(data);
      if (apply) {
        writeSaved(Object.fromEntries(Object.entries(mapping).map(([k, i]) => [k, (headers[i] || '').trim().toLowerCase()])));
        toast.success('Carta actualizada');
        onDone?.();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido importar');
    } finally {
      setBusy(false);
    }
  }

  const s = plan?.summary;
  const changes = s ? s.new + s.price + s.link : 0;
  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => (plan ? setPlan(null) : onClose())} className="h-11 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">{plan ? 'Atrás' : 'Cancelar'}</button>
        {table && !plan && (
          <button type="button" disabled={!ready || busy} onClick={() => send(false)} className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40">
            {busy ? 'Revisando…' : `Revisar ${built.rows.length} platos`}
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
    <Modal title="Importar platos del TPV" subtitle="Listado de artículos con su precio" onClose={() => !busy && onClose()} size="lg" footer={footer}>
      {!table && (
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-400 px-4 py-10 text-center transition-colors">
            <span className="block text-[15px] font-semibold text-gray-900">Elegir archivo</span>
            <span className="block text-sm text-gray-500 mt-1">CSV, TXT o TSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="text-[13px] text-gray-500">
            Exporta los artículos de tu TPV (si sale en Excel: <b>Archivo → Guardar como → CSV</b>). Si vienen del TPV, lo que él controla es el <b>precio</b>; el nombre, la descripción, los alérgenos y las traducciones son tuyos y una importación nunca los cambia. Con una columna de descripción, se rellena en los platos nuevos.
          </p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {table && !plan && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600"><b className="text-gray-900">{fileName}</b> · {built.rows.length} platos encontrados</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {MENU_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-[11px] font-medium text-gray-500 mb-1">{f.label}{f.required && ' *'}</span>
                <select className={selectCls} value={mapping[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                  <option value="">— no está —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5" checked={fromTill} onChange={(e) => setFromTill(e.target.checked)} />
            <span>Los precios vienen del TPV <span className="text-gray-400">(se bloquean aquí; quítalo si es una carta copiada de otro sitio y quieres poder cambiarlos)</span></span>
          </label>
          {mapping.externalId === undefined && <p className="text-xs text-gray-500">Sin columna de código, los platos se reconocen por su nombre. Con código, un cambio de nombre en el TPV no duplica el plato.</p>}
          {built.rows.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
              {built.rows.slice(0, 3).map((r, i) => (
                <li key={i} className="px-3 py-2 flex justify-between gap-3">
                  <span className="min-w-0 truncate text-gray-800">{r.name}{r.category && <span className="text-gray-400"> · {r.category}</span>}</span>
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
            {s.same > 0 && <span>{s.same} iguales</span>}
            {s.newCategories > 0 && <span> · {s.newCategories} categorías nuevas</span>}
          </p>
          {s.link > 0 && <p className="text-xs text-gray-500">«Se une al TPV»: ya estaba en tu carta; desde ahora su precio lo marca el TPV (su texto, alérgenos y traducciones no cambian).</p>}
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 max-h-72 overflow-y-auto">
            {plan.plan.filter((p) => p.status !== 'same').map((p, i) => (
              <li key={i} className="px-3 py-2 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{p.name}</span>
                  <span className="block text-xs text-gray-400 truncate">{p.category}{p.categoryNew && ' (categoría nueva)'}</span>
                </span>
                {p.previous !== null && p.previous !== p.price && <span className="text-xs text-gray-400 line-through tabular-nums">{eur(p.previous)}</span>}
                <span className="text-sm font-semibold tabular-nums text-gray-900">{eur(p.price)}</span>
                <span className={`hidden sm:inline text-[11px] font-semibold px-2 py-0.5 rounded-full ${BADGE[p.status][1]}`}>{BADGE[p.status][0]}</span>
              </li>
            ))}
            {plan.plan.every((p) => p.status === 'same') && <li className="px-3 py-3 text-sm text-gray-500">Todo está igual que en la carta.</li>}
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
