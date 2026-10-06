import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { inputCls, languageName } from './labels';

export default function CategoryModal({ category, languages, onClose, onSaved }) {
  const [name, setName] = useState(category?.name || {});
  const [hidden, setHidden] = useState(!!category?.hidden);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body = { name, hidden };
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
    <Modal title={category?._id ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose} size="sm" footer={footer}>
      <div className="space-y-3">
        {languages.map((lang, i) => (
          <label key={lang} className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">{languageName(lang)}{i === 0 && ' · principal'}</span>
            <input className={inputCls} value={name[lang] || ''} autoFocus={i === 0} maxLength={80} placeholder={i === 0 ? 'Entrantes, Postres…' : ''}
              onChange={(e) => setName((n) => ({ ...n, [lang]: e.target.value }))} />
          </label>
        ))}
        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Ocultar de la web (sigue aquí, pero no se publica)
        </label>
      </div>
    </Modal>
  );
}
