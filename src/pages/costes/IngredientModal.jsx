import { useState } from 'react';
import { notify } from '../../lib/notify';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { Segmented } from '../../ui/kit';
import { inputCls } from '../carta/labels';
import Change from './Change';
import { PriceChart } from './Charts';
import { UNIT_NAME, ago, money, perUnit, shortDate } from './format';
import { confirmDialog } from '../../ui/confirm';
import { List, ListRow } from '../../ui/list';

const Stat = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 truncate">{value}</p>
  </div>
);

/** One ingredient: today's price, how it moved, every purchase, and what counts as this ingredient. */
export default function IngredientModal({ id, onClose, onChanged }) {
  const q = useData(['ingredients', 'one', id], () => api.get(`/ingredients/${id}`).then((r) => r.data), { retry: false });
  const ing = q.data;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [saving, setSaving] = useState(false);

  function startEdit() { setName(ing.name); setUnit(ing.unit); setEditing(true); }
  async function save() {
    setSaving(true);
    try { await api.put(`/ingredients/${id}`, { name, unit }); setEditing(false); onChanged?.(); } catch (err) { notify.error(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setSaving(false); }
  }
  async function remove() {
    if (!await confirmDialog(`¿Borrar «${ing.name}»? Sus líneas de factura vuelven a «Por vincular».`)) return;
    try { await api.delete(`/ingredients/${id}`); onChanged?.(); onClose(); } catch (err) { notify.error(err?.response?.data?.message || 'No se ha podido borrar'); }
  }

  const points = ing ? [...ing.history].reverse().reduce((acc, h) => {
    // One point per invoice (the last line of it), oldest first
    const prev = acc[acc.length - 1];
    if (prev && prev.invoiceId === h.invoiceId) acc[acc.length - 1] = { date: h.date, price: h.price, invoiceId: h.invoiceId };
    else acc.push({ date: h.date, price: h.price, invoiceId: h.invoiceId });
    return acc;
  }, []) : [];

  return (
    <Modal size="wide" title={ing?.name || 'Ingrediente'} subtitle={ing ? `Precio por ${UNIT_NAME[ing.unit]}, IVA no incluido` : undefined} onClose={onClose}>
      {!ing ? <p className="py-10 text-center text-sm text-gray-400">{q.isError ? 'No se ha podido cargar.' : 'Cargando…'}</p> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-[34px] leading-none font-semibold tracking-tight tabular-nums text-gray-900">{perUnit(ing.lastPrice, ing.unit)}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                <Change value={ing.changePct} />
                {ing.prevPrice !== null && <span>antes {perUnit(ing.prevPrice, ing.unit)}</span>}
                {ing.lastDate && <span>· {ago(ing.lastDate)}{ing.supplier ? ` · ${ing.supplier}` : ''}</span>}
              </p>
            </div>
            <div className="flex gap-6">
              <Stat label="Mínimo" value={money(ing.minPrice)} />
              <Stat label="Máximo" value={money(ing.maxPrice)} />
              <Stat label="Compras" value={ing.count} />
            </div>
          </div>

          <PriceChart points={points} unit={UNIT_NAME[ing.unit]} />

          <section>
            <h4 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-gray-400">Compras</h4>
            {ing.history.length === 0 ? <p className="py-3 text-sm text-gray-500">Aún no hay compras con precio. Confirma una factura con este ingrediente.</p> : (
              <List>
                {ing.history.slice(0, 30).map((h) => (
                  <ListRow key={h.id} className="!py-2.5"
                    leading={<span className="w-16 shrink-0 text-sm tabular-nums text-gray-500">{shortDate(h.date)}</span>}
                    title={h.supplier || 'Sin proveedor'}
                    subtitle={`${h.invoiceNumber ? `Factura ${h.invoiceNumber}` : h.description}${h.quantity ? ` · ${h.quantity.toLocaleString('es-ES')} ${ing.unit}` : ''}`}
                    value={perUnit(h.price, ing.unit)} />
                ))}
              </List>
            )}
          </section>

          {ing.aliasList.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-[13px] font-semibold text-gray-500 hover:text-gray-800">Así se llama en tus facturas ({ing.aliasList.length})</summary>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {ing.aliasList.map((a) => <li key={a.key} className="flex justify-between gap-3"><span className="truncate">{a.label || a.key}</span><span className="shrink-0 tabular-nums text-gray-400">{a.content.toLocaleString('es-ES')} {ing.unit} por unidad</span></li>)}
              </ul>
            </details>
          )}

          <div className="border-t border-gray-100 pt-4">
            {editing ? (
              <div className="space-y-3">
                <label className="block"><span className="mb-1 block text-xs font-medium text-gray-500">Nombre</span>
                  <input className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus /></label>
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-500">Se cuenta en</span>
                  <Segmented value={unit} onChange={setUnit} options={[['kg', 'Kilos'], ['l', 'Litros'], ['ud', 'Unidades']]} />
                  {unit !== ing.unit && ing.count > 0 && <p className="mt-1.5 text-xs text-amber-700">Cambiar la unidad no recalcula los precios: úsalo solo si la elegiste mal al crearlo.</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={save} disabled={saving} className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">Guardar</button>
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={startEdit} className="text-sm font-semibold text-violet-700 hover:text-violet-900">Cambiar nombre o unidad</button>
                <button type="button" onClick={remove} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Borrar ingrediente</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
