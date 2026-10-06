import { useEffect, useState } from 'react';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, inputCls, labelCls } from './utils';

const HOURS = [
  [0, 'Hasta la hora de la cita'],
  [1, '1 hora antes'],
  [2, '2 horas antes'],
  [3, '3 horas antes'],
  [4, '4 horas antes'],
  [6, '6 horas antes'],
  [12, '12 horas antes'],
  [24, '24 horas antes'],
  [48, '48 horas antes'],
  [72, '72 horas antes'],
];

// What customers can do with their appointment from the link in their emails.
export default function PolicySettings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    bookingsApi.policy().then((p) => { setSaved(p); setForm(p); }).catch((err) => setError(apiError(err)));
  }, []);

  if (!form) {
    return <section>{error ? <p className="text-sm text-rose-600">{error}</p> : <div className="h-24 animate-pulse bg-gray-100 rounded-xl" />}</section>;
  }
  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  async function save() {
    setBusy(true); setError(''); setMsg('');
    try {
      const p = await bookingsApi.savePolicy(form);
      setSaved(p); setForm(p); setMsg('Guardado');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Cambios y cancelaciones</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Tus clientes pueden cambiar o cancelar su cita desde el enlace de sus emails. Decide hasta cuándo.
        </p>
      </div>
      <div>
        <label className={labelCls} htmlFor="policy-hours">Se puede cambiar o cancelar online</label>
        <select id="policy-hours" className={inputCls} value={form.changeMinHours}
          onChange={(e) => setForm({ ...form, changeMinHours: Number(e.target.value) })}>
          {HOURS.map(([h, label]) => <option key={h} value={h}>{label}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-1.5">Pasado ese momento, el cliente verá tu teléfono para avisarte.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600" checked={form.allowReschedule}
          onChange={(e) => setForm({ ...form, allowReschedule: e.target.checked })} />
        <span>Pueden elegir ellos mismos otro día u hora <span className="text-gray-400">(si lo desactivas, solo podrán cancelar)</span></span>
      </label>
      <div>
        <label className={labelCls} htmlFor="policy-note">Texto de tu política <span className="font-normal text-gray-400">(opcional)</span></label>
        <textarea id="policy-note" className={inputCls} rows={3} maxLength={500} value={form.note}
          placeholder="Ej.: Si no puedes venir, avísanos con 24 h para dar el hueco a otra persona."
          onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <p className="text-xs text-gray-500 mt-1.5">Se muestra al reservar y en la página de la cita.</p>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy || !changed} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>
    </section>
  );
}
