import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { Segmented } from '../../ui/kit';
import { inputCls } from '../carta/labels';
import { UNIT_NAME, money, perUnit, shortDate } from './format';
import { ErrorBanner } from '../../ui/feedback';

const parse = (v) => Number(String(v ?? '').replace(',', '.'));

/**
 * "What is this line of the invoice?": an ingredient you already have or a new one, and how much of it each
 * unit you buy holds (a 5 L can, a 12 kg box). Everything written the same way links itself from now on.
 */
export default function LinkModal({ group, ingredients, onClose, onDone }) {
  const s = group.suggestion;
  const [mode, setMode] = useState(s.ingredientId ? 'existing' : 'new');
  const [existingId, setExistingId] = useState(s.ingredientId || '');
  const [name, setName] = useState(s.name);
  const [unit, setUnit] = useState(s.unit);
  const [content, setContent] = useState(String(s.content).replace('.', ','));
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const chosen = ingredients.find((i) => i.id === existingId);
  const effectiveUnit = mode === 'existing' ? chosen?.unit || unit : unit;
  const matches = useMemo(() => {
    const n = filter.trim().toLocaleLowerCase('es');
    return ingredients.filter((i) => !n || i.name.toLocaleLowerCase('es').includes(n)).slice(0, 8);
  }, [ingredients, filter]);
  const c = parse(content);
  const preview = group.lastUnitPrice !== null && c > 0 ? group.lastUnitPrice / c : null;

  async function save() {
    setError('');
    if (mode === 'existing' && !existingId) return setError('Elige el ingrediente');
    if (mode === 'new' && !name.trim()) return setError('Pon el nombre del ingrediente');
    if (!(c > 0)) return setError('Pon cuánto trae cada unidad que compras');
    setSaving(true);
    try {
      const body = { key: group.key, content: c, ...(mode === 'existing' ? { ingredientId: existingId } : { create: { name: name.trim(), unit } }) };
      const { data } = await api.post('/ingredients/link', body);
      onDone(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido vincular');
    } finally { setSaving(false); }
  }

  const footer = (
    <div className="space-y-2">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <button type="button" onClick={save} disabled={saving} className="h-12 w-full rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
        {saving ? 'Vinculando…' : group.lines > 1 ? `Vincular las ${group.lines} líneas` : 'Vincular'}
      </button>
    </div>
  );

  return (
    <Modal size="wide" title="¿Qué ingrediente es?" subtitle={group.description} footer={footer} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm text-gray-500">
          {group.lines} {group.lines === 1 ? 'línea' : 'líneas'} en {group.invoices} {group.invoices === 1 ? 'factura' : 'facturas'}
          {group.suppliers.length ? ` · ${group.suppliers.join(', ')}` : ''}{group.lastDate ? ` · última ${shortDate(group.lastDate)}` : ''}
          {group.lastUnitPrice !== null ? ` · ${money(group.lastUnitPrice)} por unidad` : ''}.
          Todo lo que se escriba igual se vincula solo a partir de ahora.
        </p>

        <Segmented value={mode} onChange={setMode} options={[['new', 'Ingrediente nuevo'], ['existing', 'Uno que ya tengo']]} />

        {mode === 'new' ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-500">Nombre del ingrediente</span>
              <input className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Limones, aceite de oliva…" /></label>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Se cuenta en</span>
              <Segmented value={unit} onChange={setUnit} options={[['kg', 'Kilos'], ['l', 'Litros'], ['ud', 'Unidades']]} /></div>
          </div>
        ) : (
          <div>
            <input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar entre tus ingredientes…" />
            {ingredients.length === 0 ? <p className="mt-3 text-sm text-gray-500">Aún no tienes ingredientes: crea el primero.</p> : (
              <ul className="mt-2 divide-y divide-gray-100">
                {matches.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => setExistingId(i.id)} className={`flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left ${existingId === i.id ? 'text-violet-700' : 'text-gray-900'}`}>
                      <span className="text-[15px] font-medium">{i.name}</span>
                      <span className="flex items-center gap-2 text-xs text-gray-400">{i.lastPrice !== null ? perUnit(i.lastPrice, i.unit) : i.unit}{existingId === i.id && <span aria-hidden="true" className="font-bold text-violet-600">✓</span>}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="py-3 text-sm text-gray-500">Ninguno se llama así.</li>}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-gray-50 px-4 py-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-800">Cada unidad que compras trae</span>
            <span className="flex items-center gap-2">
              <input className={`${inputCls} !w-28 text-right tabular-nums`} inputMode="decimal" value={content} onChange={(e) => setContent(e.target.value)} aria-label="Cantidad por unidad comprada" />
              <span className="text-sm text-gray-600">{effectiveUnit === 'ud' ? 'unidades' : effectiveUnit === 'l' ? 'litros' : 'kilos'}</span>
            </span>
          </label>
          <p className="mt-2 text-xs text-gray-500">Una caja de 12 kg trae <b>12</b> kilos; si la factura ya cobra por kilo, pon <b>1</b>.</p>
          {preview !== null && (
            <p className="mt-3 text-sm text-gray-700">Entonces te cuesta <b className="text-gray-900">{perUnit(preview, effectiveUnit)}</b> el {UNIT_NAME[effectiveUnit]}.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
