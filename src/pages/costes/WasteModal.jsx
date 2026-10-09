import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { notify } from '../../lib/notify';
import { useData } from '../../lib/query';
import { ErrorBanner } from '../../ui/feedback';
import { Field, Input, Select } from '../../ui/form';
import { List, ListRow } from '../../ui/list';
import { confirmDialog } from '../../ui/confirm';
import { dateShort, money } from '../../lib/format';
import { qty } from './format';

const REASONS = [['expired', 'Caducado'], ['broken', 'Roto o estropeado'], ['mistake', 'Error de cocina'], ['staff', 'Comida de personal'], ['other', 'Otro']];
const SMALL = { kg: ['g', 1000], l: ['ml', 1000], ud: ['ud', 1] };
const today = () => new Date().toISOString().slice(0, 10);

/** Registrar lo que se tira o se pierde, y ver lo último que se ha apuntado. */
export default function WasteModal({ ingredients, onClose, onDone }) {
  const list = useData(['consumption', 'waste'], () => api.get('/consumption/waste').then((r) => r.data), { retry: false });
  const [ingredientId, setIngredientId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('expired');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ing = ingredients.find((i) => i.id === ingredientId);

  async function add() {
    setBusy(true); setError('');
    try {
      await api.post('/consumption/waste', { ingredientId, quantity: (Number(amount.replace(',', '.')) || 0) / SMALL[ing.unit][1], reason, date });
      notify.success('Merma apuntada'); setAmount(''); list.refetch(); onDone?.();
    } catch (err) { setError(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setBusy(false); }
  }
  async function remove(entry) {
    if (!(await confirmDialog('¿Quitar esta merma?'))) return;
    try { await api.delete(`/consumption/waste/${entry.id}`); list.refetch(); onDone?.(); } catch { notify.error('No se ha podido quitar'); }
  }

  return (
    <Modal size="md" title="Registrar una merma" subtitle="Lo que se tira o se pierde explica parte de la diferencia" onClose={onClose}
      footer={<div className="space-y-2">{error && <ErrorBanner>{error}</ErrorBanner>}<button type="button" onClick={add} disabled={busy || !ing || !(Number(amount.replace(',', '.')) > 0)} className="h-12 w-full rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Apuntar merma'}</button></div>}>
      <div className="space-y-3">
        <Field label="Ingrediente">
          <Select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
            <option value="">Elige uno…</option>
            {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Cantidad${ing ? ` (${SMALL[ing.unit][0]})` : ''}`}><Input inputMode="decimal" className="text-right tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))} /></Field>
          <Field label="Fecha"><Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Motivo"><Select options={REASONS} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      {list.data?.entries?.length > 0 && (
        <div className="mt-6">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Últimos 30 días</p>
          <List>
            {list.data.entries.slice(0, 8).map((e) => (
              <ListRow key={e.id} title={e.name} subtitle={`${dateShort(e.date)} · ${REASONS.find(([k]) => k === e.reason)?.[1]}`} value={qty(e.quantity, e.unit)} valueSub={e.cost !== null ? money(e.cost) : undefined}
                trailing={<button type="button" aria-label="Quitar" onClick={() => remove(e)} className="h-8 w-8 rounded-full text-gray-300 hover:bg-gray-100 hover:text-rose-600">✕</button>} />
            ))}
          </List>
        </div>
      )}
    </Modal>
  );
}
