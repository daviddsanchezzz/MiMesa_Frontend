import { useEffect, useMemo, useState } from 'react';
import { notify } from '../../lib/notify';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useData } from '../../lib/query';
import Icon from '../../ui/Icon';
import { inputCls } from '../carta/labels';
import { Chip } from '../../ui/list';
import { money, perUnit } from './format';
import { confirmDialog } from '../../ui/confirm';

// Quantities are typed in grams / millilitres / units and stored in kg / l / units
const SCALE = { kg: 1000, l: 1000, ud: 1 };
const SMALL = { kg: 'g', l: 'ml', ud: 'ud' };
const toStored = (v, unit) => (Number(String(v).replace(',', '.')) || 0) / SCALE[unit];
const toShown = (q, unit) => (q ? String(Math.round(q * SCALE[unit] * 100) / 100).replace('.', ',') : '');
const dec = (v) => v.replace(/[^\d,.]/g, '');

export const marginTone = (m, target) => (m === null ? 'gray' : m >= target ? 'green' : m >= target - 15 ? 'amber' : 'rose');

/** The escandallo of a dish: what goes in a serving. Cost and margin recalculate as you type. */
export default function RecipeModal({ itemId, ingredients, onClose, onChanged }) {
  const q = useData(['recipes', 'one', itemId], () => api.get(`/recipes/${itemId}`).then((r) => r.data), { retry: false });
  const dish = q.data;
  const [lines, setLines] = useState(null);   // [{ ingredientId, qty (typed), waste (typed) }]
  const [other, setOther] = useState('');
  const [adding, setAdding] = useState('');
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  useEffect(() => {
    if (!dish || lines) return;
    setLines(dish.lines.map((l) => ({ ingredientId: l.ingredientId, qty: toShown(l.quantity, l.unit), waste: l.wastePct ? String(l.wastePct) : '' })));
    setOther(dish.otherCost ? String(dish.otherCost).replace('.', ',') : '');
  }, [dish, lines]);

  const settings = dish?.settings || { targetMarginPct: 70, vatPct: 10 };
  const calc = useMemo(() => {
    let cost = Number(String(other).replace(',', '.')) || 0;
    let missing = 0;
    const per = (lines || []).map((l) => {
      const ing = byId.get(l.ingredientId);
      if (!ing || ing.lastPrice === null) { missing += 1; return null; }
      const waste = Math.min(0.9, (Number(l.waste) || 0) / 100);
      const c = toStored(l.qty, ing.unit) / (1 - waste) * ing.lastPrice;
      cost += c;
      return c;
    });
    const price = dish?.price ?? null;
    const net = price ? price / (1 + settings.vatPct / 100) : null;
    const margin = net ? ((net - cost) / net) * 100 : null;
    const ideal = cost > 0 ? Math.ceil((cost / (1 - settings.targetMarginPct / 100)) * (1 + settings.vatPct / 100) * 10 - 1e-9) / 10 : null;
    return { cost, per, missing, margin, profit: net ? net - cost : null, ideal };
  }, [lines, other, byId, dish, settings.vatPct, settings.targetMarginPct]);

  const set = (i, patch) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const used = new Set((lines || []).map((l) => l.ingredientId));
  const options = ingredients.filter((i) => !used.has(i.id));

  async function save() {
    setSaving(true);
    try {
      await api.put(`/recipes/${itemId}`, {
        otherCost: Number(String(other).replace(',', '.')) || 0,
        lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: toStored(l.qty, byId.get(l.ingredientId)?.unit || 'kg'), wastePct: Number(l.waste) || 0 })),
      });
      notify.success('Escandallo guardado');
      onChanged?.(); onClose();
    } catch (err) { notify.error(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setSaving(false); }
  }
  async function clear() {
    if (!await confirmDialog('¿Quitar el escandallo de este plato?')) return;
    try { await api.delete(`/recipes/${itemId}`); onChanged?.(); onClose(); } catch (err) { notify.error(err?.response?.data?.message || 'No se ha podido quitar'); }
  }

  const m = calc.margin;
  return (
    <Modal size="wide" title={dish?.name || 'Escandallo'} subtitle={dish ? `Lo que lleva una ración${dish.price ? ` · se vende a ${money(dish.price)}` : ''}` : undefined} onClose={onClose}
      footer={dish && lines && (
        <div className="flex items-center gap-3">
          {dish.lines.length > 0 && <button type="button" onClick={clear} className="h-12 px-3 text-sm font-medium text-rose-600">Quitar</button>}
          <button type="button" onClick={save} disabled={saving} className="h-12 flex-1 rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-50">Guardar escandallo</button>
        </div>
      )}>
      {!dish || !lines ? <p className="py-10 text-center text-sm text-gray-400">{q.isError ? 'No se ha podido cargar.' : 'Cargando…'}</p> : (
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 lg:order-1">
            {lines.length === 0 ? <p className="py-2 text-sm text-gray-500">Añade los ingredientes de una ración. Usamos el último precio al que los has comprado.</p> : (
              <ul className="divide-y divide-gray-100">
                {lines.map((l, i) => {
                  const ing = byId.get(l.ingredientId);
                  const unit = ing?.unit || 'kg';
                  return (
                    <li key={l.ingredientId} className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-gray-900">{ing?.name || 'Ingrediente borrado'}</p>
                          <p className="text-[12px] tabular-nums text-gray-400">{ing ? perUnit(ing.lastPrice, ing.unit) : ''}</p>
                        </div>
                        <p className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums text-gray-900">{calc.per[i] === null ? '—' : money(calc.per[i])}</p>
                        <button type="button" aria-label="Quitar" onClick={() => setLines(lines.filter((_, n) => n !== i))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><Icon name="x" className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <input className={`${inputCls} !h-10 !w-24 text-right tabular-nums`} inputMode="decimal" placeholder="0" value={l.qty} onChange={(e) => set(i, { qty: dec(e.target.value) })} />
                        <span className="w-7">{SMALL[unit]}</span>
                        <span className="ml-auto">merma</span>
                        <input className={`${inputCls} !h-10 !w-16 text-right tabular-nums`} inputMode="numeric" placeholder="0" value={l.waste} onChange={(e) => set(i, { waste: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })} />
                        <span>%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select className={`${inputCls} !h-10 !py-0 w-full sm:max-w-xs`} value={adding} onChange={(e) => { if (e.target.value) setLines([...lines, { ingredientId: e.target.value, qty: '', waste: '' }]); setAdding(''); }}>
                <option value="">{options.length ? '+ Añadir ingrediente' : 'No quedan ingredientes por añadir'}</option>
                {options.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm text-gray-600">
              <span>Otros costes (pan, gas, envase)</span>
              <input className={`${inputCls} !h-10 !w-24 ml-auto text-right tabular-nums`} inputMode="decimal" placeholder="0" value={other} onChange={(e) => setOther(dec(e.target.value))} />
              <span>€</span>
            </label>
          </div>

          <aside className="lg:order-2 lg:border-l lg:border-gray-100 lg:pl-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Coste por ración</p>
            <p className="mt-0.5 text-[34px] font-semibold leading-none tracking-tight tabular-nums text-gray-900">{money(calc.cost)}</p>
            {dish.before > 0 && Math.abs(calc.cost - dish.cost) < 0.005 && Math.abs(dish.cost - dish.before) >= 0.005 && <p className="mt-1.5 text-sm text-gray-500">antes {money(dish.before)}</p>}
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-baseline justify-between"><dt className="text-gray-500">Margen</dt><dd><Chip tone={marginTone(m, settings.targetMarginPct)}>{m === null ? '—' : `${Math.round(m * 10) / 10} %`.replace('.', ',')}</Chip></dd></div>
              <div className="flex items-baseline justify-between"><dt className="text-gray-500">Te queda</dt><dd className="font-semibold tabular-nums text-gray-900">{calc.profit === null ? '—' : money(calc.profit)}</dd></div>
              <div className="flex items-baseline justify-between"><dt className="text-gray-500">Precio ideal</dt><dd className="font-semibold tabular-nums text-gray-900">{calc.ideal === null ? '—' : money(calc.ideal)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-gray-400">Margen sobre el precio sin IVA ({settings.vatPct} %). El ideal alcanza un {settings.targetMarginPct} %.</p>
            {calc.missing > 0 && <p className="mt-3 text-xs text-amber-700">{calc.missing === 1 ? 'Un ingrediente no tiene' : `${calc.missing} ingredientes no tienen`} precio todavía y no cuenta en el coste.</p>}
          </aside>
        </div>
      )}
    </Modal>
  );
}
