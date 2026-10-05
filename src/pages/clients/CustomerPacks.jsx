import { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { PAY_METHODS, btnPrimary, btnSecondary, centsToInput, euros, inputCls, labelCls, parseEuros } from '../agenda/utils';
import { Section, SectionLink } from '../../ui/kit';

const niceDate = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

function SellModal({ customer, packs, onClose, onSold }) {
  const [packId, setPackId] = useState(packs[0]?._id || '');
  const pack = packs.find((p) => p._id === packId);
  const [price, setPrice] = useState(pack ? centsToInput(pack.price) : '');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function choose(id) {
    setPackId(id);
    const p = packs.find((x) => x._id === id);
    if (p) setPrice(centsToInput(p.price));
  }

  async function sell() {
    setError('');
    const cents = parseEuros(price);
    if (!pack) return setError('Elige un bono');
    if (cents === null) return setError('El precio no es válido');
    if (!method) return setError('Elige cómo ha pagado');
    setSaving(true);
    try {
      await bookingsApi.sellPack(customer._id, { packId, price: cents, method, note });
      onSold();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Vender bono a ${customer.name}`} subtitle="Queda registrado en la caja de hoy." onClose={onClose} size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={sell} disabled={saving}>{saving ? 'Guardando…' : `Cobrar ${euros(parseEuros(price) || 0)}`}</button>
        </div>
      )}>
      <div className="space-y-4">
        <div>
          <p className={labelCls}>Bono</p>
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden" role="radiogroup">
            {packs.map((p) => (
              <li key={p._id}>
                <button type="button" role="radio" aria-checked={packId === p._id} onClick={() => choose(p._id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left ${packId === p._id ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                  <span className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center border-2 ${packId === p._id ? 'border-violet-600' : 'border-gray-300'}`}>
                    {packId === p._id && <span className="w-2 h-2 rounded-full bg-violet-600" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">{p.name}</span>
                    <span className="block text-xs text-gray-500">{p.sessions} sesiones</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{euros(p.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className={labelCls}>Precio cobrado (€)</label>
          <input className={`${inputCls} tabular-nums text-right`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Puedes cambiarlo si haces un descuento.</p>
        </div>
        <div>
          <p className={labelCls}>Cómo paga</p>
          <div className="grid grid-cols-4 gap-2">
            {PAY_METHODS.map((m) => (
              <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                className={`rounded-xl border py-2.5 text-sm font-semibold flex flex-col items-center gap-0.5 ${method === m.key ? 'border-violet-600 bg-violet-50 text-violet-800 ring-1 ring-violet-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <span aria-hidden="true">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>
        <input className={inputCls} placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}

function PackCard({ p }) {
  const used = p.sessions - p.remaining;
  const live = p.status === 'active';
  return (
    <li className={`rounded-2xl border px-4 py-3 ${live ? 'border-violet-200 bg-violet-50/50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-[15px] font-semibold truncate ${live ? 'text-gray-900' : 'text-gray-500'}`}>{p.name}</p>
        <p className="shrink-0 text-sm tabular-nums"><b className={live ? 'text-violet-700' : 'text-gray-500'}>{p.remaining}</b> <span className="text-gray-500">de {p.sessions}</span></p>
      </div>
      <div className="mt-2 flex gap-1" aria-label={`${used} de ${p.sessions} sesiones usadas`}>
        {Array.from({ length: Math.min(p.sessions, 20) }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < used ? 'bg-gray-300' : live ? 'bg-violet-500' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        Comprado el {niceDate(p.soldAt)}
        {p.status === 'used_up' && ' · sesiones agotadas'}
        {p.status === 'expired' && ` · caducó el ${niceDate(p.expiresAt)}`}
        {live && p.expiresAt && ` · caduca el ${niceDate(p.expiresAt)}`}
      </p>
    </li>
  );
}

/** Ficha del cliente: the packs (bonos) it has bought and how many sessions are left. */
export default function CustomerPacks({ customer }) {
  const [packs, setPacks] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [selling, setSelling] = useState(false);
  const [showOld, setShowOld] = useState(false);

  const load = useCallback(() => {
    bookingsApi.customerPacks(customer._id).then(setPacks).catch(() => setPacks([]));
  }, [customer._id]);
  useEffect(() => { load(); bookingsApi.packs().then(setCatalog).catch(() => {}); }, [load]);

  if (!packs) return null;
  const live = packs.filter((p) => p.status === 'active');
  const old = packs.filter((p) => p.status !== 'active');
  // Nothing sold and nothing to sell: don't add noise to the file
  if (!packs.length && !catalog.length) return null;

  return (
    <Section title="Bonos" aside={catalog.length > 0 && <SectionLink onClick={() => setSelling(true)}>+ Vender bono</SectionLink>}>
      {live.length === 0 ? (
        <p className="text-sm text-gray-500 py-1">No tiene ningún bono activo.</p>
      ) : (
        <ul className="space-y-2.5">{live.map((p) => <PackCard key={p._id} p={p} />)}</ul>
      )}
      {old.length > 0 && (
        <>
          <button type="button" onClick={() => setShowOld((v) => !v)} className="mt-3 text-xs font-medium text-gray-500 hover:text-gray-800">
            {showOld ? 'Ocultar anteriores' : `Ver anteriores (${old.length})`}
          </button>
          {showOld && <ul className="mt-2 space-y-2.5">{old.map((p) => <PackCard key={p._id} p={p} />)}</ul>}
        </>
      )}
      {selling && <SellModal customer={customer} packs={catalog} onClose={() => setSelling(false)} onSold={() => { setSelling(false); load(); }} />}
    </Section>
  );
}

/** Ficha del cliente: how close the customer is to the next loyalty reward. */
export function CustomerLoyalty({ customer }) {
  const [l, setL] = useState(null);
  useEffect(() => { bookingsApi.customerLoyalty(customer._id).then(setL).catch(() => {}); }, [customer._id]);
  if (!l?.enabled) return null;
  const done = l.paidVisits % l.every;
  const reward = l.reward.type === 'percent' ? `${l.reward.value} % de descuento` : `${euros(l.reward.value)} de descuento`;
  return (
    <Section title="Fidelización">
      <p className="text-sm text-gray-700">
        {l.rewardDue
          ? <><b className="text-amber-700">En su próxima visita tiene premio:</b> {reward}.</>
          : <>Le {l.toNext === 1 ? 'falta' : 'faltan'} <b className="text-gray-900">{l.toNext}</b> {l.toNext === 1 ? 'visita' : 'visitas'} para el premio ({reward}).</>}
      </p>
      <div className="mt-2 flex gap-1" aria-label={`${done} de ${l.every} visitas`}>
        {Array.from({ length: Math.min(l.every, 20) }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? 'bg-amber-400' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">{l.paidVisits} {l.paidVisits === 1 ? 'visita pagada' : 'visitas pagadas'} en total</p>
    </Section>
  );
}
