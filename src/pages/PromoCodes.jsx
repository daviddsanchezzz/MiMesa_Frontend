import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
  </svg>
);

export default function PromoCodes() {
  const [promos,   setPromos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [creating, setCreating] = useState(false);
  const [form,     setForm]     = useState({ code: '', description: '', expiresAt: '', maxUses: '' });

  const load = async () => {
    try {
      const res = await api.get('/promos');
      setPromos(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar códigos');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/promos', {
        code:        form.code.trim(),
        description: form.description.trim(),
        expiresAt:   form.expiresAt || null,
        maxUses:     form.maxUses ? parseInt(form.maxUses, 10) : null,
      });
      setForm({ code: '', description: '', expiresAt: '', maxUses: '' });
      setCreating(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear código');
    }
  };

  const handleToggle = async (promo) => {
    try {
      await api.put(`/promos/${promo._id}`, { active: !promo.active });
      setPromos(ps => ps.map(p => p._id === promo._id ? { ...p, active: !p.active } : p));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este código?')) return;
    try {
      await api.delete(`/promos/${id}`);
      setPromos(ps => ps.filter(p => p._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const isExpired = (p) => p.expiresAt && new Date() > new Date(p.expiresAt);
  const isMaxed   = (p) => p.maxUses !== null && p.usedCount >= p.maxUses;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Códigos promocionales</h2>
          <p className="text-sm text-gray-400 mt-0.5">Los clientes pueden usarlos al reservar online.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors shrink-0"
        >
          <IconPlus /> Nuevo código
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {creating && (
        <Modal onClose={() => { setCreating(false); setError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nuevo código promocional</h3>
            <div>
              <label className={labelCls}>Código *</label>
              <input className={`${inputCls} uppercase`} value={form.code} required maxLength={32}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="VERANO2024" />
            </div>
            <div>
              <label className={labelCls}>Descripción (visible para el cliente)</label>
              <input className={inputCls} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="10% de descuento en tu reserva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha de expiración</label>
                <input type="date" className={inputCls} value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Usos máximos</label>
                <input type="number" min="1" className={inputCls} value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  placeholder="Sin límite" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setCreating(false); setError(''); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Cargando...</p>
        ) : promos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No hay códigos promocionales.</p>
        ) : promos.map(p => {
          const expired = isExpired(p);
          const maxed   = isMaxed(p);
          const invalid = expired || maxed;
          const statusLabel = !p.active ? 'Inactivo' : expired ? 'Expirado' : maxed ? 'Agotado' : 'Activo';
          const statusCls   = !p.active || invalid ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700';
          return (
            <div key={p._id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-sm text-gray-900 tracking-wide">{p.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
                </div>
                {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.usedCount}{p.maxUses ? `/${p.maxUses}` : ''} usos · {fmtDate(p.expiresAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(p)}
                  title={p.active ? 'Desactivar' : 'Activar'}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    p.active ? 'bg-violet-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    p.active ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p._id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 -m-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
