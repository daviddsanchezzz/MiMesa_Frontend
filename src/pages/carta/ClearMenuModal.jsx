import { useState } from 'react';
import { notify } from '../../lib/notify';
import Modal from '../../components/Modal';
import api from '../../services/api';

const WORD = 'ELIMINAR';

/** Starting over: deletes every dish, category, photo and the menú del día. Asks to type a word so it is never an accident. */
export default function ClearMenuModal({ items, categories, onClose, onDone }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = typed.trim().toUpperCase() === WORD;

  async function clear() {
    setBusy(true);
    setError('');
    try {
      await api.delete('/menu');
      notify.success('Carta eliminada');
      onDone();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se ha podido eliminar la carta');
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <div className="space-y-2">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="h-12 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Cancelar</button>
        <button type="button" onClick={clear} disabled={!ok || busy} className="flex-1 h-12 rounded-xl bg-rose-600 text-white font-semibold disabled:opacity-40">{busy ? 'Eliminando…' : 'Eliminar toda la carta'}</button>
      </div>
    </div>
  );

  return (
    <Modal title="Eliminar toda la carta" onClose={() => !busy && onClose()} size="sm" footer={footer}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Se borrarán <b>{items} {items === 1 ? 'plato' : 'platos'}</b> y <b>{categories} {categories === 1 ? 'categoría' : 'categorías'}</b>, con sus fotos, y el menú del día.
          Se quedan los idiomas. <b>No se puede deshacer.</b>
        </p>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Escribe {WORD} para confirmar</span>
          <input className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[15px] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </label>
      </div>
    </Modal>
  );
}
