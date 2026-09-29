import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { EmptyState, ErrorBanner, IconEdit, IconPlus, IconTrash, inputCls, labelCls } from './shared';

// ═══════════════════════════════════════════════════════════════════════════
// SALAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
export function SalasSection() {
  const [rooms,  setRooms]  = useState([]);
  const [tables, setTables] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ name: '', capacity: '', description: '' });
  const [error,  setError]  = useState('');

  const load = async () => {
    const [r, t] = await Promise.all([api.get('/rooms'), api.get('/tables')]);
    setRooms(r.data);
    setTables(t.data);
  };
  useEffect(() => { load(); }, []);

  const tableCount = (roomId) => tables.filter(t => t.roomId?._id === roomId).length;
  const totalCap   = rooms.reduce((s, r) => s + (r.capacity || 0), 0);

  const openCreate = () => { setForm({ name: '', capacity: '', description: '' }); setError(''); setModal('create'); };
  const openEdit   = (r) => { setForm({ name: r.name, capacity: r.capacity, description: r.description || '' }); setError(''); setModal(r); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (modal === 'create') await api.post('/rooms', payload);
      else                    await api.put(`/rooms/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sala? Las mesas asignadas quedarán sin sala.')) return;
    await api.delete(`/rooms/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rooms.length} sala{rooms.length !== 1 ? 's' : ''} · {totalCap} plazas totales
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <IconPlus /> Nueva sala
        </button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState text="Sin salas todavía" onAction={openCreate} actionLabel="Crear la primera sala" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const used = tableCount(room._id);
            const pct  = room.capacity > 0 ? Math.min(100, Math.round((used / room.capacity) * 100)) : 0;
            return (
              <div key={room._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{room.name}</h3>
                    {room.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg font-semibold shrink-0 ml-2">
                    {room.capacity} plazas
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{used} mesas asignadas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(room)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-violet-50 hover:text-violet-600 text-gray-500 font-medium transition-colors"
                  >
                    <IconEdit /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(room._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors"
                  >
                    <IconTrash /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva sala' : 'Editar sala'}
          subtitle={modal !== 'create' ? modal.name : 'Añade una nueva sala al restaurante'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Interior, Terraza, Privado..."
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Capacidad máx. *</label>
                <input type="number" required min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Vista al jardín, con aire acondicionado..."
                className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear sala' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
