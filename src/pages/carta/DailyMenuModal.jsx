import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { Segmented } from '../../ui/kit';
import { ALLERGENS, chipCls, inputCls, languageName } from './labels';

const WEEK = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];
const STARTER = [{ name: { es: 'Primeros' }, options: [] }, { name: { es: 'Segundos' }, options: [] }, { name: { es: 'Postre' }, options: [] }];
const toggle = (list, key) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);

/** Menú del día: price, the days it is on and the courses with their options. */
export default function DailyMenuModal({ daily, languages, onClose, onSaved }) {
  const [lang, setLang] = useState(languages[0]);
  const [active, setActive] = useState(daily ? daily.active : true);
  const [title, setTitle] = useState(daily?.title || {});
  const [includes, setIncludes] = useState(daily?.includes || {});
  const [price, setPrice] = useState(daily?.price === null || daily?.price === undefined ? '' : String(daily.price).replace('.', ','));
  const [days, setDays] = useState(daily?.days || []);
  const [from, setFrom] = useState(daily?.from || '');
  const [to, setTo] = useState(daily?.to || '');
  const [courses, setCourses] = useState(daily?.courses?.length ? daily.courses : STARTER.map((c) => ({ ...c, name: { [languages[0]]: c.name.es } })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(() => languages.map((l) => [l, languageName(l)]), [languages]);
  const setCourse = (i, patch) => setCourses((list) => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setOption = (i, j, patch) => setCourse(i, { options: courses[i].options.map((o, idx) => (idx === j ? { ...o, ...patch } : o)) });

  // Translates every text of the menu that is missing in the other languages (what is written stays)
  const [translating, setTranslating] = useState(false);
  async function autoTranslate() {
    const main = languages[0];
    const to = languages.slice(1);
    const items = [];
    const need = (texts) => to.some((l) => !texts?.[l]?.trim());
    if (title[main]?.trim() && need(title)) items.push({ id: 'title', kind: 'title', text: title[main] });
    if (includes[main]?.trim() && need(includes)) items.push({ id: 'includes', kind: 'note', text: includes[main] });
    courses.forEach((c, i) => {
      if (c.name[main]?.trim() && need(c.name)) items.push({ id: `c${i}`, kind: 'course', text: c.name[main] });
      c.options.forEach((o, j) => { if (o.name[main]?.trim() && need(o.name)) items.push({ id: `c${i}o${j}`, kind: 'option', text: o.name[main] }); });
    });
    if (!items.length) return setError('Ya está todo traducido (o falta escribir el idioma principal)');
    setError('');
    setTranslating(true);
    try {
      const { data } = await api.post('/menu/translate', { from: main, to, items });
      const tr = data.translations || {};
      const merge = (current, add) => ({ ...(add || {}), ...Object.fromEntries(Object.entries(current || {}).filter(([, t]) => t?.trim())) });
      setTitle((t) => merge(t, tr.title));
      setIncludes((t) => merge(t, tr.includes));
      setCourses((list) => list.map((c, i) => ({
        ...c,
        name: merge(c.name, tr[`c${i}`]),
        options: c.options.map((o, j) => ({ ...o, name: merge(o.name, tr[`c${i}o${j}`]) })),
      })));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido traducir');
    } finally {
      setTranslating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.put('/menu/daily', {
        active, title, includes, from, to, days,
        price: price.trim() === '' ? null : Number(price.replace(',', '.')),
        // Courses or options left without a name are dropped, not an error
        courses: courses.map((c) => ({ ...c, options: c.options.filter((o) => Object.values(o.name || {}).some((t) => t?.trim())) }))
          .filter((c) => Object.values(c.name || {}).some((t) => t?.trim())),
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido guardar');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {languages.length > 1 && (
        <button type="button" disabled={translating} onClick={autoTranslate} className="w-full h-10 rounded-xl border border-gray-200 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
          {translating ? 'Traduciendo…' : '✨ Traducir lo que falta'}
        </button>
      )}
      <button type="button" disabled={saving} onClick={save} className="w-full h-12 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
    </div>
  );

  return (
    <Modal title="Menú del día" subtitle="Precio cerrado con apartados para elegir" onClose={onClose} size="lg" footer={footer}>
      <div className="space-y-5">
        <label className="flex items-center gap-2.5 text-sm font-medium text-gray-800">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Mostrarlo en la web
        </label>

        {languages.length > 1 && <Segmented value={lang} onChange={setLang} options={options} size="sm" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Título</span>
            <input className={inputCls} value={title[lang] || ''} maxLength={80} placeholder="Menú del día" onChange={(e) => setTitle((t) => ({ ...t, [lang]: e.target.value }))} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Precio (€)</span>
            <input className={`${inputCls} tabular-nums text-right`} inputMode="decimal" value={price} placeholder="14,50" onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Incluye</span>
          <input className={inputCls} value={includes[lang] || ''} maxLength={200} placeholder="Pan, bebida y postre o café" onChange={(e) => setIncludes((t) => ({ ...t, [lang]: e.target.value }))} />
        </label>

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Qué días se sirve <span className="font-normal text-gray-400">(sin marcar = todos)</span></p>
          <div className="flex gap-1.5">
            {WEEK.map(([d, label]) => (
              <button key={d} type="button" onClick={() => setDays((l) => toggle(l, d))} className={`${chipCls(days.includes(d))} w-10 justify-center px-0`}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="block"><span className="block text-xs font-medium text-gray-500 mb-1">Desde (opcional)</span><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="block"><span className="block text-xs font-medium text-gray-500 mb-1">Hasta (opcional)</span><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        </div>

        <div className="space-y-4">
          {courses.map((c, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input className={`${inputCls} font-semibold`} value={c.name[lang] || ''} maxLength={60} placeholder="Apartado (Primeros…)" onChange={(e) => setCourse(i, { name: { ...c.name, [lang]: e.target.value } })} />
                <button type="button" aria-label="Quitar apartado" className="px-2 text-gray-400 hover:text-rose-600" onClick={() => setCourses((l) => l.filter((_, idx) => idx !== i))}>✕</button>
              </div>
              {c.options.map((o, j) => (
                <div key={j}>
                  <div className="flex items-center gap-2">
                    <input className={inputCls} value={o.name[lang] || ''} maxLength={120} placeholder="Plato" onChange={(e) => setOption(i, j, { name: { ...o.name, [lang]: e.target.value } })} />
                    <button type="button" aria-label="Quitar plato" className="px-2 text-gray-400 hover:text-rose-600" onClick={() => setCourse(i, { options: c.options.filter((_, idx) => idx !== j) })}>✕</button>
                  </div>
                  <details className="mt-1">
                    <summary className="text-xs text-gray-500 cursor-pointer">Alérgenos{o.allergens?.length ? ` (${o.allergens.length})` : ''}</summary>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ALLERGENS.map((a) => (
                        <button key={a.key} type="button" className={chipCls((o.allergens || []).includes(a.key))} onClick={() => setOption(i, j, { allergens: toggle(o.allergens || [], a.key) })}>
                          <span aria-hidden="true">{a.icon}</span>{a.label}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
              <button type="button" className="text-[13px] font-semibold text-violet-700" onClick={() => setCourse(i, { options: [...c.options, { name: {}, allergens: [] }] })}>+ Añadir plato</button>
            </div>
          ))}
          {courses.length < 6 && (
            <button type="button" className="text-[13px] font-semibold text-violet-700" onClick={() => setCourses((l) => [...l, { name: {}, options: [] }])}>+ Añadir apartado</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
