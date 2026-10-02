import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { PAY_METHODS, btnSecondary, centsToInput, euros, inputCls, labelCls, parseEuros, timeInTz } from './utils';

const moneyInput = `${inputCls} tabular-nums text-right`;

/**
 * Charge an appointment when it ends: price (editable), products sold,
 * discount, tip and how they paid. With cash, it works out the change.
 */
export default function CheckoutModal({ booking, tz, onClose, onPaid }) {
  const [services, setServices] = useState(centsToInput(booking.totalPrice));
  const [extras, setExtras] = useState([]);
  const [discount, setDiscount] = useState('');
  const [tip, setTip] = useState('');
  const [method, setMethod] = useState('');
  const [given, setGiven] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const calc = useMemo(() => {
    const s = parseEuros(services);
    const d = parseEuros(discount);
    const t = parseEuros(tip);
    const ex = extras.map((x) => ({ ...x, cents: parseEuros(x.price), q: Math.max(1, Number(x.qty) || 1) }));
    const exTotal = ex.reduce((sum, x) => sum + (x.cents || 0) * x.q, 0);
    const invalid = s === null || d === null || t === null || ex.some((x) => x.cents === null);
    const total = (s || 0) + exTotal - (d || 0);
    const charged = total + (t || 0);
    const g = parseEuros(given);
    return { s, d, t, ex, exTotal, invalid, total, charged, change: g ? g - charged : null };
  }, [services, discount, tip, extras, given]);

  const setExtra = (i, patch) => setExtras((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const pctDiscount = (pct) => setDiscount(centsToInput(Math.round(((calc.s || 0) + calc.exTotal) * pct / 100)));

  async function pay() {
    setError('');
    if (!method) return setError('Elige cómo ha pagado');
    if (calc.invalid) return setError('Revisa los importes');
    if (calc.total < 0) return setError('El descuento es mayor que el total');
    if (calc.ex.some((x) => !x.name.trim())) return setError('Pon nombre a los productos');
    setSaving(true);
    try {
      const updated = await bookingsApi.checkout(booking._id, {
        method,
        services: calc.s,
        extras: calc.ex.map((x) => ({ name: x.name.trim(), price: x.cents || 0, qty: x.q })),
        discount: calc.d || 0,
        tip: calc.t || 0,
        note,
      });
      onPaid?.(updated);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Cobrar · ${booking.guestName}`} subtitle={`${timeInTz(booking.start, tz)} · ${booking.segments.map((x) => x.serviceName).join(' + ')}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Servicios (€)</label>
            <input className={moneyInput} inputMode="decimal" value={services} onChange={(e) => setServices(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Descuento (€)</label>
            <div className="flex gap-1.5">
              <input className={moneyInput} inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              {[10, 20].map((p) => (
                <button key={p} type="button" onClick={() => pctDiscount(p)} className="shrink-0 px-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">{p}%</button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className={labelCls}>Productos vendidos</p>
          {extras.map((x, i) => (
            <div key={i} className="flex gap-2">
              <input className={inputCls} placeholder="Champú, laca…" value={x.name} onChange={(e) => setExtra(i, { name: e.target.value })} maxLength={100} />
              <input className={`${moneyInput} !w-20`} inputMode="numeric" value={x.qty} onChange={(e) => setExtra(i, { qty: e.target.value.replace(/\D/g, '') })} aria-label="Cantidad" />
              <input className={`${moneyInput} !w-24`} inputMode="decimal" placeholder="€" value={x.price} onChange={(e) => setExtra(i, { price: e.target.value })} aria-label="Precio" />
              <button type="button" onClick={() => setExtras((l) => l.filter((_, idx) => idx !== i))} className="shrink-0 px-2 text-gray-400 hover:text-rose-600" aria-label="Quitar">✕</button>
            </div>
          ))}
          <button type="button" className="text-xs font-semibold text-violet-600 hover:text-violet-800"
            onClick={() => setExtras((l) => [...l, { name: '', qty: '1', price: '' }])}>+ Añadir producto</button>
        </div>

        <div>
          <p className={labelCls}>Cómo paga</p>
          <div className="grid grid-cols-4 gap-2">
            {PAY_METHODS.map((m) => (
              <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                className={`rounded-xl border py-2.5 text-sm font-semibold flex flex-col items-center gap-0.5 transition-colors ${
                  method === m.key ? 'border-violet-600 bg-violet-50 text-violet-800 ring-1 ring-violet-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <span aria-hidden="true">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Propina (€)</label>
            <input className={moneyInput} inputMode="decimal" placeholder="0" value={tip} onChange={(e) => setTip(e.target.value)} />
          </div>
          {method === 'cash' && (
            <div>
              <label className={labelCls}>Entrega (€)</label>
              <input className={moneyInput} inputMode="decimal" placeholder={centsToInput(calc.charged)} value={given} onChange={(e) => setGiven(e.target.value)} />
            </div>
          )}
        </div>
        {method === 'cash' && calc.change !== null && (
          <p className={`text-sm font-semibold ${calc.change >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {calc.change >= 0 ? `Cambio a devolver: ${euros(calc.change)}` : `Faltan ${euros(-calc.change)}`}
          </p>
        )}

        <input className={inputCls} placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />

        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Servicios</span><span className="tabular-nums">{euros(calc.s || 0)}</span></div>
          {calc.exTotal > 0 && <div className="flex justify-between text-gray-600"><span>Productos</span><span className="tabular-nums">{euros(calc.exTotal)}</span></div>}
          {(calc.d || 0) > 0 && <div className="flex justify-between text-gray-600"><span>Descuento</span><span className="tabular-nums">−{euros(calc.d)}</span></div>}
          {(calc.t || 0) > 0 && <div className="flex justify-between text-gray-600"><span>Propina</span><span className="tabular-nums">{euros(calc.t)}</span></div>}
          <div className="flex justify-between pt-1 border-t border-gray-200 text-base font-bold text-gray-900"><span>Total a cobrar</span><span className="tabular-nums">{euros(calc.charged)}</span></div>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" onClick={pay} disabled={saving}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-base font-bold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Cobrando…' : `Cobrar ${euros(calc.charged)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
