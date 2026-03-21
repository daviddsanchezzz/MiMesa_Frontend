import { useState, useEffect } from 'react';
import api from '../services/api';
import FloorPlan from '../components/FloorPlan';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [rooms,  setRooms]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ name: '', capacity: 2, roomId: '' });
  const [error,  setError]  = useState('');

  const load = async () => {
    const [t, r] = await Promise.all([api.get('/tables'), api.get('/rooms')]);
    setTables(t.data);
    setRooms(r.data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', capacity: 2, roomId: '' }); setError(''); setModal('create'); };
  const openEdit   = (t) => { setForm({ name: t.name, capacity: t.capacity, roomId: t.roomId?._id || '' }); setError(''); setModal(t); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, capacity: Number(form.capacity), roomId: form.roomId || null };
      if (modal === 'create') await api.post('/tables', payload);
      else                    await api.put(`/tables/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    await api.delete(`/tables/${id}`); load();
  };

  const handleStatusChange = async (id, status) => {
    await api.put(`/tables/${id}`, { status }); load();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Slim header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mesas</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {tables.length} mesa{tables.length !== 1 ? 's' : ''} · {rooms.length} sala{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Nueva mesa
        </button>
      </div>

      {/* Full-height floor plan */}
      <div className="flex-1 overflow-hidden">
        <FloorPlan
          tables={tables}
          rooms={rooms}
          onStatusChange={handleStatusChange}
          onRefresh={load}
          fullHeight={true}
        />
      </div>

      {/* Create / edit modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva mesa' : 'Editar mesa'}
          subtitle={modal !== 'create' ? modal.name : 'Añade una nueva mesa'}
          onClose={() => setModal(null)}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mesa 1, Terraza A, Barra..."
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Capacidad *</label>
                <input type="number" required min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sala</label>
                <select value={form.roomId}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className={inputCls}>
                  <option value="">Sin sala</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>{r.name} (cap. {r.capacity})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear mesa' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
