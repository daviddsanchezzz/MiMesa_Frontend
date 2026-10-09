import { useMemo, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { Segmented } from '../../ui/kit';
import { shrinkImage } from '../../lib/image';
import ExtrasEditor, { fromEditor, toEditor } from './ExtrasEditor';
import { ALLERGENS, TAGS, chipCls, inputCls, languageName } from './labels';
import { confirmDialog } from '../../ui/confirm';
import { ErrorBanner } from '../../ui/feedback';

const toggle = (list, key) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);

/** One dish: texts per language, price (locked when it comes from the TPV), allergens and labels. */
const nameOf = (c, lang) => c.name[lang] || Object.values(c.name)[0] || '';
/** [[id, "Pizzas"], [id, "Pizzas › Sin gluten"], …]: each category followed by its subcategories. */
function categoryOptions(categories, lang) {
  return categories.filter((c) => !c.parentId).flatMap((c) => [
    [c._id, nameOf(c, lang)],
    ...categories.filter((s) => s.parentId === c._id).map((s) => [s._id, `${nameOf(c, lang)} › ${nameOf(s, lang)}`]),
  ]);
}

export default function ItemModal({ item, categoryId, categories, languages, canMove, onMove, onClose, onSaved }) {
  const editing = !!item?._id;
  const locked = item?.priceSource === 'tpv';
  const [lang, setLang] = useState(languages[0]);
  const [name, setName] = useState(item?.name || {});
  const [description, setDescription] = useState(item?.description || {});
  const [price, setPrice] = useState(item?.price === null || item?.price === undefined ? '' : String(item.price).replace('.', ','));
  const [category, setCategory] = useState(item?.categoryId || categoryId || categoryOptions(categories, languages[0])[0]?.[0] || '');
  const [allergens, setAllergens] = useState(item?.allergens || []);
  const [tags, setTags] = useState(item?.tags || []);
  const [hidden, setHidden] = useState(!!item?.hidden);
  const [extras, setExtras] = useState(() => toEditor(item?.extras));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Photo: the one already saved, a new one picked (shrunk in the browser) or "removed"
  const fileRef = useRef(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const shownPhoto = photoPreview || (removePhoto ? '' : item?.photo?.url || '');

  async function pickPhoto(file) {
    if (!file) return;
    setError('');
    try {
      const blob = await shrinkImage(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
      setRemovePhoto(false);
    } catch (err) {
      setError(err.message || 'No se ha podido leer la foto');
    }
  }

  // Fills the empty languages from the main one (never touches what is written)
  const [translating, setTranslating] = useState(false);
  async function autoTranslate() {
    const main = languages[0];
    const items = [];
    if (name[main]?.trim()) items.push({ id: 'name', kind: 'dish', text: name[main] });
    if (description[main]?.trim()) items.push({ id: 'desc', kind: 'description', text: description[main] });
    const to = languages.slice(1).filter((l) => (name[main]?.trim() && !name[l]?.trim()) || (description[main]?.trim() && !description[l]?.trim()));
    if (!items.length) return setError('Escribe primero el nombre en el idioma principal');
    if (!to.length) return setError('Ya está todo traducido');
    setError('');
    setTranslating(true);
    try {
      const { data } = await api.post('/menu/translate', { from: main, to, items });
      const tr = data.translations || {};
      setName((n) => ({ ...Object.fromEntries(Object.entries(tr.name || {}).filter(([l]) => !n[l]?.trim())), ...n }));
      setDescription((d) => ({ ...Object.fromEntries(Object.entries(tr.desc || {}).filter(([l]) => !d[l]?.trim())), ...d }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido traducir');
    } finally {
      setTranslating(false);
    }
  }

  // A dot on the languages that still lack the name
  const options = useMemo(() => languages.map((l) => [l, `${languageName(l)}${name[l] ? '' : ' •'}`]), [languages, name]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body = {
        categoryId: category, name, description, allergens, tags, hidden, extras: fromEditor(extras),
        ...(locked ? {} : { price: price.trim() === '' ? null : Number(price.replace(',', '.')) }),
      };
      const saved = editing ? (await api.put(`/menu/items/${item._id}`, body)).data : (await api.post('/menu/items', body)).data;
      if (photoBlob) {
        const form = new FormData();
        form.append('photo', photoBlob, `plato.${photoBlob.type === 'image/webp' ? 'webp' : 'jpg'}`);
        await api.post(`/menu/items/${saved._id}/photo`, form);
      } else if (removePhoto && item?.photo?.url) {
        await api.delete(`/menu/items/${saved._id}/photo`);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!await confirmDialog(`¿Borrar «${name[languages[0]] || 'este plato'}» de la carta?`)) return;
    try {
      await api.delete(`/menu/items/${item._id}`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido borrar');
    }
  }

  const footer = (
    <div className="space-y-2">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="flex gap-2">
        {editing && <button type="button" onClick={remove} className="h-12 px-4 rounded-xl border border-gray-300 text-sm font-medium text-rose-600">Borrar</button>}
        <button type="button" disabled={saving} onClick={save} className="flex-1 h-12 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );

  return (
    <Modal title={editing ? 'Editar plato' : 'Nuevo plato'} onClose={onClose} size="lg" footer={footer}>
      <div className="space-y-5">
        {item?.retired && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900">
            Este plato ya no aparece en el TPV. Puedes borrarlo de la carta o mantenerlo.
            <button type="button" className="block mt-1 font-semibold underline" onClick={async () => { await api.put(`/menu/items/${item._id}`, { retired: false }); onSaved(); }}>Mantenerlo en la carta</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-20 h-20 shrink-0 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center text-2xl text-gray-300">
            {shownPhoto ? <img src={shownPhoto} alt="" className="w-full h-full object-cover" /> : <span aria-hidden="true">📷</span>}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">
                {shownPhoto ? 'Cambiar foto' : 'Añadir foto'}
              </button>
              {shownPhoto && (
                <button type="button" onClick={() => { setPhotoBlob(null); setPhotoPreview(''); setRemovePhoto(true); }} className="h-9 px-3.5 rounded-full text-[13px] font-semibold text-gray-500 hover:text-rose-600">Quitar</button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Se reduce sola antes de subirla.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {languages.length > 1 && (
          <div className="flex items-center justify-between gap-3">
            <Segmented value={lang} onChange={setLang} options={options} size="sm" />
            <button type="button" disabled={translating} onClick={autoTranslate} className="shrink-0 h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
              {translating ? 'Traduciendo…' : '✨ Traducir'}
            </button>
          </div>
        )}
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Nombre{lang === languages[0] && ' *'}</span>
            <input className={inputCls} value={name[lang] || ''} maxLength={120} autoFocus={!editing}
              onChange={(e) => setName((n) => ({ ...n, [lang]: e.target.value }))} placeholder={lang === languages[0] ? 'Croquetas de jamón' : 'Traducción (opcional)'} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Descripción</span>
            <textarea className={`${inputCls} resize-none`} rows={2} maxLength={500} value={description[lang] || ''}
              onChange={(e) => setDescription((d) => ({ ...d, [lang]: e.target.value }))} placeholder="Ingredientes, cómo se sirve…" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Precio (€, IVA incluido)</span>
            <input className={`${inputCls} tabular-nums text-right`} inputMode="decimal" value={price} disabled={locked} placeholder="Consultar"
              onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Categoría</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions(categories, languages[0]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        </div>
        {locked && <p className="-mt-3 text-xs text-gray-500">🔒 El precio viene del TPV{item.externalId ? ` (código ${item.externalId})` : ''}. Cámbialo allí y vuelve a importar.</p>}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Alérgenos</p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => <button key={a.key} type="button" className={chipCls(allergens.includes(a.key))} onClick={() => setAllergens((l) => toggle(l, a.key))}><span aria-hidden="true">{a.icon}</span>{a.label}</button>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Etiquetas</p>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => <button key={t.key} type="button" className={chipCls(tags.includes(t.key))} onClick={() => setTags((l) => toggle(l, t.key))}><span aria-hidden="true">{t.icon}</span>{t.label}</button>)}
          </div>
        </div>

        <ExtrasEditor rows={extras} onChange={setExtras} languages={languages} lang={lang} scope="dish" />

        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Ocultar de la web
        </label>

        {editing && canMove && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onMove(-1)} className="h-9 px-3 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700">↑ Subir en la lista</button>
            <button type="button" onClick={() => onMove(1)} className="h-9 px-3 rounded-full border border-gray-200 text-[13px] font-semibold text-gray-700">↓ Bajar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
