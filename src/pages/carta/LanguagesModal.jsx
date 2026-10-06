import { useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { LANGUAGES, chipCls, languageName } from './labels';

export default function LanguagesModal({ languages, onClose, onSaved }) {
  const [chosen, setChosen] = useState(languages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (code) => setChosen((l) => (l.includes(code) ? l.filter((x) => x !== code) : l.length >= 6 ? l : [...l, code]));
  const makeMain = (code) => setChosen((l) => [code, ...l.filter((x) => x !== code)]);

  async function save() {
    if (!chosen.length) return setError('Elige al menos un idioma');
    setSaving(true);
    setError('');
    try {
      await api.put('/menu/settings', { languages: chosen });
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
    <Modal title="Idiomas de la carta" subtitle="Hasta 6. Lo que ya has escrito no se pierde si quitas uno." onClose={onClose} size="md" footer={footer}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(([code, label]) => (
            <button key={code} type="button" onClick={() => toggle(code)} className={chipCls(chosen.includes(code))}>{label}</button>
          ))}
        </div>
        {chosen.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">El primero es el principal: es el que se muestra si falta una traducción</p>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {chosen.map((code, i) => (
                <li key={code} className="px-3 py-2 flex items-center gap-3 text-sm">
                  <span className="flex-1 text-gray-900">{languageName(code)}</span>
                  {i === 0 ? <span className="text-xs font-semibold text-violet-700">Principal</span>
                    : <button type="button" onClick={() => makeMain(code)} className="text-xs font-semibold text-gray-500 hover:text-violet-700">Hacer principal</button>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
