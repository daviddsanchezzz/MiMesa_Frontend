import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Icon from '../ui/Icon';
import { PageHeader, PrimaryButton, MenuButton, Empty, SectionLink } from '../ui/kit';

function RoomRow({ room, onEdit, onDelete }) {
  const pct = room.capacity > 0 ? Math.min(100, Math.round((room.tableCount / room.capacity) * 100)) : 0;
  const tables = `${room.tableCount} ${room.tableCount === 1 ? 'mesa' : 'mesas'}`;
  return (
    <li>
      <div role="button" tabIndex={0} onClick={() => onEdit(room)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(room); } }}
        className="flex md:grid md:grid-cols-12 md:gap-4 items-center gap-3 px-2 py-3 rounded-xl cursor-pointer hover:bg-gray-50 active:bg-gray-100">
        <div className="md:col-span-6 flex items-center gap-3 min-w-0 flex-1">
          <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <Icon name="map" className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-gray-900 truncate">{room.name}</p>
            <p className="text-[13px] text-gray-500 truncate">
              <span className="md:hidden">{tables}{room.description ? ' · ' : ''}</span>{room.description || <span className="hidden md:inline text-gray-300">Sin descripción</span>}
            </p>
          </div>
        </div>
        <div className="hidden md:block md:col-span-2 text-sm text-gray-700 tabular-nums">{tables}</div>
        <div className="md:col-span-3 text-right md:text-left shrink-0">
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{room.capacity} <span className="font-normal text-gray-500">pers.</span></p>
          <div className="hidden md:block mt-1 h-1 w-24 rounded-full bg-gray-100 overflow-hidden" title={`${pct}% de la capacidad en mesas`}>
            <div className={`h-full ${pct >= 90 ? 'bg-rose-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="md:col-span-1 flex justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
          <MenuButton ariaLabel={`Opciones de ${room.name}`} className="w-9 h-9 justify-center"
            items={[
              { label: 'Editar', onClick: () => onEdit(room) },
              { label: 'Eliminar', onClick: () => onDelete(room._id) },
            ]}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
          </MenuButton>
        </div>
      </div>
    </li>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5';

export default function Rooms() {
  useSetMobileHeader({ title: 'Salas', action: { label: 'Sala', onClick: () => openCreate() } });
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
    if (!confirm('¿Eliminar esta sala? Las mesas asignadas quedarán sin sala.')) return false;
    await api.delete(`/rooms/${id}`);
    load();
    return true;
  };

  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Salas"
        subtitle={`${rooms.length} sala${rooms.length !== 1 ? 's' : ''} · ${totalCapacity} personas de capacidad total`}
        actions={<PrimaryButton onClick={openCreate}>Nueva sala</PrimaryButton>}
      />

      {rooms.length === 0 ? (
        <Empty action={<SectionLink onClick={openCreate}>Crear la primera sala</SectionLink>}>
          Todavía no hay salas. Crea una para organizar tus mesas.
        </Empty>
      ) : (
        <div>
          <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span className="col-span-6">Sala</span>
            <span className="col-span-2">Mesas</span>
            <span className="col-span-3">Capacidad</span>
            <span className="col-span-1" />
          </div>
          <ul className="divide-y divide-gray-100">
            {rooms.map(r => (
              <RoomRow key={r._id} room={r} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva sala' : 'Editar sala'}
          subtitle={modal !== 'create' ? modal.name : undefined}
          onClose={closeModal}
          footer={
            <div className="flex items-center justify-between gap-2">
              {modal !== 'create' ? (
                <button type="button" onClick={async () => { if (await handleDelete(modal._id)) closeModal(); }}
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                  Eliminar
                </button>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeModal}
                  className="h-10 px-3.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                  Cancelar
                </button>
                <button type="submit" form="room-form"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                  {modal === 'create' ? 'Crear sala' : 'Guardar'}
                </button>
              </div>
            </div>
          }
        >
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-4">{error}</p>
          )}
          <form id="room-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Salón principal, Terraza, Privado…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Capacidad máxima</label>
              <input
                type="number" required min="1" value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="Ej: 40"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Personas que caben en la sala como máximo.</p>
            </div>
            <div>
              <label className={labelCls}>Descripción <span className="font-normal text-gray-400">(opcional)</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Ej: interior con climatización, vista al jardín…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
