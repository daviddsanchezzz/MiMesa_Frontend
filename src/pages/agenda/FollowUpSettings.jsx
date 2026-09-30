import { useEffect, useState } from 'react';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, inputCls, labelCls } from './utils';
import { useAuth } from '../../context/AuthContext';
import UpgradeHint from '../../components/UpgradeHint';

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Card({ title, desc, checked, onToggle, children, sent, paused = false }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
          {sent !== undefined && <p className="text-xs text-gray-400 mt-1">Enviados en los últimos 30 días: {sent}</p>}
          {paused && <p className="text-xs font-medium text-amber-700 mt-1">En pausa: tu plan actual no lo incluye.</p>}
        </div>
        {onToggle && <Toggle checked={checked} onChange={onToggle} label={title} />}
      </div>
      {children}
    </section>
  );
}

/**
 * Configuración → Avisos a clientes (appointment businesses).
 * The 24h reminder is always on; the two follow-ups are optional.
 */
export default function FollowUpSettings() {
  const { business } = useAuth();
  const remindersOn = business?.capabilities?.bookingReminders !== false;
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    bookingsApi.followUps()
      .then((d) => { setData(d); setForm({ rebook: d.rebook.enabled, review: d.review.enabled, url: d.review.url, delay: d.review.delayHours }); })
      .catch((err) => setError(apiError(err)));
  }, []);

  if (!form) return error ? <p className="text-sm text-rose-600">{error}</p> : <p className="text-sm text-gray-400">Cargando…</p>;

  const dirty = form.rebook !== data.rebook.enabled || form.review !== data.review.enabled
    || form.url !== data.review.url || Number(form.delay) !== data.review.delayHours;
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); setError(''); };

  async function save() {
    setSaving(true);
    setError('');
    try {
      const d = await bookingsApi.saveFollowUps({
        rebook: { enabled: form.rebook },
        review: { enabled: form.review, url: form.url.trim(), delayHours: Number(form.delay) },
      });
      setData(d);
      setForm({ rebook: d.rebook.enabled, review: d.review.enabled, url: d.review.url, delay: d.review.delayHours });
      setSaved(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card title="Recordatorio de la cita"
        desc={remindersOn
          ? 'Email 24 horas antes, con el botón para cambiar o cancelar y liberar el hueco. Siempre activo para los clientes con email.'
          : 'Email 24 horas antes, con el botón para cambiar o cancelar y liberar el hueco.'}>
        {!remindersOn && <UpgradeHint plan="Basic">Los recordatorios automáticos van incluidos en los planes de pago.</UpgradeHint>}
      </Card>

      {data.available === false && (
        <UpgradeHint>«Te toca volver» y las reseñas automáticas son del plan Pro: Vetra escribe a tus clientes por ti.</UpgradeHint>
      )}

      <Card title="Te toca volver" checked={form.rebook} paused={data.available === false && data.rebook.enabled}
        onToggle={data.available === false && !data.rebook.enabled ? null : (v) => set({ rebook: v })} sent={data.sentLast30Days.rebook}
        desc="Cuando un cliente pasa de su ritmo habitual y no tiene cita, le llega un email con el botón para reservar. Uno por visita, por la mañana." />

      <Card title="Pedir opinión en Google" checked={form.review} paused={data.available === false && data.review.enabled}
        onToggle={data.available === false && !data.review.enabled ? null : (v) => set({ review: v })} sent={data.sentLast30Days.review}
        desc="Unas horas después de una cita atendida o cobrada, un email con el enlace a tu ficha de Google. Como mucho uno cada 4 meses por cliente.">
        {form.review && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2">
              <label className={labelCls}>Enlace para dejar reseña</label>
              <input className={inputCls} value={form.url} placeholder="https://g.page/r/…/review" onChange={(e) => set({ url: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">
                En tu Perfil de Empresa de Google: «Pedir reseñas» → copia el enlace.
              </p>
            </div>
            <div>
              <label className={labelCls}>Enviar a las</label>
              <select className={inputCls} value={form.delay} onChange={(e) => set({ delay: e.target.value })}>
                {[1, 2, 3, 6, 24].map((h) => <option key={h} value={h}>{h === 24 ? 'Al día siguiente' : `${h} h de la cita`}</option>)}
              </select>
            </div>
          </div>
        )}
      </Card>

      <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600 space-y-1.5">
        <p className="font-semibold text-gray-700">Cómo cumplimos la ley (LSSI y RGPD)</p>
        <p>Solo se envían a clientes que ya han venido, sobre tus propios servicios. Cada email lleva un enlace para darse de baja con un clic, y quien se da de baja no recibe ninguno de los dos.</p>
        <p>Al reservar online y en el email de confirmación se informa al cliente de estos avisos y de cómo rechazarlos.</p>
        <p>La opinión se pide a todos los clientes por igual y sin ofrecer nada a cambio, como exige Google.</p>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={!dirty || saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar'}</button>
        {saved && !dirty && <span className="text-sm text-emerald-700">Guardado</span>}
      </div>
    </div>
  );
}
