import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

function RoomCard({ room, onEdit, onDelete }) {
  const pct = room.capacity > 0 ? Math.min(100, Math.round((room.tableCount / room.capacity) * 100)) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Capacity bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className={`h-full transition-all duration-500 ${pct >= 90 ? 'bg-rose-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h16.5a.75.75 0 0 1 0 1.5H18v8.75A2.75 2.75 0 0 1 15.25 15h-1.072l.798 3.06a.75.75 0 0 1-1.452.38L13.41 18H6.59l-.114.44a.75.75 0 0 1-1.452-.38L5.823 15H4.75A2.75 2.75 0 0 1 2 12.25V3.5h-.25A.75.75 0 0 1 1 2.75Z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Capacidad</p>
            <p className="text-lg font-bold text-gray-900">{room.capacity} <span className="text-sm font-normal text-gray-400">px</span></p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 text-base">{room.name}</h3>
        {room.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{room.description}</p>}

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            {room.tableCount} {room.tableCount === 1 ? 'mesa' : 'mesas'} asignadas
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onEdit(room)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-violet-50 hover:text-violet-600 text-gray-500 font-medium transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(room._id)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | room object
  const [form, setForm] = useState({ name: '', capacity: '', description: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/rooms').then(r => setRooms(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', capacity: '', description: '' }); setError(''); setModal('create'); };
  const openEdit   = (r)  => { setForm({ name: r.name, capacity: r.capacity, description: r.description }); setError(''); setModal(r); };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'create') {
        await api.post('/rooms', form);
      } else {
        await api.put(`/rooms/${modal._id}`, form);
      }
      await load();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sala? Las mesas asignadas quedarán sin sala.')) return;
    await api.delete(`/rooms/${id}`);
    load();
  };

  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Salas</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {rooms.length} sala{rooms.length !== 1 ? 's' : ''} · {totalCapacity} personas de capacidad total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Nueva sala
        </button>
      </div>

      {/* Grid */}
      {rooms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
          <div className="text-5xl mb-4">🏛️</div>
          <p className="text-gray-500 font-medium">Sin salas todavía</p>
          <p className="text-gray-400 text-sm mt-1">Crea una sala para organizar tus mesas</p>
          <button onClick={openCreate} className="mt-4 text-sm text-violet-600 hover:underline font-medium">
            Crear la primera sala →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(r => (
            <RoomCard key={r._id} room={r} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva sala' : 'Editar sala'}
          subtitle={modal !== 'create' ? modal.name : 'Define el nombre y la capacidad máxima'}
          onClose={closeModal}
        >
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre de la sala *</label>
              <input
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Salón principal, Terraza, Privado..."
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Capacidad máxima (personas) *</label>
              <input
                type="number" required min="1" value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="Ej: 40"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Número máximo de personas que caben en esta sala</p>
            </div>
            <div>
              <label className={labelCls}>Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Ej: Sala interior con climatización, vista al jardín..."
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear sala' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={closeModal}
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
