import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { inputCls, languageName } from './labels';
import ExtrasEditor, { fromEditor, toEditor } from './ExtrasEditor';

export default function CategoryModal({ category, parentId = null, parentName = '', languages, onClose, onSaved }) {
  const isSub = !!(parentId || category?.parentId);
  const [name, setName] = useState(category?.name || {});
  const [hidden, setHidden] = useState(!!category?.hidden);
  const [extras, setExtras] = useState(() => toEditor(category?.extras));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [translating, setTranslating] = useState(false);
  async function autoTranslate() {
    const main = languages[0];
    const to = languages.slice(1).filter((l) => !name[l]?.trim());
    if (!name[main]?.trim()) return setError('Escribe primero el nombre en el idioma principal');
    if (!to.length) return setError('Ya está todo traducido');
    setError('');
    setTranslating(true);
    try {
      const { data } = await api.post('/menu/translate', { from: main, to, items: [{ id: 'name', kind: 'category', text: name[main] }] });
      setName((n) => ({ ...(data.translations?.name || {}), ...Object.fromEntries(Object.entries(n).filter(([, t]) => t?.trim())) }));
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
      const body = { name, hidden, extras: fromEditor(extras), ...(parentId && !category?._id ? { parentId } : {}) };
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
      {languages.length > 1 && (
        <button type="button" disabled={translating} onClick={autoTranslate} className="w-full h-10 rounded-xl border border-gray-200 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">
          {translating ? 'Traduciendo…' : '✨ Traducir a los demás idiomas'}
        </button>
      )}
      <button type="button" disabled={saving} onClick={save} className="w-full h-12 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
    </div>
  );

  return (
    <Modal title={`${category?._id ? 'Editar' : 'Nueva'} ${isSub ? 'subcategoría' : 'categoría'}`} onClose={onClose} size="md" footer={footer}>
      <div className="space-y-3">
        {parentName && <p className="text-xs text-gray-500">Dentro de <b className="text-gray-800">{parentName}</b>. Hereda sus extras.</p>}
        {languages.map((lang, i) => (
          <label key={lang} className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">{languageName(lang)}{i === 0 && ' · principal'}</span>
            <input className={inputCls} value={name[lang] || ''} autoFocus={i === 0} maxLength={80} placeholder={i === 0 ? (isSub ? 'Clásicas, Sin gluten…' : 'Entrantes, Postres…') : ''}
              onChange={(e) => setName((n) => ({ ...n, [lang]: e.target.value }))} />
          </label>
        ))}
        <ExtrasEditor rows={extras} onChange={setExtras} languages={languages} scope="category" />
        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Ocultar de la web (sigue aquí, pero no se publica)
        </label>
      </div>
    </Modal>
  );
}
