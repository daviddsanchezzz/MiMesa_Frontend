import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { Segmented } from '../../ui/kit';
import { inputCls, languageName } from './labels';
import ExtrasEditor, { fromEditor, toEditor } from './ExtrasEditor';

export default function CategoryModal({ category, parentId = null, parentName = '', languages, onClose, onSaved }) {
  const isSub = !!(parentId || category?.parentId);
  const [name, setName] = useState(category?.name || {});
  const [description, setDescription] = useState(category?.description || {});
  const [lang, setLang] = useState(languages[0]);
  const [hidden, setHidden] = useState(!!category?.hidden);
  const [extras, setExtras] = useState(() => toEditor(category?.extras));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(() => languages.map((l) => [l, `${languageName(l)}${name[l]?.trim() ? '' : ' •'}`]), [languages, name]);
  const [translating, setTranslating] = useState(false);
  async function autoTranslate() {
    const main = languages[0];
    const to = languages.slice(1).filter((l) => !name[l]?.trim());
    if (!name[main]?.trim()) return setError('Escribe primero el nombre en el idioma principal');
    const toDesc = languages.slice(1).filter((l) => !description[l]?.trim());
    if (!to.length && !(description[main]?.trim() && toDesc.length)) return setError('Ya está todo traducido');
    setError('');
    setTranslating(true);
    try {
      const reqs = [
        ...(to.length ? [{ id: 'name', kind: 'category', text: name[main], targets: to }] : []),
        ...(description[main]?.trim() && toDesc.length ? [{ id: 'description', kind: 'description', text: description[main], targets: toDesc }] : []),
      ];
      const { data } = await api.post('/menu/translate', { from: main, to: languages.slice(1), items: reqs });
      const keepWritten = (n) => Object.fromEntries(Object.entries(n).filter(([, t]) => t?.trim()));
      if (data.translations?.name) setName((n) => ({ ...data.translations.name, ...keepWritten(n) }));
      if (data.translations?.description) setDescription((d) => ({ ...data.translations.description, ...keepWritten(d) }));
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
      const body = { name, description, hidden, extras: fromEditor(extras), ...(parentId && !category?._id ? { parentId } : {}) };
      if (category?._id) await api.put(`/menu/categories/${category._id}`, body);
      else await api.post('/menu/categories', body);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido guardar');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="button" disabled={saving} onClick={save} className="w-full h-12 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
    </div>
  );

  return (
    <Modal title={`${category?._id ? 'Editar' : 'Nueva'} ${isSub ? 'subcategoría' : 'categoría'}`} onClose={onClose} size="md" footer={footer}>
      <div className="space-y-3">
        {parentName && <p className="text-xs text-gray-500">Dentro de <b className="text-gray-800">{parentName}</b>. Hereda sus extras.</p>}
        {languages.length > 1 && (
          <div className="flex items-center justify-between gap-3">
            <Segmented value={lang} onChange={setLang} options={options} size="sm" />
            <button type="button" disabled={translating} onClick={autoTranslate} className="shrink-0 h-9 px-3.5 rounded-full border border-gray-200 text-[13px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
              {translating ? 'Traduciendo…' : '✨ Traducir'}
            </button>
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Nombre{lang === languages[0] && ' *'}</span>
          <input className={inputCls} value={name[lang] || ''} autoFocus maxLength={80}
            placeholder={lang === languages[0] ? (isSub ? 'Clásicas, Sin gluten…' : 'Entrantes, Postres…') : 'Traducción (opcional)'}
            onChange={(e) => setName((n) => ({ ...n, [lang]: e.target.value }))} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Descripción (opcional, sale bajo el título)</span>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={300} value={description[lang] || ''}
            placeholder={lang === languages[0] ? 'Masa fina, horno de leña…' : 'Traducción (opcional)'}
            onChange={(e) => setDescription((d) => ({ ...d, [lang]: e.target.value }))} />
        </label>
        <ExtrasEditor rows={extras} onChange={setExtras} languages={languages} lang={lang} scope="category" />
        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Ocultar de la web (sigue aquí, pero no se publica)
        </label>
      </div>
    </Modal>
  );
}
