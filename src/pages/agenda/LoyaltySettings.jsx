import { useEffect, useState } from 'react';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, centsToInput, euros, inputCls, labelCls, parseEuros } from './utils';
import { Toggle } from '../../ui/kit';

/** Configuración → Fidelización: a reward every Nth paid visit. */
export default function LoyaltySettings() {
  const [saved, setSaved] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [every, setEvery] = useState('10');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('10');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const apply = (s) => {
    setSaved(s);
    setEnabled(s.enabled);
    setEvery(String(s.every));
    setType(s.reward.type);
    setValue(s.reward.type === 'amount' ? centsToInput(s.reward.value) : String(s.reward.value));
  };
  useEffect(() => { bookingsApi.loyalty().then(apply).catch((err) => setError(apiError(err))); }, []);

  if (!saved) return <p className="text-sm text-gray-400">{error || 'Cargando…'}</p>;

  const rewardValue = type === 'amount' ? parseEuros(value) : Number(value);
  const rewardText = type === 'amount' ? euros(rewardValue || 0) : `${rewardValue || 0} %`;
  const dirty = enabled !== saved.enabled || Number(every) !== saved.every || type !== saved.reward.type
    || (type === 'amount' ? rewardValue : Number(value)) !== saved.reward.value;

  async function save() {
    setError(''); setMsg('');
    setBusy(true);
    try {
      apply(await bookingsApi.saveLoyalty({ enabled, every: Number(every), reward: { type, value: rewardValue } }));
      setMsg('Guardado ✓');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <p className="text-sm text-gray-500">Premia a quien vuelve: cada cierto número de visitas pagadas, la siguiente tiene descuento. Al cobrar, la caja te avisa y lo aplica con un toque.</p>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3">
        <div>
          <p className="text-[15px] font-medium text-gray-900">Premio por visitas</p>
          <p className="text-xs text-gray-500">Cuenta las citas cobradas de cada cliente (también las pagadas con bono).</p>
        </div>
        <Toggle on={enabled} onChange={setEnabled} label="Activar el premio por visitas" />
      </div>

      <div className={`space-y-4 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <label className={labelCls} htmlFor="loy-every">El premio llega en la visita número</label>
          <input id="loy-every" className={`${inputCls} tabular-nums text-right !w-28`} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <p className={labelCls}>El premio es</p>
          <div className="inline-flex p-0.5 rounded-full bg-gray-100 mb-2">
            {[['percent', 'Un porcentaje'], ['amount', 'Un importe']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setType(key); setValue(key === 'percent' ? '10' : '10'); }}
                className={`px-3.5 py-1.5 text-[13px] rounded-full font-semibold ${type === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input className={`${inputCls} tabular-nums text-right !w-28`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Valor del premio" />
            <span className="text-sm text-gray-500">{type === 'percent' ? '% de descuento' : '€ de descuento'}</span>
          </div>
        </div>
        <p className="rounded-xl bg-violet-50 px-3.5 py-2.5 text-sm text-violet-900">
          Cada cliente tendrá <b>{rewardText} de descuento</b> en su visita nº <b>{Number(every) || '…'}</b>, la nº <b>{(Number(every) || 0) * 2 || '…'}</b>, y así sucesivamente.
        </p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} onClick={save} disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar'}</button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </section>
  );
}
