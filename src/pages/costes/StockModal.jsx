import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { notify } from '../../lib/notify';
import { useData } from '../../lib/query';
import { ErrorBanner } from '../../ui/feedback';
import { inputCls } from '../../ui/form';
import { dateShort } from '../../lib/format';

const today = () => new Date().toISOString().slice(0, 10);
const SMALL = { kg: ['g', 1000], l: ['ml', 1000], ud: ['ud', 1] };
const toStored = (v, unit) => (Number(String(v).replace(',', '.')) || 0) / SMALL[unit][1];
const toShown = (q, unit) => (q || q === 0 ? String(Math.round(q * SMALL[unit][1] * 100) / 100).replace('.', ',') : '');

/** Contar el stock: cuánto hay de cada ingrediente. Se rellena con el último conteo para corregir solo lo que cambia. */
export default function StockModal({ ingredients, onClose, onDone }) {
  const last = useData(['consumption', 'stock'], () => api.get('/consumption/stock').then((r) => r.data), { retry: false });
  const [date, setDate] = useState(today());
  const [values, setValues] = useState({});
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  useEffect(() => {
    if (!last.data?.last || Object.keys(values).length) return;
    setValues(Object.fromEntries(last.data.last.lines.filter((l) => byId.has(String(l.ingredientId))).map((l) => [String(l.ingredientId), toShown(l.quantity, byId.get(String(l.ingredientId)).unit)])));
  }, [last.data, byId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const shown = ingredients.filter((i) => !filter.trim() || i.name.toLocaleLowerCase('es').includes(filter.trim().toLocaleLowerCase('es')));
  const counted = Object.values(values).filter((v) => v !== '').length;

  async function save() {
    setBusy(true); setError('');
    try {
      await api.post('/consumption/stock', { date, lines: Object.entries(values).filter(([, v]) => v !== '').map(([id, v]) => ({ ingredientId: id, quantity: toStored(v, byId.get(id).unit) })) });
      notify.success('Stock guardado'); onDone?.(); onClose();
    } catch (err) { setError(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setBusy(false); }
  }

  const footer = (
    <div className="space-y-2">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <button type="button" onClick={save} disabled={busy || !counted} className="h-12 w-full rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : `Guardar el conteo (${counted})`}</button>
    </div>
  );
  return (
    <Modal size="wide" title="Contar el stock" subtitle={last.data?.last ? `Empiezas del último conteo, el ${dateShort(last.data.last.date)}` : 'Cuánto hay ahora de cada ingrediente'} onClose={() => !busy && onClose()} footer={footer}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">Fecha del conteo <input type="date" className={`${inputCls} !h-10 !w-40`} value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
        <input className={`${inputCls} !h-10 flex-1 sm:max-w-xs`} placeholder="Buscar un ingrediente…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <p className="mb-2 text-xs text-gray-500">Deja en blanco lo que no cuentes: no entra en el cuadro. Pon las cantidades en g, ml o unidades.</p>
      <ul className="divide-y divide-gray-100">
        {shown.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[15px] text-gray-900">{i.name}</span>
            <input className={`${inputCls} !h-10 !w-28 text-right tabular-nums`} inputMode="decimal" placeholder="—" value={values[i.id] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [i.id]: e.target.value.replace(/[^\d,.]/g, '') }))} />
            <span className="w-8 text-sm text-gray-500">{SMALL[i.unit][0]}</span>
          </li>
        ))}
        {shown.length === 0 && <li className="py-6 text-center text-sm text-gray-500">Ningún ingrediente coincide.</li>}
      </ul>
    </Modal>
  );
}
