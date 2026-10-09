import { useMemo, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { notify } from '../../lib/notify';
import { SALES_FIELDS, buildSalesRows, findHeaderRow, guessMapping, parseDelimited, readTextFile } from '../../lib/tabular';
import { ErrorBanner } from '../../ui/feedback';
import { inputCls, selectCls } from '../../ui/form';
import { dateShort } from '../../lib/format';

const SAVED = 'sales-import:columns';
const readSaved = () => { try { return JSON.parse(window.localStorage.getItem(SAVED) || '{}'); } catch { return {}; } };
const today = () => new Date().toISOString().slice(0, 10);

/** "Ventas por artículo" del TPV (CSV) → lo vendido de cada plato cada día. */
export default function ImportSalesModal({ onClose, onDone }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState(null);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState({});
  const [day, setDay] = useState(today());   // used when the file has no date column
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const headers = table ? table[headerRow] || [] : [];
  const built = useMemo(() => (table ? buildSalesRows(table, headerRow, mapping, day) : { rows: [], skipped: 0 }), [table, headerRow, mapping, day]);
  const ready = mapping.name !== undefined && mapping.quantity !== undefined && built.rows.length > 0;
  const days = new Set(built.rows.map((r) => r.date)).size;

  async function pick(file) {
    if (!file) return;
    setError('');
    try {
      const rows = parseDelimited(await readTextFile(file));
      if (rows.length < 2) throw new Error('El archivo está vacío');
      const h = findHeaderRow(rows, SALES_FIELDS, 'name');
      const guess = guessMapping(rows[h], SALES_FIELDS);
      const names = rows[h].map((x) => x.trim().toLowerCase());
      const saved = readSaved();
      for (const f of SALES_FIELDS) { const idx = saved[f.key] ? names.indexOf(saved[f.key]) : -1; if (idx !== -1) guess[f.key] = idx; }
      setFileName(file.name); setTable(rows); setHeaderRow(h); setMapping(guess);
    } catch (err) { setTable(null); setError(err.message || 'No se ha podido leer el archivo'); }
  }

  const setField = (key, value) => setMapping((m) => { const next = { ...m }; if (value === '') delete next[key]; else next[key] = Number(value); return next; });

  async function send() {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/consumption/sales/import', { rows: built.rows });
      try { window.localStorage.setItem(SAVED, JSON.stringify(Object.fromEntries(Object.entries(mapping).map(([k, i]) => [k, (headers[i] || '').trim().toLowerCase()])))); } catch { /* ignore */ }
      setResult(data); notify.success('Ventas importadas'); onDone?.();
    } catch (err) { setError(err?.response?.data?.message || 'No se ha podido importar'); } finally { setBusy(false); }
  }

  const footer = (
    <div className="space-y-2">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {result ? (
        <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-violet-600 font-semibold text-white">Hecho</button>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700">Cancelar</button>
          {table && <button type="button" disabled={!ready || busy} onClick={send} className="h-12 flex-1 rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-40">{busy ? 'Importando…' : `Importar ${built.rows.length} líneas`}</button>}
        </div>
      )}
    </div>
  );

  return (
    <Modal size="lg" title="Importar ventas por plato" subtitle="El informe de ventas por artículo de tu TPV" onClose={() => !busy && onClose()} footer={footer}>
      {result ? (
        <div className="space-y-4">
          <p className="text-[15px] text-gray-800"><b>{result.units.toLocaleString('es-ES')}</b> unidades vendidas en {result.days} {result.days === 1 ? 'día' : 'días'} ({dateShort(result.from)}{result.to !== result.from ? ` – ${dateShort(result.to)}` : ''}).</p>
          <p className="text-sm text-gray-600">{result.matched} de {result.lines} líneas son platos de tu carta{result.unmatched.length ? '.' : ': todo reconocido.'}</p>
          {result.unmatched.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-800">No he reconocido {result.unmatched.length === 30 ? 'más de 30' : result.unmatched.length} {result.unmatched.length === 1 ? 'plato' : 'platos'}</p>
              <p className="text-xs text-gray-500">No cuentan en el consumo. Importa tu carta del TPV (con el código) para que se reconozcan.</p>
              <ul className="mt-2 divide-y divide-gray-100 text-sm">{result.unmatched.slice(0, 8).map((u) => <li key={u.name} className="flex justify-between gap-3 py-1.5"><span className="truncate text-gray-800">{u.name}</span><span className="tabular-nums text-gray-500">{u.units} uds</span></li>)}</ul>
            </div>
          )}
        </div>
      ) : !table ? (
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-gray-300 px-4 py-10 text-center transition-colors hover:border-violet-400">
            <span className="block text-[15px] font-semibold text-gray-900">Elegir archivo</span>
            <span className="mt-1 block text-sm text-gray-500">CSV, TXT o TSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="text-[13px] text-gray-500">En tu TPV, saca el informe de <b>ventas por artículo</b> de un día o de un periodo y expórtalo (si sale en Excel: <b>Archivo → Guardar como → CSV</b>). Volver a importar un día sustituye lo que había de ese día.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600"><b className="text-gray-900">{fileName}</b> · {built.rows.length} líneas{days > 0 ? ` en ${days} ${days === 1 ? 'día' : 'días'}` : ''}{built.skipped > 0 ? ` · ${built.skipped} descartadas` : ''}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {SALES_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-[11px] font-medium text-gray-500">{f.label}{f.required && ' *'}{f.key === 'date' && ' (si no, un solo día)'}</span>
                <select className={selectCls} value={mapping[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                  <option value="">— no está —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
          {mapping.date === undefined && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">El archivo no tiene fecha: ¿de qué día son estas ventas?</span>
              <input type="date" className={`${inputCls} max-w-[12rem]`} value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
            </label>
          )}
          {built.rows.length > 0 && (
            <ul className="divide-y divide-gray-100 text-sm">
              {built.rows.slice(0, 3).map((r, i) => <li key={i} className="flex justify-between gap-3 py-2"><span className="truncate text-gray-800">{r.name}<span className="text-gray-400"> · {dateShort(r.date)}</span></span><span className="font-semibold tabular-nums text-gray-900">{r.quantity} uds</span></li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
