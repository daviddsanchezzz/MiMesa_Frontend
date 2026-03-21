import { useState, useEffect } from 'react';
import api from '../services/api';
import FloorPlan from '../components/FloorPlan';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

const emptyRange = () => ({ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' });

function buildPreview(ranges) {
  const names = [];
  for (const r of ranges) {
    const from = Number(r.from);
    const to   = Number(r.to);
    if (!from || !to || from > to) continue;
    for (let i = from; i <= to; i++) names.push(`${r.prefix}${i}`);
  }
  return names;
}

export default function Tables() {
  const [tables,  setTables]  = useState([]);
  const [rooms,   setRooms]   = useState([]);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ name: '', capacity: 2, roomId: '' });
  const [error,   setError]   = useState('');

  // Quick creator state
  const [quickOpen,   setQuickOpen]   = useState(false);
  const [ranges,      setRanges]      = useState([emptyRange()]);
  const [quickError,  setQuickError]  = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const updateRange = (i, field, value) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const addRange    = () => setRanges(rs => [...rs, emptyRange()]);
  const removeRange = (i) => setRanges(rs => rs.filter((_, idx) => idx !== i));

  const preview = buildPreview(ranges);

  const handleQuickCreate = async () => {
    setQuickError('');
    if (preview.length === 0) { setQuickError('Define al menos un rango válido'); return; }
    if (preview.length > 200) { setQuickError('Máximo 200 mesas por operación'); return; }
    const tables = [];
    for (const r of ranges) {
      const from = Number(r.from), to = Number(r.to);
      if (!from || !to || from > to) continue;
      for (let i = from; i <= to; i++) {
        tables.push({ name: `${r.prefix}${i}`, capacity: Number(r.capacity) || 2, roomId: r.roomId || null });
      }
    }
    try {
      setQuickLoading(true);
      await api.post('/tables/bulk', { tables });
      await load();
      setQuickOpen(false);
      setRanges([emptyRange()]);
    } catch (err) {
      setQuickError(err.response?.data?.message || 'Error al crear mesas');
    } finally {
      setQuickLoading(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setRanges([emptyRange()]); setQuickError(''); setQuickOpen(true); }}
            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-violet-500">
              <path d="M2 2.75A.75.75 0 0 1 2.75 2h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 2.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 5.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
            </svg>
            Creación rápida
          </button>
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

      {/* Quick creator modal */}
      {quickOpen && (
        <Modal
          title="Creación rápida de mesas"
          subtitle="Define rangos numéricos y se crearán todas de golpe"
          onClose={() => setQuickOpen(false)}
        >
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {ranges.map((r, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rango {i + 1}</span>
                  {ranges.length > 1 && (
                    <button onClick={() => removeRange(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className={labelCls}>Prefijo</label>
                    <input value={r.prefix} onChange={e => updateRange(i, 'prefix', e.target.value)}
                      placeholder="Mesa " className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Desde</label>
                    <input type="number" min="1" value={r.from} onChange={e => updateRange(i, 'from', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Hasta</label>
                    <input type="number" min="1" value={r.to} onChange={e => updateRange(i, 'to', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Capacidad</label>
                    <input type="number" min="1" value={r.capacity} onChange={e => updateRange(i, 'capacity', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sala</label>
                    <select value={r.roomId} onChange={e => updateRange(i, 'roomId', e.target.value)} className={inputCls}>
                      <option value="">Sin sala</option>
                      {rooms.map(rm => <option key={rm._id} value={rm._id}>{rm.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addRange}
            className="w-full mt-3 border border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 py-2 rounded-xl text-sm font-medium transition-colors">
            + Añadir otro rango
          </button>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-violet-700 mb-2">
                Vista previa — {preview.length} mesa{preview.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {preview.map((name, i) => (
                  <span key={i} className="bg-white border border-violet-200 text-violet-700 text-xs px-2 py-0.5 rounded-lg">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {quickError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{quickError}</div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={handleQuickCreate} disabled={quickLoading || preview.length === 0}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {quickLoading ? 'Creando...' : `Crear ${preview.length} mesa${preview.length !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setQuickOpen(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

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
