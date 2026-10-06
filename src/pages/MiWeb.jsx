import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useData } from '../lib/query';
import { Empty, PageHeader, Section, Tabs } from '../ui/kit';
import HoursEditor, { toInput } from './web/HoursEditor';
import { inputCls } from './carta/labels';

const TABS = [['hours', 'Horario'], ['closures', 'Cierres'], ['contact', 'Reservas y contacto']];
const MODES = [
  ['vetra', 'Con Vetra', 'La web lleva a tu página de reservas de Vetra.'],
  ['link', 'Con otro sistema', 'Pon el enlace (TheFork, tu propio sistema…).'],
  ['phone', 'Por teléfono', 'La web invita a llamar al teléfono del negocio.'],
  ['none', 'No se reserva', 'La web no ofrece reservas.'],
];
const label = 'block text-xs font-medium text-gray-500 mb-1';

const clean = (p) => ({ ...p, openingHours: p.openingHours.map((d) => ({ ...d, ranges: d.ranges.map((r) => ({ open: r.open, close: toInput(r.close) })) })) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Mi web: what the restaurant's website shows besides the menu — opening hours (their own, not the
 * reservation turnos), closures, how to book and where to find them. The website reads it from Vetra.
 */
export default function MiWeb() {
  useSetMobileHeader({ title: 'Mi web', action: false });
  const q = useData(['site'], () => api.get('/site').then((r) => clean(r.data)), { retry: false });
  const [tab, setTab] = useState('hours');
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => { if (q.data && !form) { setForm(q.data); setSaved(q.data); } }, [q.data, form]);
  const dirty = useMemo(() => form && saved && !same(form, saved), [form, saved]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put('/site', form);
      const next = clean(data);
      setForm(next);
      setSaved(next);
      toast.success('Guardado');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se ha podido guardar');
    } finally {
      setSaving(false);
    }
  }

  // Fills the hours and closures from the reservation turnos and vacations; nothing is saved until "Guardar"
  async function fromTurnos() {
    setSuggesting(true);
    try {
      const { data } = await api.get('/site/hours-suggestion');
      if (!data.found) return toast('No hay turnos ni vacaciones de reservas de los que copiar');
      const next = clean({ ...form, openingHours: data.openingHours, closures: data.closures.length ? data.closures : form.closures });
      setForm(next);
      toast.success('Copiado. Revísalo y pulsa «Guardar cambios»');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se ha podido copiar');
    } finally {
      setSuggesting(false);
    }
  }

  if (!form) return <p className="text-sm text-gray-400">{q.isError ? 'No se ha podido cargar.' : 'Cargando…'}</p>;
  const social = form.social;

  return (
    <div className="w-full space-y-6 pb-20">
      <PageHeader title="Mi web" subtitle="Lo que tu web muestra además de la carta: horario, cierres, cómo reservar y dónde encontrarte" />
      <Tabs full value={tab} options={TABS} onChange={setTab} />

      {tab === 'hours' && (
        <Section title="Horario de apertura"
          aside={<button type="button" onClick={fromTurnos} disabled={suggesting} className="text-[13px] font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50">{suggesting ? 'Copiando…' : 'Copiar de mis turnos'}</button>}>
          <p className="mb-3 text-[13px] text-gray-500">Es el horario que ven tus clientes en la web. No tiene por qué coincidir con los turnos de reservas ni con el del personal.</p>
          <HoursEditor hours={form.openingHours} onChange={(openingHours) => set({ openingHours })} />
        </Section>
      )}

      {tab === 'closures' && (
        <Section title="Cierres y vacaciones" aside={<button type="button" className="text-[13px] font-semibold text-violet-700" onClick={() => set({ closures: [...form.closures, { from: '', to: '', reason: '' }] })}>+ Añadir cierre</button>}>
          <p className="mb-3 text-[13px] text-gray-500">Días sueltos o periodos en los que no abres. La web los avisa y muestra «Cerrado hoy».</p>
          {form.closures.length === 0 ? <Empty>No hay cierres programados.</Empty> : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {form.closures.map((c, i) => (
                <li key={i} className="py-3.5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input type="date" className={inputCls} value={c.from} onChange={(e) => set({ closures: form.closures.map((x, idx) => (idx === i ? { ...x, from: e.target.value, to: x.to && x.to >= e.target.value ? x.to : e.target.value } : x)) })} aria-label="Desde" />
                    <span className="text-gray-400">–</span>
                    <input type="date" className={inputCls} value={c.to} min={c.from || undefined} onChange={(e) => set({ closures: form.closures.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)) })} aria-label="Hasta" />
                    <button type="button" aria-label="Quitar cierre" className="px-1.5 text-gray-400 hover:text-rose-600" onClick={() => set({ closures: form.closures.filter((_, idx) => idx !== i) })}>✕</button>
                  </div>
                  <input className={inputCls} value={c.reason} maxLength={200} placeholder="Motivo (opcional): vacaciones, obras…" onChange={(e) => set({ closures: form.closures.map((x, idx) => (idx === i ? { ...x, reason: e.target.value } : x)) })} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === 'contact' && (
        <div className="space-y-8">
          <Section title="¿Cómo se reserva?">
            <div className="space-y-2">
              {MODES.map(([mode, title, hint]) => (
                <label key={mode} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${form.reservations.mode === mode ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="reservation-mode" className="mt-1 accent-violet-600" checked={form.reservations.mode === mode} onChange={() => set({ reservations: { ...form.reservations, mode } })} />
                  <span><span className="block text-sm font-semibold text-gray-900">{title}</span><span className="block text-xs text-gray-500 mt-0.5">{hint}</span></span>
                </label>
              ))}
            </div>
            {form.reservations.mode === 'link' && (
              <label className="block mt-3"><span className={label}>Enlace de reservas</span>
                <input className={inputCls} inputMode="url" placeholder="https://…" value={form.reservations.url} onChange={(e) => set({ reservations: { ...form.reservations, url: e.target.value } })} /></label>
            )}
          </Section>

          <Section title="Contacto">
            <p className="mb-3 text-[13px] text-gray-500">El nombre, el teléfono y la dirección salen de «Datos del negocio» en Configuración.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className={label}>Email público</span><input className={inputCls} type="email" value={form.contactEmail} placeholder="hola@turestaurante.com" onChange={(e) => set({ contactEmail: e.target.value })} /></label>
              <label className="block"><span className={label}>Enlace de Google Maps</span><input className={inputCls} inputMode="url" value={form.mapsUrl} placeholder="https://maps.google.com/…" onChange={(e) => set({ mapsUrl: e.target.value })} /></label>
            </div>
          </Section>

          <Section title="Redes sociales">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[['instagram', 'Instagram', '@turestaurante'], ['tiktok', 'TikTok', '@turestaurante'], ['facebook', 'Facebook', 'https://facebook.com/…'], ['youtube', 'YouTube', 'https://youtube.com/…'], ['whatsapp', 'WhatsApp', '600 000 000']].map(([key, name, ph]) => (
                <label key={key} className="block"><span className={label}>{name}</span>
                  <input className={inputCls} value={social[key]} placeholder={ph} onChange={(e) => set({ social: { ...social, [key]: e.target.value } })} /></label>
              ))}
            </div>
          </Section>
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:left-60 z-30 px-4 lg:px-8 py-3 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">Tienes cambios sin guardar</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(saved)} className="h-10 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Descartar</button>
            <button type="button" onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
