import { useMemo, useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { decodeFile, parseCsv, guessColumns, rowsToCustomers } from '../lib/csv';
import { inputCls, btnPrimary, btnSecondary } from '../ui/form';
import { ErrorBanner } from '../ui/feedback';

const BATCH = 300;
const FIELDS = [
  ['name', 'Nombre', true],
  ['surname', 'Apellidos', false],
  ['phone', 'Teléfono', false],
  ['email', 'Email', false],
  ['notes', 'Notas', false],
];


/**
 * Import customers from a CSV (Excel, Booksy, Google Contacts, another app):
 * pick the file, check which column is which, import. Existing customers are
 * matched by phone or email and only get what they were missing.
 */
export default function ImportCustomersModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [cols, setCols] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null); // { done, total }
  const [result, setResult] = useState(null);

  async function pick(f) {
    setError(''); setResult(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError('El archivo es demasiado grande (máx. 5 MB).');
    if (/\.(xlsx?|numbers)$/i.test(f.name)) return setError('Guárdalo antes como CSV: en Excel, «Archivo → Guardar como → CSV».');
    try {
      const parsed = parseCsv(decodeFile(await f.arrayBuffer()));
      if (!parsed.length) return setError('El archivo está vacío.');
      setFile(f); setRows(parsed); setCols(guessColumns(parsed));
    } catch {
      setError('No hemos podido leer el archivo. ¿Es un CSV?');
    }
  }

  const header = rows && cols?.hasHeader ? rows[0] : null;
  const width = rows ? Math.max(...rows.slice(0, 50).map((r) => r.length)) : 0;
  const columnLabel = (i) => {
    const sample = rows.slice(cols.hasHeader ? 1 : 0).find((r) => r[i])?.[i] || '';
    return `${header?.[i] || `Columna ${i + 1}`}${sample ? ` · ${sample.slice(0, 24)}` : ''}`;
  };
  const customers = useMemo(() => (rows && cols ? rowsToCustomers(rows, cols) : []), [rows, cols]);
  const valid = customers.filter((c) => c.name);

  async function run() {
    setError('');
    const total = customers.length;
    const sum = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    setProgress({ done: 0, total });
    try {
      for (let i = 0; i < total; i += BATCH) {
        const { data } = await api.post('/customers/import', { rows: customers.slice(i, i + BATCH) });
        sum.created += data.created; sum.updated += data.updated; sum.unchanged += data.unchanged; sum.skipped += data.skipped.length;
        setProgress({ done: Math.min(total, i + BATCH), total });
      }
      setResult(sum);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || 'La importación se ha cortado. Puedes volver a intentarlo: no se duplicará nada.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <Modal title="Importar clientes" subtitle={file ? file.name : 'Desde Excel, Booksy, Google Contactos u otro programa'} onClose={onClose} size="lg">
      <div className="space-y-4">
        {!rows && (
          <>
            <label className="block rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-400 px-5 py-8 text-center cursor-pointer transition-colors">
              <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              <p className="text-sm font-semibold text-gray-900">Elige el archivo CSV</p>
              <p className="text-xs text-gray-500 mt-1">Con una fila por cliente: nombre, teléfono, email… en el orden que sea.</p>
            </label>
            <ul className="text-xs text-gray-500 space-y-1 px-1">
              <li><b className="text-gray-700">Excel:</b> Archivo → Guardar como → «CSV UTF-8» (o CSV).</li>
              <li><b className="text-gray-700">Google Contactos:</b> Exportar → «CSV de Google».</li>
              <li><b className="text-gray-700">Otro programa de citas:</b> busca «exportar clientes» en su configuración.</li>
            </ul>
          </>
        )}

        {rows && !result && (
          <>
            <p className="text-sm text-gray-600">
              Hemos encontrado <b>{customers.length}</b> filas. Revisa qué columna es cada dato:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map(([key, label, required]) => (
                <label key={key} className="block">
                  <span className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</span>
                  <select className={inputCls} value={cols.map[key]}
                    onChange={(e) => setCols({ ...cols, map: { ...cols.map, [key]: Number(e.target.value) } })}>
                    <option value={-1}>— No importar —</option>
                    {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{columnLabel(i)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-violet-600" checked={cols.hasHeader}
                onChange={(e) => setCols({ ...cols, hasHeader: e.target.checked })} />
              La primera fila son los títulos de las columnas
            </label>

            <div className="rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="text-left font-medium px-3 py-2">Nombre</th><th className="text-left font-medium px-3 py-2">Teléfono</th><th className="text-left font-medium px-3 py-2">Email</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.slice(0, 5).map((c, i) => (
                    <tr key={i} className={c.name ? '' : 'text-gray-400'}>
                      <td className="px-3 py-2 whitespace-nowrap">{c.name || 'Sin nombre (se omite)'}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{c.phone}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Si alguien ya está en Vetra (mismo teléfono o email), solo se completa lo que le falte; no se borra ni se cambia nada.
              Importar clientes no les envía ningún email.
            </p>
            {progress && (
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-violet-600 transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
            )}
            <div className="flex justify-between gap-2">
              <button type="button" className={btnSecondary} disabled={!!progress} onClick={() => { setRows(null); setFile(null); }}>Otro archivo</button>
              <button type="button" className={btnPrimary} disabled={!!progress || cols.map.name < 0 || !valid.length} onClick={run}>
                {progress ? `Importando… ${progress.done}/${progress.total}` : `Importar ${valid.length} clientes`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">Importación terminada</p>
              <p className="text-sm text-emerald-800 mt-1">
                {result.created} nuevos · {result.updated} completados · {result.unchanged} ya estaban
                {result.skipped > 0 && ` · ${result.skipped} filas sin nombre omitidas`}
              </p>
            </div>
            <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={onClose}>Listo</button></div>
          </div>
        )}

        {error && <ErrorBanner>{error}</ErrorBanner>}
      </div>
    </Modal>
  );
}
