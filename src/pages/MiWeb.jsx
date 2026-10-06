import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useData } from '../lib/query';
import { PageHeader, Section, SectionLink } from '../ui/kit';
import { inputCls } from './carta/labels';

const MODES = [
  ['vetra', 'Con Vetra', 'La web lleva a tu página de reservas de Vetra.'],
  ['link', 'Con otro sistema', 'Pon el enlace (TheFork, tu propio sistema…).'],
  ['phone', 'Por teléfono', 'La web invita a llamar al teléfono del negocio.'],
  ['none', 'No se reserva', 'La web no ofrece reservas.'],
];
const SOCIAL = [['instagram', 'Instagram', '@turestaurante'], ['tiktok', 'TikTok', '@turestaurante'], ['facebook', 'Facebook', 'https://facebook.com/…'], ['youtube', 'YouTube', 'https://youtube.com/…'], ['whatsapp', 'WhatsApp', '600 000 000']];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' };
const label = 'block text-xs font-medium text-gray-500 mb-1';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const rangesText = (ranges) => (ranges.length ? ranges.map((r) => `${r.open}–${r.close === '24:00' ? '00:00' : r.close}`).join(' · ') : 'Cerrado');

/** Mon–Fri with the same hours become one line: "Lun–Vie  13:00–16:00 · 20:00–23:30". */
function groupDays(openingHours) {
  const byDay = Object.fromEntries(openingHours.map((d) => [d.day, d.ranges]));
  const groups = [];
  for (const day of DAY_ORDER) {
    const last = groups[groups.length - 1];
    if (last && same(last.ranges, byDay[day])) last.days.push(day);
    else groups.push({ days: [day], ranges: byDay[day] || [] });
  }
  return groups.map((g) => ({ label: g.days.length === 1 ? DAY_SHORT[g.days[0]] : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`, text: rangesText(g.ranges) }));
}

const niceDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');

/**
 * Mi web: what the restaurant's website shows. The schedule, the closures and the contact data are not asked
 * again: they come from Horarios y cierres and Datos del negocio. Only how to book and the social links are set here.
 */
export default function MiWeb() {
  useSetMobileHeader({ title: 'Mi web', action: false });
  const q = useData(['site'], () => api.get('/site').then((r) => r.data), { retry: false });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data && !form) { const own = { reservations: q.data.reservations, social: q.data.social }; setForm(own); setSaved(own); }
  }, [q.data, form]);
  const dirty = useMemo(() => form && saved && !same(form, saved), [form, saved]);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put('/site', form);
      const own = { reservations: data.reservations, social: data.social };
      setForm(own);
      setSaved(own);
      toast.success('Guardado');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se ha podido guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!form || !q.data) return <p className="text-sm text-gray-400">{q.isError ? 'No se ha podido cargar.' : 'Cargando…'}</p>;
  const { schedule, business } = q.data;
  const setRes = (patch) => setForm((f) => ({ ...f, reservations: { ...f.reservations, ...patch } }));

  return (
    <div className="w-full space-y-9 pb-20">
      <PageHeader title="Mi web" subtitle="Lo que tu web muestra además de la carta" />

      <Section title="Horario" aside={<SectionLink to="/horarios">Editar en Horarios y cierres</SectionLink>}>
        <p className="mb-2 text-[13px] text-gray-500">Se toma de tus turnos de reservas, tus vacaciones y tus cierres. No hay que ponerlo otra vez.</p>
        <p className={`mb-2 text-sm font-semibold ${schedule.today.openNow ? 'text-emerald-700' : 'text-gray-600'}`}>
          {schedule.today.openNow ? 'Abierto ahora' : schedule.today.closed ? `Hoy cerrado${schedule.today.closureReason ? ` · ${schedule.today.closureReason}` : ''}` : 'Cerrado ahora'}
        </p>
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {groupDays(schedule.openingHours).map((g) => (
            <li key={g.label} className="py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[15px] font-medium text-gray-900">{g.label}</span>
              <span className="text-sm tabular-nums text-gray-700 text-right">{g.text}</span>
            </li>
          ))}
        </ul>
        {schedule.seasonal.length > 0 && (
          <p className="mt-2 text-[13px] text-gray-500">{schedule.seasonal.map((x) => `${x.name}: ${x.open}–${x.close} del ${niceDate(x.from)} al ${niceDate(x.to)}`).join(' · ')}</p>
        )}
        {schedule.closures.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Próximos cierres</p>
            <ul className="text-sm text-gray-700 space-y-0.5">
              {schedule.closures.slice(0, 6).map((c, i) => (
                <li key={i}>{c.from === c.to ? niceDate(c.from) : `${niceDate(c.from)} – ${niceDate(c.to)}`}{c.shift ? ` · solo ${c.shift}` : ''}{c.reason ? ` · ${c.reason}` : ''}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Contacto" aside={<SectionLink to="/configuracion?tab=negocio">Editar en Datos del negocio</SectionLink>}>
        <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
          {[['Teléfono', business.phone], ['Dirección', business.address], ['Email', business.email]].map(([name, value]) => (
            <li key={name} className="py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-gray-500">{name}</span>
              <span className={`text-right ${value ? 'text-gray-900' : 'text-amber-700'}`}>{value || 'Sin rellenar'}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="¿Cómo se reserva?">
        <div className="space-y-2">
          {MODES.map(([mode, title, hint]) => (
            <label key={mode} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${form.reservations.mode === mode ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="reservation-mode" className="mt-1 accent-violet-600" checked={form.reservations.mode === mode} onChange={() => setRes({ mode })} />
              <span><span className="block text-sm font-semibold text-gray-900">{title}</span><span className="block text-xs text-gray-500 mt-0.5">{hint}</span></span>
            </label>
          ))}
        </div>
        {form.reservations.mode === 'link' && (
          <label className="block mt-3"><span className={label}>Enlace de reservas</span>
            <input className={inputCls} inputMode="url" placeholder="https://…" value={form.reservations.url} onChange={(e) => setRes({ url: e.target.value })} /></label>
        )}
        {form.reservations.mode === 'vetra' && <p className="mt-2 text-[13px] text-gray-500">Gestiona tu página de reservas en <Link to="/pagina-reservas" className="font-semibold text-violet-700">Tu página de reservas</Link>.</p>}
      </Section>

      <Section title="Redes sociales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL.map(([key, name, ph]) => (
            <label key={key} className="block"><span className={label}>{name}</span>
              <input className={inputCls} value={form.social[key]} placeholder={ph} onChange={(e) => setForm((f) => ({ ...f, social: { ...f.social, [key]: e.target.value } }))} /></label>
          ))}
        </div>
      </Section>

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
