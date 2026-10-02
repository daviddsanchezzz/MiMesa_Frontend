import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SLUG_RE, publicSitePrefix, slugify } from '../lib/publicUrl';

/**
 * Configuración: the business's public address (vetrareserve.com/{slug}).
 * The old address keeps working after a change.
 */
export default function PublicAddressEditor() {
  const { business, refreshBusiness } = useAuth();
  const current = business?.slug || '';
  const [value, setValue] = useState(current);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!editing) setValue(current); }, [current, editing]);

  const clean = value.trim().toLowerCase();
  const formatOk = SLUG_RE.test(clean);
  const changed = clean !== current;

  const save = async (e) => {
    e.preventDefault();
    if (!formatOk || !changed) return;
    setSaving(true); setError('');
    try {
      await api.put('/auth/settings', { slug: clean });
      await refreshBusiness();
      setEditing(false); setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-gray-500">Dirección:</span>
        <span className="font-mono text-gray-800 break-all">{publicSitePrefix()}<b className="text-gray-900">{current || '—'}</b></span>
        <button type="button" onClick={() => { setEditing(true); setSaved(false); }} className="font-semibold text-violet-700 hover:underline">Cambiar</button>
        {saved && <span className="text-emerald-700 text-xs font-medium">Guardado. El enlace anterior sigue funcionando.</span>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <label htmlFor="public-slug" className="block text-sm font-medium text-gray-700">Dirección de tu página</label>
      <div className="flex items-stretch rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-violet-500 overflow-hidden">
        <span className="hidden sm:flex items-center pl-3.5 pr-1 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 font-mono shrink-0">{publicSitePrefix()}</span>
        <input id="public-slug" value={value} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck="false" maxLength={50}
          onChange={(e) => { setValue(e.target.value.toLowerCase().replace(/\s+/g, '-')); setError(''); }}
          onBlur={() => setValue((v) => slugify(v) || v)}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none" />
      </div>
      <p className={`text-xs ${!formatOk && clean ? 'text-rose-600' : 'text-gray-500'}`}>
        {!formatOk && clean
          ? 'Entre 3 y 50 letras minúsculas, números o guiones, sin tildes ni espacios.'
          : 'Si la cambias, el enlace anterior seguirá llevando a tu página.'}
      </p>
      {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!formatOk || !changed || saving}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold">
          {saving ? 'Guardando…' : 'Guardar dirección'}
        </button>
        <button type="button" onClick={() => { setEditing(false); setValue(current); setError(''); }}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
      </div>
    </form>
  );
}
