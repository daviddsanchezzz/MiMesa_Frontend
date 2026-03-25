import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
  </svg>
);
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
  </svg>
);
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
  </svg>
);
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v4.27l2.78 1.6a.75.75 0 1 1-.75 1.3L7.4 9.23A.75.75 0 0 1 7 8.5V4a.75.75 0 0 1 .75-.75H8Z" clipRule="evenodd" />
  </svg>
);

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">
      {msg}
    </div>
  );
}

function EmptyState({ onAction, actionLabel, text }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5 text-gray-300">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-medium">{text}</p>
      {onAction && (
        <button onClick={onAction} className="mt-3 text-sm text-violet-600 hover:underline font-medium">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SALAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function SalasSection() {
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

// ═══════════════════════════════════════════════════════════════════════════
// MESAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function MesasSection() {
  const [tables, setTables] = useState([]);
  const [rooms,  setRooms]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ name: '', capacity: 2, roomId: '' });
  const [error,  setError]  = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    const [t, r] = await Promise.all([api.get('/tables'), api.get('/rooms')]);
    setTables(t.data);
    setRooms(r.data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', capacity: 2, roomId: '' }); setError(''); setModal('create'); };
  const openEdit   = (t) => { setForm({ name: t.name, capacity: t.capacity, roomId: t.roomId?._id || '' }); setError(''); setModal(t); };

  // Quick creator
  const [quickOpen,    setQuickOpen]    = useState(false);
  const [ranges,       setRanges]       = useState([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' }]);
  const [quickError,   setQuickError]   = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const updateRange = (i, field, value) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const addRange    = () => setRanges(rs => [...rs, { prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' }]);
  const removeRange = (i) => setRanges(rs => rs.filter((_, idx) => idx !== i));

  const quickPreview = (() => {
    const names = [];
    for (const r of ranges) {
      const from = Number(r.from), to = Number(r.to);
      if (!from || !to || from > to) continue;
      for (let i = from; i <= to; i++) names.push(`${r.prefix}${i}`);
    }
    return names;
  })();

  const handleQuickCreate = async () => {
    setQuickError('');
    if (quickPreview.length === 0) { setQuickError('Define al menos un rango válido'); return; }
    if (quickPreview.length > 200) { setQuickError('Máximo 200 mesas por operación'); return; }
    const tbls = [];
    for (const r of ranges) {
      const from = Number(r.from), to = Number(r.to);
      if (!from || !to || from > to) continue;
      for (let i = from; i <= to; i++)
        tbls.push({ name: `${r.prefix}${i}`, capacity: Number(r.capacity) || 2, roomId: r.roomId || null });
    }
    try {
      setQuickLoading(true);
      await api.post('/tables/bulk', { tables: tbls });
      await load();
      setQuickOpen(false);
      setRanges([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' }]);
    } catch (err) {
      setQuickError(err.response?.data?.message || 'Error al crear mesas');
    } finally {
      setQuickLoading(false);
    }
  };

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
    await api.delete(`/tables/${id}`);
    load();
  };

  const filtered = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.roomId?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, t) => {
    const key   = t.roomId ? t.roomId._id : '__none__';
    const label = t.roomId ? t.roomId.name : 'Sin sala';
    if (!acc[key]) acc[key] = { label, rows: [] };
    acc[key].rows.push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mesa o sala..."
            className="w-full border border-gray-300 rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setRanges([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' }]); setQuickError(''); setQuickOpen(true); }}
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
            <IconPlus /> Nueva mesa
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text={search ? 'Sin resultados' : 'Sin mesas todavía'}
          onAction={!search ? openCreate : null}
          actionLabel="Crear la primera mesa"
        />
      ) : (
        <div className="space-y-5">
          {Object.values(grouped).map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                {group.label}
                <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                  {group.rows.length}
                </span>
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                {group.rows.map(t => (
                  <div key={t._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="#6366f1" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v5.75A2.75 2.75 0 0 1 9.25 12H4.75A2.75 2.75 0 0 1 2 9.25V3.5h-.25A.75.75 0 0 1 1 2.75Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.capacity} personas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-violet-50 hover:text-violet-600 text-gray-400 font-medium transition-colors"
                      >
                        <IconEdit /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                      >
                        <IconTrash /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
                  <div>
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
          {quickPreview.length > 0 && (
            <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-violet-700 mb-2">
                Vista previa — {quickPreview.length} mesa{quickPreview.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {quickPreview.map((name, i) => (
                  <span key={i} className="bg-white border border-violet-200 text-violet-700 text-xs px-2 py-0.5 rounded-lg">{name}</span>
                ))}
              </div>
            </div>
          )}
          {quickError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{quickError}</div>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleQuickCreate} disabled={quickLoading || quickPreview.length === 0}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              {quickLoading ? 'Creando...' : `Crear ${quickPreview.length} mesa${quickPreview.length !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setQuickOpen(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva mesa' : 'Editar mesa'}
          subtitle={modal !== 'create' ? modal.name : 'Añade una nueva mesa'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
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
              <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear mesa' : 'Guardar cambios'}
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

// ═══════════════════════════════════════════════════════════════════════════
// TURNOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
const DAYS = [
  { value: 1, label: 'L', full: 'Lunes'      },
  { value: 2, label: 'M', full: 'Martes'     },
  { value: 3, label: 'X', full: 'Miércoles'  },
  { value: 4, label: 'J', full: 'Jueves'     },
  { value: 5, label: 'V', full: 'Viernes'    },
  { value: 6, label: 'S', full: 'Sábado'     },
  { value: 0, label: 'D', full: 'Domingo'    },
];

const SHIFT_COLORS = [
  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { bg: 'bg-rose-50',    text: 'text-rose-700',     border: 'border-rose-200',    dot: 'bg-rose-400'    },
  { bg: 'bg-emerald-50', text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-50',  text: 'text-violet-700',   border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { bg: 'bg-sky-50',     text: 'text-sky-700',      border: 'border-sky-200',     dot: 'bg-sky-400'     },
];

const colorOf = (index) => SHIFT_COLORS[index % SHIFT_COLORS.length];

const emptyShiftForm = () => ({
  name: '', startTime: '12:00', endTime: '16:00',
  days: [1,2,3,4,5,6,0], subShifts: [],
  startDate: '', endDate: '',
});

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function TurnosSection() {
  const [shifts, setShifts] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(emptyShiftForm());
  const [error,  setError]  = useState('');

  const load = async () => { const r = await api.get('/shifts'); setShifts(r.data); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyShiftForm()); setError(''); setModal('create'); };
  const openEdit   = (s)  => {
    setForm({
      name: s.name, startTime: s.startTime || '12:00', endTime: s.endTime || '16:00',
      days: s.days || [0,1,2,3,4,5,6], subShifts: s.subShifts.map(ss => ({ ...ss })),
      startDate: s.startDate || '', endDate: s.endDate || '',
    });
    setError(''); setModal(s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.days.length) { setError('Selecciona al menos un día'); return; }
    if ((form.startDate && !form.endDate) || (!form.startDate && form.endDate)) {
      setError('Si indicas rango de fechas, debes rellenar tanto inicio como fin'); return;
    }
    try {
      const payload = {
        name: form.name, startTime: form.startTime, endTime: form.endTime,
        days: form.days, subShifts: form.subShifts.filter(ss => ss.time),
        startDate: form.startDate || null, endDate: form.endDate || null,
      };
      if (modal === 'create') await api.post('/shifts', payload);
      else                    await api.put(`/shifts/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este turno?')) return;
    await api.delete(`/shifts/${id}`); load();
  };

  const toggleDay    = (v) => setForm(f => ({ ...f, days: f.days.includes(v) ? f.days.filter(d => d !== v) : [...f.days, v] }));
  const addSubShift  = ()  => setForm(f => ({ ...f, subShifts: [...f.subShifts, { time: '', label: '' }] }));
  const rmSubShift   = (i) => setForm(f => ({ ...f, subShifts: f.subShifts.filter((_, idx) => idx !== i) }));
  const updSubShift  = (i, key, val) => setForm(f => ({
    ...f, subShifts: f.subShifts.map((ss, idx) => idx === i ? { ...ss, [key]: val } : ss),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {shifts.length} turno{shifts.length !== 1 ? 's' : ''} configurado{shifts.length !== 1 ? 's' : ''}
        </p>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <IconPlus /> Nuevo turno
        </button>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          text="Sin turnos configurados"
          onAction={openCreate}
          actionLabel="Crear el primer turno"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift, idx) => {
            const clr = colorOf(idx);
            const isSpecific = !!(shift.startDate && shift.endDate);
            return (
              <div key={shift._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                {/* Name + time range */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`} />
                    <h3 className="font-semibold text-gray-900 truncate">{shift.name}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${clr.bg} ${clr.text}`}>
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>

                {/* Specific badge */}
                {isSpecific && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Específico</span>
                    <span className="opacity-70">{fmtDate(shift.startDate)} – {fmtDate(shift.endDate)}</span>
                  </div>
                )}

                {/* Day pills */}
                <div className="flex gap-1">
                  {DAYS.map(d => (
                    <span key={d.value} title={d.full}
                      className={`w-6 h-6 rounded-md text-[9px] flex items-center justify-center font-bold ${
                        shift.days?.includes(d.value) ? `${clr.bg} ${clr.text}` : 'bg-gray-100 text-gray-300'
                      }`}>
                      {d.label}
                    </span>
                  ))}
                </div>

                {/* Sub-shifts */}
                {shift.subShifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shift.subShifts.map((ss, i) => (
                      <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${clr.bg} ${clr.border} ${clr.text}`}>
                        <IconClock /> {ss.time}
                        {ss.label && <span className="opacity-60">· {ss.label}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Franjas de 30 min automáticas</p>
                )}

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button onClick={() => openEdit(shift)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-violet-50 hover:text-violet-600 text-gray-500 font-medium transition-colors">
                    <IconEdit /> Editar
                  </button>
                  <button onClick={() => handleDelete(shift._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors">
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
          title={modal === 'create' ? 'Nuevo turno' : 'Editar turno'}
          subtitle={modal !== 'create' ? modal.name : 'Configura el horario y los días del turno'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mediodía, Noche, Brunch..."
                className={inputCls} />
            </div>

            {/* Time range */}
            <div>
              <label className={labelCls}>Horario *</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input type="time" required value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className={`${inputCls} flex-1 min-w-0`} />
                <span className="text-gray-400 text-sm font-medium text-center shrink-0">hasta</span>
                <input type="time" required value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className={`${inputCls} flex-1 min-w-0`} />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className={labelCls}>Días activos *</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      form.days.includes(d.value)
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional date range (specific shift) */}
            <div>
              <label className={labelCls}>
                Rango de fechas
                <span className="text-gray-400 font-normal ml-1 text-xs">(opcional — deja vacío para turno general)</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input type="date" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={`${inputCls} flex-1 min-w-0`} />
                <span className="text-gray-400 text-sm font-medium text-center shrink-0">hasta</span>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={`${inputCls} flex-1 min-w-0`} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Un turno específico tiene prioridad sobre el turno general con el mismo nombre en ese período.
              </p>
            </div>

            {/* Optional specific slots */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <label className={`${labelCls} mb-0`}>Horarios específicos</label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Opcional — sin horarios se generan franjas de 30 min dentro del rango
                  </p>
                </div>
                <button type="button" onClick={addSubShift}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-semibold shrink-0 ml-2 mt-0.5">
                  <IconPlus /> Añadir
                </button>
              </div>
              {form.subShifts.length > 0 && (
                <div className="space-y-2">
                  {form.subShifts.map((ss, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
                        <IconClock />
                        <input type="time" required value={ss.time}
                          onChange={e => updSubShift(i, 'time', e.target.value)}
                          className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none w-24" />
                        <span className="text-gray-300 shrink-0">·</span>
                        <input type="text" value={ss.label}
                          onChange={e => updSubShift(i, 'label', e.target.value)}
                          placeholder="Etiqueta (ej: Primera noche)"
                          className="text-sm text-gray-500 bg-transparent focus:outline-none flex-1 min-w-0" />
                      </div>
                      <button type="button" onClick={() => rmSubShift(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition-colors shrink-0">
                        <IconX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear turno' : 'Guardar cambios'}
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

// ═══════════════════════════════════════════════════════════════════════════
// VACACIONES SECTION
// ═══════════════════════════════════════════════════════════════════════════
function VacacionesSection() {
  const [vacations, setVacations] = useState([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => { const r = await api.get('/vacations'); setVacations(r.data); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/vacations', form);
      setForm({ startDate: '', endDate: '', reason: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este período de cierre?')) return;
    await api.delete(`/vacations/${id}`); load();
  };

  const fmtRange = (startDate, endDate) => {
    const fmt = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = vacations.filter(v => v.endDate >= today);
  const past     = vacations.filter(v => v.endDate < today);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Añadir período de cierre</h3>
        <ErrorBanner msg={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha inicio *</label>
              <input type="date" required value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha fin *</label>
              <input type="date" required value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Motivo <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Vacaciones de verano, obras, festivo..."
              className={inputCls} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            <IconPlus /> Añadir cierre
          </button>
        </form>
      </div>

      {/* Upcoming closures */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Próximos cierres</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {upcoming.map(v => (
              <div key={v._id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-500">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fmtRange(v.startDate, v.endDate)}</p>
                    {v.reason && <p className="text-xs text-gray-400 mt-0.5">{v.reason}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(v._id)}
                  className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                >
                  <IconTrash /> Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past closures */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Cierres pasados</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden opacity-60">
            {past.map(v => (
              <div key={v._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm text-gray-600">{fmtRange(v.startDate, v.endDate)}</p>
                  {v.reason && <p className="text-xs text-gray-400 mt-0.5">{v.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(v._id)}
                  className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {vacations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Sin períodos de cierre configurados</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO SECTION
// ═══════════════════════════════════════════════════════════════════════════
function PublicoSection() {
  const { business, refreshBusiness } = useAuth();
  const [brandColor, setBrandColor] = useState(business?.brandColor || '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null); // 'url' | 'embed'
  const publicUrl = `${window.location.origin}/public/${business?.id}/reserve`;
  const embedCode = `<iframe\n  id="tableo-frame"\n  src="${publicUrl}?embed=1"\n  style="width:100%; border:none; min-height:500px;"\n></iframe>\n<script>\n  window.addEventListener("message", function(e) {\n    if (e.data.type === "TABLEO_HEIGHT")\n      document.getElementById("tableo-frame").style.height = e.data.height + "px";\n  });\n<\/script>`;

  useEffect(() => {
    if (business?.brandColor) setBrandColor(business.brandColor);
  }, [business]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleColorChange = async (newColor) => {
    setBrandColor(newColor);
    setSaving(true);
    try {
      await api.put('/auth/settings', { brandColor: newColor });
      await refreshBusiness();
    } catch (err) {
      console.error('Error updating brand color:', err);
      setBrandColor(business?.brandColor || '#3B82F6');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Color Corporativo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Personaliza el color principal que se mostrara en la pagina de reservas publicas.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Color seleccionado</p>
              <p className="text-xs text-gray-500 uppercase font-mono">{brandColor}</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              Guardando...
            </div>
          )}
        </div>
        <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <button
            className="px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: brandColor }}
          >
            Reservar Mesa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">URL Publica para Reservas</h3>
        <p className="text-sm text-gray-600 mb-4">
          Comparte esta URL con tus clientes para que puedan hacer reservas online directamente.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50"
          />
          <button
            onClick={() => copyToClipboard(publicUrl, 'url')}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            {copied === 'url' ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Integrar en tu web (iframe)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Copia este codigo y pegalo en la web de tu restaurante para que los clientes puedan reservar sin salir de tu pagina.
        </p>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed mb-3">
{embedCode}
        </pre>
        <button
          onClick={() => copyToClipboard(embedCode, 'embed')}
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
        >
          {copied === 'embed' ? 'Copiado' : 'Copiar codigo'}
        </button>
      </div>
    </div>
  );
}

function LimitesSection() {
  const { business, refreshBusiness } = useAuth();
  const [maxReservationPeople, setMaxReservationPeople] = useState(business?.maxReservationPeople || 20);
  const [maxPeoplePerSlot, setMaxPeoplePerSlot] = useState(business?.maxPeoplePerSlot || '');
  const [reservationDuration, setReservationDuration] = useState(business?.reservationDuration || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business?.maxReservationPeople) setMaxReservationPeople(business.maxReservationPeople);
    setMaxPeoplePerSlot(business?.maxPeoplePerSlot || '');
    setReservationDuration(business?.reservationDuration || '');
  }, [business]);

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      const maxPpl = maxReservationPeople === '' ? null : Number(maxReservationPeople);
      const perSlot = maxPeoplePerSlot === '' ? null : Number(maxPeoplePerSlot);
      const duration = reservationDuration === '' ? null : Number(reservationDuration);
      await api.put('/auth/settings', {
        maxReservationPeople: maxPpl,
        maxPeoplePerSlot: perSlot,
        reservationDuration: duration,
      });
      await refreshBusiness();
    } catch (err) {
      console.error('Error saving limits settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Maximo de Personas por Reserva</h3>
        <p className="text-sm text-gray-600 mb-4">
          Establece el numero maximo de personas que pueden hacer una reserva en una sola solicitud.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={maxReservationPeople}
            onChange={(e) => setMaxReservationPeople(e.target.value)}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={saving}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">personas maximo</p>
            <p className="text-xs text-gray-500">Por reserva individual</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Maximo de Personas por Turno</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Deja vacio para no establecer limite por turno.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            placeholder="Sin limite"
            value={maxPeoplePerSlot}
            onChange={(e) => setMaxPeoplePerSlot(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={saving}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">personas maximo</p>
            <p className="text-xs text-gray-500">Por franja horaria simultanea</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Duracion por Mesa</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Deja vacio para no bloquear franjas posteriores.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            placeholder="Sin bloqueo"
            value={reservationDuration}
            onChange={(e) => setReservationDuration(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={saving}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">minutos</p>
            <p className="text-xs text-gray-500">Tiempo bloqueado por reserva</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveLimits}
          disabled={saving}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saving && (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

function NegocioSection() {
  const { business, refreshBusiness, hasRole } = useAuth();
  const canEdit = hasRole('manager');
  const [form, setForm] = useState({
    name: business?.name || '',
    email: business?.email || '',
    phone: business?.phone || '',
    cif: business?.cif || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: business?.name || '',
      email: business?.email || '',
      phone: business?.phone || '',
      cif: business?.cif || '',
    });
  }, [business]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      await api.put('/auth/settings', form);
      await refreshBusiness();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Datos del negocio</h3>
        <p className="text-sm text-gray-500 mb-4">Nombre, contacto y datos fiscales del restaurante.</p>
        <ErrorBanner msg={error} />
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} value={form.name} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <input className={inputCls} value={form.phone} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>CIF</label>
              <input className={inputCls} value={form.cif} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, cif: e.target.value }))} />
            </div>
          </div>
          {canEdit && (
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function PromoSection() {
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
    <div className="space-y-4">
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

      {/* Create modal */}
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

      {/* List */}
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
              {/* Info */}
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
              {/* Actions */}
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

// ═══════════════════════════════════════════════════════════════════════════
// MARKETING SECTION
// ═══════════════════════════════════════════════════════════════════════════
function MarketingSection() {
  const [subscribers,  setSubscribers]  = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [sending,      setSending]      = useState(false);
  const [result,       setResult]       = useState(null); // { sent, errors }
  const [error,        setError]        = useState('');
  const [view,         setView]         = useState('compose'); // compose | history | subscribers

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get('/marketing/subscribers'),
      api.get('/marketing/campaigns'),
    ]);
    setSubscribers(s.data);
    setCampaigns(c.data);
  };
  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!subject.trim() || !body.trim()) { setError('El asunto y el cuerpo son obligatorios'); return; }
    if (!confirm(`¿Enviar esta campaña a ${subscribers.length} suscriptores?`)) return;
    try {
      setSending(true);
      const r = await api.post('/marketing/send', { subject, body });
      setResult(r.data);
      setSubject(''); setBody('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const recentCampaigns = campaigns.filter(c => {
    const ago = Date.now() - new Date(c.sentAt).getTime();
    return ago < 30 * 24 * 60 * 60 * 1000;
  }).length;
  const remaining = Math.max(0, 3 - recentCampaigns);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Marketing</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {subscribers.length} suscriptor{subscribers.length !== 1 ? 'es' : ''} activo{subscribers.length !== 1 ? 's' : ''} · {remaining}/3 envíos disponibles este mes
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {['compose', 'history', 'subscribers'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${view === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {v === 'compose' ? 'Redactar' : v === 'history' ? 'Historial' : 'Suscriptores'}
            </button>
          ))}
        </div>
      </div>

      {/* Legal notice */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-xs text-violet-700 leading-relaxed">
        <strong>Aviso legal:</strong> Solo puedes enviar emails a clientes que aceptaron explícitamente recibir comunicaciones.
        Cada email incluye un enlace de baja automático. El límite es de 3 campañas por mes.
        Tú eres el responsable del tratamiento de estos datos según el RGPD.
      </div>

      {view === 'compose' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
              ✓ Enviado a {result.sent} suscriptores{result.errors?.length > 0 ? ` (${result.errors.length} fallidos)` : ''}.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          {subscribers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aún no tienes suscriptores. Aparecerán aquí cuando los clientes acepten recibir comunicaciones al reservar.
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Asunto *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: ¡Menú especial este fin de semana!"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mensaje *</label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  rows={8} placeholder="Escribe tu mensaje aquí. El saludo personalizado y el pie con enlace de baja se añaden automáticamente."
                  className={`${inputCls} resize-y min-h-[160px]`} />
                <p className="text-xs text-gray-400 mt-1">El pie con «Darse de baja» se añade automáticamente en cada email.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <p className="text-xs text-gray-400 flex-1">
                  {remaining === 0
                    ? 'Has alcanzado el límite de 3 campañas este mes.'
                    : `Se enviará a ${subscribers.length} suscriptor${subscribers.length !== 1 ? 'es' : ''}.`}
                </p>
                <button onClick={handleSend} disabled={sending || remaining === 0}
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors">
                  {sending ? 'Enviando...' : 'Enviar campaña'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin campañas enviadas todavía.</div>
          ) : campaigns.map(c => (
            <div key={c._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-800 font-medium leading-snug flex-1 min-w-0 truncate">{c.subject}</p>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500 font-medium">{c.recipientCount} env.</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(c.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'subscribers' && (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {subscribers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin suscriptores todavía.</div>
          ) : subscribers.map(s => (
            <div key={s._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">{s.email}</p>
              </div>
              <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap pt-0.5">
                {s.marketingSubscribedAt
                  ? new Date(s.marketingSubscribedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING / SUBSCRIPTION SECTION
// ═══════════════════════════════════════════════════════════════════════════
function BillingSection() {
  const { plan, subscriptionStatus, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, hasRole, refreshBusiness } = useAuth();
  const [status, setStatus]   = useState(null);   // billing status from API
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  const isOwner    = hasRole('owner');
  const isActive   = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isTrialing = subscriptionStatus === 'trialing';
  const isPastDue  = subscriptionStatus === 'past_due';
  const isFree     = !isActive || plan === 'free';

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stripe/status');
      setStatus(data);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleUpgrade = async () => {
    if (!isOwner) return;
    setWorking(true); setErr('');
    try {
      const { data } = await api.post('/stripe/checkout', { priceId: import.meta.env.VITE_STRIPE_PRICE_BASIC });
      window.location.href = data.url;
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al iniciar el pago');
      setWorking(false);
    }
  };

  const handlePortal = async () => {
    setWorking(true); setErr('');
    try {
      const { data } = await api.post('/stripe/portal');
      window.location.href = data.url;
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al abrir el portal');
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Confirmas que quieres cancelar? Seguirás teniendo acceso hasta el final del período.')) return;
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/cancel');
      setMsg('Suscripción programada para cancelar al final del período.');
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al cancelar');
    } finally { setWorking(false); }
  };

  const handleReactivate = async () => {
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/reactivate');
      setMsg('¡Suscripción reactivada!');
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al reactivar');
    } finally { setWorking(false); }
  };

  const used  = status?.usage?.reservations?.used  ?? 0;
  const limit = status?.usage?.reservations?.limit ?? 30;
  const pct   = isFree ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = isFree && used >= limit * 0.8;

  // Check for subscription=success in URL after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      setMsg('¡Listo! Activando tu suscripción Basic…');
      window.history.replaceState({}, '', window.location.pathname + '?tab=suscripcion');
      // Poll until plan updates (webhook may take a moment)
      let attempts = 0;
      const poll = setInterval(async () => {
        await refreshBusiness();
        attempts++;
        if (attempts >= 10) clearInterval(poll);
      }, 2000);
      return () => clearInterval(poll);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {err}
        </div>
      )}

      {/* Plan status card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan actual</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-xl font-bold ${isFree ? 'text-gray-700' : 'text-violet-700'}`}>
                {isFree ? 'Free' : `Basic`}
              </span>
              {isTrialing && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  Trial activo
                </span>
              )}
              {isPastDue && (
                <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                  Pago fallido
                </span>
              )}
              {cancelAtPeriodEnd && (
                <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                  Cancela el {fmt(currentPeriodEnd)}
                </span>
              )}
            </div>
            {isTrialing && trialEndsAt && (
              <p className="text-sm text-gray-500 mt-1">
                Tu prueba gratuita termina el <strong>{fmt(trialEndsAt)}</strong>
              </p>
            )}
            {!isFree && !isTrialing && currentPeriodEnd && !cancelAtPeriodEnd && (
              <p className="text-sm text-gray-500 mt-1">
                Próxima factura el <strong>{fmt(currentPeriodEnd)}</strong>
              </p>
            )}
            {isPastDue && (
              <p className="text-sm text-red-600 mt-1">
                El último pago ha fallado. Actualiza tu método de pago para no perder el acceso.
              </p>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-2 flex-wrap">
              {isFree && (
                <button
                  onClick={handleUpgrade}
                  disabled={working}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {working ? 'Redirigiendo…' : 'Activar Basic · 14 días gratis'}
                </button>
              )}
              {!isFree && (isPastDue || cancelAtPeriodEnd) && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50"
                >
                  Gestionar suscripción
                </button>
              )}
              {!isFree && !cancelAtPeriodEnd && !isPastDue && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Gestionar facturación
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monthly usage (free plan) */}
      {isFree && (
        <div className={`bg-white rounded-2xl p-6 border ${nearLimit ? 'border-amber-200' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Reservas este mes</p>
              <p className="text-xs text-gray-400 mt-0.5">Se reinicia el 1 de cada mes</p>
            </div>
            <span className={`text-sm font-bold ${nearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
              {loading ? '…' : `${used} / ${limit}`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-violet-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {nearLimit && (
            <p className="text-xs text-amber-700 mt-2">
              {pct >= 100
                ? 'Límite alcanzado. Las nuevas reservas están bloqueadas.'
                : `Casi en el límite. Te quedan ${limit - used} reservas este mes.`}
              {isOwner && (
                <button onClick={handleUpgrade} disabled={working} className="ml-1.5 font-semibold underline hover:no-underline">
                  Actualizar a Basic
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {/* What's included */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-4">Qué incluye cada plan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          {[
            { label: 'Reservas ilimitadas',             free: false },
            { label: 'Página pública de reservas',      free: true  },
            { label: 'Mesas, salas y turnos',           free: true  },
            { label: 'Cierres y vacaciones',            free: true  },
            { label: 'Emails automáticos (confirmación, cancelación)', free: false },
            { label: 'Equipo y roles',                  free: false },
            { label: 'Marketing por email',             free: false },
            { label: 'Códigos promocionales',           free: false },
            { label: 'Hasta 30 reservas/mes',           free: true, basicLabel: 'Ilimitadas' },
          ].map((f) => {
            const hasFree  = f.free;
            const hasBasic = true;
            return (
              <div key={f.label} className="flex items-center gap-2 py-1">
                <div className="flex gap-3 shrink-0">
                  <span className={`text-xs font-mono w-4 text-center ${hasFree ? 'text-green-500' : 'text-gray-200'}`}>✓</span>
                  <span className={`text-xs font-mono w-4 text-center ${hasBasic ? 'text-violet-500' : 'text-gray-200'}`}>✓</span>
                </div>
                <span className="text-gray-600 text-xs">{f.basicLabel && !hasFree ? f.basicLabel : f.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="text-green-500 font-mono">✓</span> Free</span>
          <span className="flex items-center gap-1"><span className="text-violet-500 font-mono">✓</span> Basic</span>
        </div>
      </div>

      {/* Cancel option */}
      {isOwner && !isFree && !cancelAtPeriodEnd && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-1">Cancelar suscripción</p>
          <p className="text-xs text-gray-500 mb-3">
            Seguirás teniendo acceso hasta el {fmt(currentPeriodEnd)}. Después se degradará automáticamente al plan Free.
          </p>
          <button
            onClick={handleCancel}
            disabled={working}
            className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50 underline hover:no-underline"
          >
            Cancelar suscripción
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'negocio',      label: 'Negocio',       desc: 'Nombre, logo y datos del establecimiento' },
  { key: 'salas',        label: 'Salas',          desc: 'Zonas y espacios del restaurante' },
  { key: 'mesas',        label: 'Mesas',          desc: 'Mesas, capacidades y creación rápida' },
  { key: 'turnos',       label: 'Turnos',         desc: 'Horarios de comida y cena' },
  { key: 'vacaciones',   label: 'Vacaciones',     desc: 'Días cerrados y periodos de cierre' },
  { key: 'limites',      label: 'Límites',        desc: 'Personas máximas por reserva y franja' },
  { key: 'publico',      label: 'Público',        desc: 'Página de reservas online para clientes' },
  { key: 'suscripcion',  label: 'Suscripción',    desc: 'Plan, uso mensual y facturación' },
];

export default function Settings() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab   = TABS.find(t => t.key === searchParams.get('tab'))?.key ?? 'negocio';
  const [tab, setTab] = useState(initialTab);
  const current = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-400 mt-0.5">Administra la operativa y ajustes del negocio.</p>
      </div>

      {/* ── Mobile: styled select ── */}
      <div className="lg:hidden">
        <div className="relative">
          <select
            value={tab}
            onChange={e => setTab(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {TABS.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400">
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">{current?.desc}</p>
      </div>

      {/* ── Desktop: sidebar + content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
        <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl p-2 lg:sticky lg:top-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'negocio'     && <NegocioSection />}
          {tab === 'salas'       && <SalasSection />}
          {tab === 'mesas'       && <MesasSection />}
          {tab === 'turnos'      && <TurnosSection />}
          {tab === 'vacaciones'  && <VacacionesSection />}
          {tab === 'limites'     && <LimitesSection />}
          {tab === 'publico'     && <PublicoSection />}
          {tab === 'suscripcion' && <BillingSection />}
        </div>
      </div>
    </div>
  );
}


