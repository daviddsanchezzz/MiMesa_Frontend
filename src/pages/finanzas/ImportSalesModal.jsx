import { useMemo, useRef, useState } from 'react';
import { notify } from '../../lib/notify';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { FIELDS, buildRows, findHeaderRow, guessMapping, parseDelimited, readTextFile } from '../../lib/tabular';
import { eur } from '../../lib/format';
import { selectCls } from '../../ui/form';

const SAVED = 'sales-import:columns';
const readSaved = () => { try { return JSON.parse(window.localStorage.getItem(SAVED) || '{}'); } catch { return {}; } };
const writeSaved = (v) => { try { window.localStorage.setItem(SAVED, JSON.stringify(v)); } catch { /* ignore */ } };

const dayLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const BADGE = {
  new: ['Nuevo', 'bg-emerald-50 text-emerald-700'],
  update: ['Cambia', 'bg-amber-50 text-amber-700'],
  same: ['Igual', 'bg-gray-100 text-gray-500'],
  skip: ['Se queda', 'bg-gray-100 text-gray-500'],
};

/**
 * Daily sales of the restaurant from the POS closing report (CSV): pick the file, check which
 * column is which, review what would change and import. The backend only sees normalised rows.
 */
export default function ImportSalesModal({ onClose, onDone }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState(null);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState({});
  const [overwrite, setOverwrite] = useState('all');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const headers = table ? table[headerRow] || [] : [];
  const built = useMemo(() => (table ? buildRows(table, headerRow, mapping) : { rows: [], skipped: 0 }), [table, headerRow, mapping]);
  const hasAmount = ['total', 'cash', 'card', 'bizum', 'other'].some((k) => mapping[k] !== undefined);
  const ready = mapping.date !== undefined && hasAmount && built.rows.length > 0;

  async function pick(file) {
    if (!file) return;
    setError('');
    setPlan(null);
    try {
      const rows = parseDelimited(await readTextFile(file));
      if (rows.length < 2) throw new Error('El archivo está vacío');
      const h = findHeaderRow(rows);
      const guess = guessMapping(rows[h]);
      // What the person corrected last time wins over the guess
      const saved = readSaved();
      const names = rows[h].map((x) => x.trim().toLowerCase());
      for (const f of FIELDS) {
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

  async function send(apply, mode = overwrite) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/revenue/import', { rows: built.rows, overwrite: mode, apply });
      setPlan(data);
      if (apply) {
        writeSaved(Object.fromEntries(Object.entries(mapping).map(([k, i]) => [k, (headers[i] || '').trim().toLowerCase()])));
        notify.success(`${data.summary.new + data.summary.update} días importados`);
        onDone?.();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido importar');
    } finally {
      setBusy(false);
    }
  }

  const changes = plan ? plan.summary.new + plan.summary.update : 0;
  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => (plan ? setPlan(null) : onClose())} className="h-11 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">
          {plan ? 'Atrás' : 'Cancelar'}
        </button>
        {table && !plan && (
          <button type="button" disabled={!ready || busy} onClick={() => send(false)} className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40">
            {busy ? 'Revisando…' : `Revisar ${built.rows.length} días`}
          </button>
        )}
        {plan && (
          <button type="button" disabled={!changes || busy} onClick={() => send(true)} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">
            {busy ? 'Importando…' : changes ? `Importar ${changes} ${changes === 1 ? 'día' : 'días'}` : 'No hay nada que importar'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal title="Importar ventas del TPV" subtitle="Cierre de caja o informe de ventas por día" onClose={() => !busy && onClose()} size="lg" footer={footer}>
      {!table && (
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-400 px-4 py-10 text-center transition-colors">
            <span className="block text-[15px] font-semibold text-gray-900">Elegir archivo</span>
            <span className="block text-sm text-gray-500 mt-1">CSV, TXT o TSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="text-[13px] text-gray-500">
            Si tu TPV lo exporta a Excel: ábrelo y usa <b>Archivo → Guardar como → CSV</b>. Cada línea debe ser un día, con su fecha y su total.
            Si el mismo día sale en varias líneas (una por forma de pago), se suman.
          </p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {table && !plan && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600"><b className="text-gray-900">{fileName}</b> · {built.rows.length} días encontrados{built.skipped > 0 && ` (${built.skipped} líneas ignoradas por no tener fecha)`}</p>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">¿Qué columna es cada cosa?</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="block text-[11px] font-medium text-gray-500 mb-1">{f.label}{f.required && ' *'}</span>
                  <select className={selectCls} value={mapping[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                    <option value="">— no está —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {!hasAmount && mapping.date !== undefined && <p className="mt-2 text-xs text-amber-700">Elige al menos el total o una forma de pago.</p>}
          </div>
          {built.rows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Así se leerán las primeras líneas</p>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
                {built.rows.slice(0, 3).map((r) => (
                  <li key={r.date} className="px-3 py-2 flex justify-between gap-3">
                    <span className="text-gray-700 first-letter:uppercase">{dayLabel(r.date)}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{r.total !== undefined ? eur(r.total) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {plan.summary.new > 0 && <span><b className="text-gray-900">{plan.summary.new}</b> nuevos · </span>}
            {plan.summary.update > 0 && <span><b className="text-gray-900">{plan.summary.update}</b> cambian · </span>}
            {plan.summary.same > 0 && <span>{plan.summary.same} iguales · </span>}
            {changes > 0 && <span>total <b className="text-gray-900">{eur(plan.summary.total)}</b></span>}
          </p>
          {plan.summary.update > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900 space-y-1.5">
              <p className="font-semibold">Hay días que ya tenían un ingreso apuntado</p>
              {[['all', 'Sustituirlos por los del archivo'], ['empty', 'Dejarlos como están y rellenar solo los vacíos']].map(([v, label]) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" checked={overwrite === v} onChange={() => { setOverwrite(v); send(false, v); }} />{label}
                </label>
              ))}
            </div>
          )}
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 max-h-72 overflow-y-auto">
            {plan.items.map((i) => (
              <li key={i.date} className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm text-gray-800 first-letter:uppercase">{dayLabel(i.date)}</span>
                  {i.status === 'update' && <span className="text-xs text-gray-400 tabular-nums line-through">{eur(i.previous)}</span>}
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{eur(i.total)}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${BADGE[i.status][1]}`}>{BADGE[i.status][0]}</span>
                </div>
                {i.warnings.length > 0 && <p className="text-xs text-amber-700 mt-0.5">⚠ {i.warnings.join(' · ')}</p>}
              </li>
            ))}
          </ul>
          {plan.errors.length > 0 && <p className="text-xs text-gray-500">{plan.errors.length} líneas no se han podido leer y se han dejado fuera.</p>}
        </div>
      )}
    </Modal>
  );
}
