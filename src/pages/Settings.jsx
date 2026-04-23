import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import PlanGate from '../components/PlanGate';
import FloorPlan from '../components/FloorPlan';

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
  const { planLimit } = useAuth();
  const [tables,   setTables]   = useState([]);
  const [rooms,    setRooms]    = useState([]);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({ name: '', capacity: 2, roomId: '' });
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState('lista');

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

  const handleStatusChange = async (id, status) => {
    await api.put(`/tables/${id}`, { status });
    load();
  };

  const activeTables = tables.filter(t => !t.isLocked);

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
        {viewMode === 'lista' ? (
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
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-2 shrink-0">
          {/* Vista toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'lista' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M2 2.75A.75.75 0 0 1 2.75 2h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 2.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 5.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
              </svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode('mapa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'mapa' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM3 8a5 5 0 0 1 5-5v10a5 5 0 0 1-5-5Zm7-4.464A5 5 0 0 1 13 8a5 5 0 0 1-3 4.464V3.536Z" clipRule="evenodd" />
              </svg>
              Mapa
            </button>
          </div>

          {viewMode === 'lista' && (
            <>
              {planLimit('maxTables') !== Infinity && (
                <span className="text-xs text-gray-400">{tables.length}/{planLimit('maxTables')}</span>
              )}
              <button
                onClick={() => { setRanges([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '' }]); setQuickError(''); setQuickOpen(true); }}
                disabled={tables.length >= planLimit('maxTables')}
                className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-violet-500">
                  <path d="M2 2.75A.75.75 0 0 1 2.75 2h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 2.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 5.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Creación rápida
              </button>
              <button
                onClick={openCreate}
                disabled={tables.length >= planLimit('maxTables')}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconPlus /> Nueva mesa
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'mapa' && (
        <div style={{ height: '72vh' }}>
          <FloorPlan
            tables={activeTables}
            rooms={rooms}
            onStatusChange={handleStatusChange}
            onRefresh={load}
          />
        </div>
      )}

      {viewMode === 'lista' && (filtered.length === 0 ? (
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
      ))}

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

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
];

const emptyShiftForm = () => ({
  name: '', slotMode: 'auto',
  startTime: '12:00', endTime: '16:00', interval: 30,
  manualSlots: [],
  days: [1,2,3,4,5,6,0],
  startDate: '', endDate: '',
});

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function TurnosSection() {
  const { planLimit } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(emptyShiftForm());
  const [error,  setError]  = useState('');

  const load = async () => { const r = await api.get('/shifts'); setShifts(r.data); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyShiftForm()); setError(''); setModal('create'); };
  const openEdit   = (s)  => {
    setForm({
      name: s.name,
      slotMode: s.subShifts.length > 0 ? 'manual' : 'auto',
      startTime: s.startTime || '12:00', endTime: s.endTime || '16:00',
      interval: s.interval || 30,
      manualSlots: s.subShifts.length > 0 ? s.subShifts.map(ss => ss.time) : [],
      days: s.days || [0,1,2,3,4,5,6],
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
      const validSlots = form.manualSlots.map(t => t.trim()).filter(Boolean);
      const subShifts  = form.slotMode === 'manual'
        ? validSlots.map(t => ({ time: t, label: '' }))
        : [];
      // For manual mode derive startTime/endTime from first/last slot for display
      const startTime = form.slotMode === 'manual' && validSlots.length
        ? validSlots[0]
        : form.startTime;
      const endTime = form.slotMode === 'manual' && validSlots.length
        ? validSlots[validSlots.length - 1]
        : form.endTime;

      if (form.slotMode === 'manual' && validSlots.length === 0) {
        setError('Añade al menos una hora en modo manual'); return;
      }

      const payload = {
        name: form.name, startTime, endTime,
        days: form.days, subShifts,
        startDate: form.startDate || null, endDate: form.endDate || null,
        interval: form.slotMode === 'auto' ? form.interval : 30,
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

  const toggleDay       = (v)    => setForm(f => ({ ...f, days: f.days.includes(v) ? f.days.filter(d => d !== v) : [...f.days, v] }));
  const addManualSlot   = ()     => setForm(f => ({ ...f, manualSlots: [...f.manualSlots, ''] }));
  const rmManualSlot    = (i)    => setForm(f => ({ ...f, manualSlots: f.manualSlots.filter((_, idx) => idx !== i) }));
  const updManualSlot   = (i, v) => setForm(f => ({ ...f, manualSlots: f.manualSlots.map((s, idx) => idx === i ? v : s) }));

  const limit        = planLimit('maxShifts');
  const activeShifts = shifts.filter(s => !s.isLocked);
  const lockedShifts = shifts.filter(s => s.isLocked);
  const atLimit      = limit !== Infinity && activeShifts.length >= limit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeShifts.length}{limit !== Infinity ? ` / ${limit}` : ''} turno{activeShifts.length !== 1 ? 's' : ''} activo{activeShifts.length !== 1 ? 's' : ''}
          {lockedShifts.length > 0 && (
            <span className="ml-1 text-amber-500">· {lockedShifts.length} bloqueado{lockedShifts.length !== 1 ? 's' : ''}</span>
          )}
        </p>
        <button onClick={openCreate} disabled={atLimit}
          title={atLimit ? `Límite de ${limit} turnos alcanzado` : undefined}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
          <IconPlus /> Nuevo turno
        </button>
      </div>

      {/* Upgrade banner when locked shifts exist */}
      {lockedShifts.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm-2 6V4.5a2 2 0 1 1 4 0V7H6Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 flex-1">
            <strong>{lockedShifts.length} turno{lockedShifts.length !== 1 ? 's' : ''} bloqueado{lockedShifts.length !== 1 ? 's' : ''}</strong> — el plan Free solo permite {limit}.
            Los clientes solo verán los {limit} primeros.
          </p>
          <a href="/configuracion?tab=suscripcion" className="text-xs font-semibold text-amber-700 underline hover:no-underline shrink-0">
            Actualiza tu plan
          </a>
        </div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          text="Sin turnos configurados"
          onAction={openCreate}
          actionLabel="Crear el primer turno"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift, idx) => {
            const clr        = colorOf(idx);
            const isSpecific = !!(shift.startDate && shift.endDate);
            const locked     = !!shift.isLocked;
            return (
              <div key={shift._id}
                className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${locked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                {/* Name + time range */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {locked
                      ? <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm-2 6V4.5a2 2 0 1 1 4 0V7H6Z" clipRule="evenodd" /></svg>
                      : <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`} />
                    }
                    <h3 className="font-semibold text-gray-900 truncate">{shift.name}</h3>
                    {locked && <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0">Bloqueado</span>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${locked ? 'bg-gray-100 text-gray-400' : `${clr.bg} ${clr.text}`}`}>
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
                        shift.days?.includes(d.value)
                          ? locked ? 'bg-gray-200 text-gray-400' : `${clr.bg} ${clr.text}`
                          : 'bg-gray-100 text-gray-300'
                      }`}>
                      {d.label}
                    </span>
                  ))}
                </div>

                {/* Sub-shifts */}
                {shift.subShifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shift.subShifts.map((ss, i) => (
                      <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${locked ? 'bg-gray-100 border-gray-200 text-gray-400' : `${clr.bg} ${clr.border} ${clr.text}`}`}>
                        <IconClock /> {ss.time}
                        {ss.label && <span className="opacity-60">· {ss.label}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Franjas cada {shift.interval || 30} min automáticas</p>
                )}

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  {!locked && (
                    <button onClick={() => openEdit(shift)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-violet-50 hover:text-violet-600 text-gray-500 font-medium transition-colors">
                      <IconEdit /> Editar
                    </button>
                  )}
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

            {/* Slot mode toggle */}
            <div>
              <label className={labelCls}>Franjas horarias *</label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
                {[{ key: 'auto', label: 'Rango automático' }, { key: 'manual', label: 'Horas manuales' }].map(m => (
                  <button key={m.key} type="button"
                    onClick={() => setForm(f => ({ ...f, slotMode: m.key }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                      form.slotMode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {form.slotMode === 'auto' ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input type="time" required value={form.startTime}
                      onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className={`${inputCls} flex-1 min-w-0`} />
                    <span className="text-gray-400 text-sm font-medium text-center shrink-0">hasta</span>
                    <input type="time" required value={form.endTime}
                      onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                      className={`${inputCls} flex-1 min-w-0`} />
                  </div>
                  <div className="flex gap-2">
                    {INTERVAL_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(f => ({ ...f, interval: opt.value }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                          form.interval === opt.value
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.manualSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" value={slot} required
                        onChange={e => updManualSlot(i, e.target.value)}
                        className={`${inputCls} flex-1`} />
                      <button type="button" onClick={() => rmManualSlot(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition-colors shrink-0">
                        <IconX />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addManualSlot}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-colors">
                    <IconPlus /> Añadir hora
                  </button>
                </div>
              )}
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
  const { planLimit } = useAuth();
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
      {upcoming.length >= planLimit('maxVacations') ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
          Has alcanzado el límite de {planLimit('maxVacations')} período{planLimit('maxVacations') !== 1 ? 's' : ''} de cierre del plan Free. Elimina uno existente para añadir otro.
        </div>
      ) : (
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
      )}

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

      <PlanGate paid>
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
      </PlanGate>
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

      <PlanGate paid>
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
      </PlanGate>

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
  const { business, refreshBusiness } = useAuth();
  const canEdit = true;
  const [form, setForm] = useState({
    name: business?.name || '',
    email: business?.email || '',
    phone: business?.phone || '',
    address: business?.address || '',
    cif: business?.cif || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: business?.name || '',
      email: business?.email || '',
      phone: business?.phone || '',
      address: business?.address || '',
      cif: business?.cif || '',
    });
  }, [business]);

  const onSubmit = async (e) => {
    e.preventDefault();
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
              <label className={labelCls}>Direccion</label>
              <input className={inputCls} value={form.address} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
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
const BASIC_FEATURES = [
  'Reservas ilimitadas',
  'Emails automáticos de confirmación y cancelación',
  'Página pública de reservas con tu marca',
  'Integración en tu web (iframe)',
  'Mesas, salas y turnos ilimitados',
  'Hasta 5 usuarios de equipo',
  'Historial completo de clientes',
];

const PRO_EXTRAS = [
  'Equipo y roles ilimitados',
  'Marketing y campañas de email',
  'Códigos promocionales',
  'Estadísticas avanzadas',
  'Recordatorios automáticos 24h antes',
  'Cobros automáticos por cancelación',
  'Módulo de finanzas y caja diaria',
  'Gestión de turnos del personal',
  'Soporte prioritario',
];

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BillingSection() {
  const { plan, subscriptionStatus, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, hasRole, refreshBusiness } = useAuth();
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking]           = useState(false);
  const [msg, setMsg]                   = useState('');
  const [err, setErr]                   = useState('');
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const isOwner    = hasRole('owner');
  const isActive   = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isTrialing = subscriptionStatus === 'trialing';
  const isPastDue  = subscriptionStatus === 'past_due';
  const isFree     = !isActive || plan === 'free';
  const isPro      = isActive && plan === 'pro';
  const isBasic    = !isFree && !isPro;

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

  const handleUpgrade = async (targetPlan = 'basic') => {
    if (!isOwner) return;
    setWorking(true); setErr('');
    try {
      const { data } = await api.post('/stripe/checkout', { plan: targetPlan });
      window.location.href = data.url;
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al iniciar el pago');
      setWorking(false);
    }
  };

  const handleChangePlan = async (newPlan) => {
    if (!isOwner) return;
    setWorking(true); setErr('');
    try {
      await api.post('/stripe/change-plan', { plan: newPlan });
      const label = newPlan === 'pro' ? 'Pro' : 'Basic';
      setMsg(`¡Listo! Cambiando a ${label}…`);
      await refreshBusiness();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Error al cambiar el plan');
    } finally { setWorking(false); }
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

  const used      = status?.usage?.reservations?.used  ?? 0;
  const limit     = status?.usage?.reservations?.limit ?? 30;
  const pct       = isFree ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = isFree && used >= limit * 0.8;

  // Poll for plan update after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      setMsg('¡Listo! Activando tu suscripción…');
      window.history.replaceState({}, '', window.location.pathname + '?tab=suscripcion');
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
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{err}</div>
      )}

      {/* ── FREE ── */}
      {isFree && (
        <>
          {/* Current plan */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Plan actual</p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-2xl font-bold text-gray-800">Free</p>
                <p className="text-sm text-gray-500 mt-0.5">Hasta {limit} reservas al mes · 2 turnos · 15 mesas</p>
              </div>
              <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full">Gratuito</span>
            </div>

            {/* Usage bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Reservas este mes</p>
                <span className={`text-xs font-bold ${nearLimit ? 'text-amber-600' : 'text-gray-600'}`}>
                  {loading ? '…' : `${used} / ${limit}`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-violet-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {nearLimit && (
                <p className="text-xs text-amber-700 mt-1.5">
                  {pct >= 100
                    ? 'Límite alcanzado. Las nuevas reservas están bloqueadas.'
                    : `Te quedan ${limit - used} reservas este mes.`}
                </p>
              )}
            </div>
          </div>

          {/* Trial plan cards */}
          {isOwner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Basic trial card */}
              <div className="bg-white rounded-2xl border-2 border-violet-200 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">Basic</p>
                    <p className="text-violet-200 text-xs">Sin límites, sin complicaciones</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-2xl">19€</p>
                    <p className="text-violet-200 text-xs">/ mes</p>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <ul className="space-y-2 mb-5 flex-1">
                    {BASIC_FEATURES.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade('basic')}
                    disabled={working}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {working ? 'Redirigiendo…' : 'Probar Basic gratis 14 días'}
                  </button>
                </div>
              </div>

              {/* Pro trial card */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">Pro</p>
                      <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Recomendado</span>
                    </div>
                    <p className="text-amber-100 text-xs">Para restaurantes que quieren más</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-2xl">39€</p>
                    <p className="text-amber-100 text-xs">/ mes</p>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Todo lo de Basic, más:</p>
                  <ul className="space-y-2 mb-5 flex-1">
                    {PRO_EXTRAS.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={working}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {working ? 'Redirigiendo…' : 'Probar Pro gratis 14 días'}
                  </button>
                </div>
              </div>

            </div>
          )}
          {isOwner && (
            <p className="text-center text-xs text-gray-400">
              Sin cargo durante 14 días · Cancela cuando quieras
            </p>
          )}
        </>
      )}

      {/* ── BASIC (trialing or active) ── */}
      {isBasic && (
        <>
          {/* Status banner */}
          {isPastDue && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Pago fallido</p>
                <p className="text-xs text-red-600 mt-0.5">Actualiza tu método de pago para no perder el acceso.</p>
              </div>
              {isOwner && (
                <button onClick={handlePortal} disabled={working} className="text-xs font-semibold text-red-700 underline hover:no-underline shrink-0">
                  Actualizar
                </button>
              )}
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Suscripción cancelada</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tienes acceso hasta el <strong>{fmt(currentPeriodEnd || trialEndsAt)}</strong>. Después pasarás al plan Free.
                </p>
              </div>
              {isOwner && (
                <button onClick={handleReactivate} disabled={working} className="text-xs font-semibold text-amber-800 underline hover:no-underline shrink-0">
                  Reactivar
                </button>
              )}
            </div>
          )}

          {/* Plan card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-xl font-bold text-violet-700">Basic</p>
                  {isTrialing && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                      Prueba activa
                    </span>
                  )}
                  {!isTrialing && !cancelAtPeriodEnd && !isPastDue && (
                    <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                      Activo
                    </span>
                  )}
                </div>
                {isTrialing && trialEndsAt && (
                  <p className="text-sm text-gray-500">
                    Prueba gratuita · finaliza el <strong className="text-gray-700">{fmt(trialEndsAt)}</strong>
                  </p>
                )}
                {!isTrialing && currentPeriodEnd && !cancelAtPeriodEnd && (
                  <p className="text-sm text-gray-500">
                    Próxima factura el <strong className="text-gray-700">{fmt(currentPeriodEnd)}</strong> · 19€/mes
                  </p>
                )}
              </div>
              {isOwner && !isPastDue && !cancelAtPeriodEnd && isTrialing && (
                <button
                  onClick={() => handleChangePlan('pro')}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {working ? '…' : 'Cambiar a Pro →'}
                </button>
              )}
              {isOwner && !isPastDue && !cancelAtPeriodEnd && !isTrialing && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {working ? '…' : 'Gestionar facturación'}
                </button>
              )}
              {isOwner && (isPastDue || cancelAtPeriodEnd) && (
                <button
                  onClick={handlePortal}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {working ? '…' : 'Gestionar suscripción'}
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluido en tu plan</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {BASIC_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cancel (subtle, only when active and not already cancelled) */}
          {isOwner && !cancelAtPeriodEnd && !isPastDue && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                {isTrialing
                  ? 'Puedes cancelar antes de que termine la prueba y no se te cobrará nada.'
                  : 'Seguirás teniendo acceso hasta el final del período si cancelas.'}
              </p>
              <button
                onClick={handleCancel}
                disabled={working}
                className="text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50 underline hover:no-underline shrink-0 ml-4 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Pro upgrade card (only when active/trialing basic, no issues) */}
          {isOwner && !isPastDue && !cancelAtPeriodEnd && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-bold text-amber-700">Pro</p>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">39€/mes</span>
                  </div>
                  <p className="text-xs text-amber-600">
                    {isTrialing
                      ? 'Cambia a Pro ahora — tu prueba de 14 días continúa'
                      : 'Para restaurantes que quieren más control'}
                  </p>
                </div>
                <button
                  onClick={() => handleChangePlan('pro')}
                  disabled={working}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors shrink-0"
                >
                  {working ? '…' : isTrialing ? 'Cambiar a Pro' : 'Subir a Pro'}
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-amber-700 mb-2.5">Todo lo de Basic, más:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {PRO_EXTRAS.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-amber-800">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PRO ── */}
      {isPro && (
        <>
          {isPastDue && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Pago fallido</p>
                <p className="text-xs text-red-600 mt-0.5">Actualiza tu método de pago para no perder el acceso.</p>
              </div>
              {isOwner && (
                <button onClick={handlePortal} disabled={working} className="text-xs font-semibold text-red-700 underline hover:no-underline shrink-0">
                  Actualizar
                </button>
              )}
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Suscripción cancelada</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tienes acceso hasta el <strong>{fmt(currentPeriodEnd || trialEndsAt)}</strong>. Después pasarás al plan Free.
                </p>
              </div>
              {isOwner && (
                <button onClick={handleReactivate} disabled={working} className="text-xs font-semibold text-amber-800 underline hover:no-underline shrink-0">
                  Reactivar
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-xl font-bold text-amber-600">Pro</p>
                  {isTrialing && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Prueba activa</span>
                  )}
                  {!isTrialing && !cancelAtPeriodEnd && !isPastDue && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Activo</span>
                  )}
                </div>
                {isTrialing && trialEndsAt && (
                  <p className="text-sm text-gray-500">Prueba gratuita · finaliza el <strong className="text-gray-700">{fmt(trialEndsAt)}</strong></p>
                )}
                {!isTrialing && currentPeriodEnd && !cancelAtPeriodEnd && (
                  <p className="text-sm text-gray-500">Próxima factura el <strong className="text-gray-700">{fmt(currentPeriodEnd)}</strong> · 39€/mes</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && !isPastDue && !cancelAtPeriodEnd && isTrialing && (
                  <button
                    onClick={() => handleChangePlan('basic')}
                    disabled={working}
                    className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {working ? '…' : 'Cambiar a Basic'}
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handlePortal}
                    disabled={working}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {working ? '…' : 'Gestionar facturación'}
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluido en tu plan</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {[...BASIC_FEATURES, ...PRO_EXTRAS].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {isOwner && !cancelAtPeriodEnd && !isPastDue && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                {isTrialing
                  ? 'Puedes cancelar antes de que termine la prueba y no se te cobrará nada.'
                  : 'Seguirás teniendo acceso hasta el final del período si cancelas.'}
              </p>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {!isTrialing && (
                  <button
                    onClick={() => setShowDowngradeModal(true)}
                    disabled={working}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium disabled:opacity-50 underline hover:no-underline transition-colors"
                  >
                    Bajar a Basic
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={working}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50 underline hover:no-underline transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal confirmación downgrade Pro → Basic ── */}
      {showDowngradeModal && (
        <Modal
          title="¿Bajar a Basic?"
          subtitle="Esta acción cambia tu plan inmediatamente"
          onClose={() => setShowDowngradeModal(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">Perderás acceso a funciones Pro</p>
              <ul className="space-y-1">
                {PRO_EXTRAS.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-amber-700">
                    <svg className="w-3 h-3 shrink-0 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              El cambio a Basic es inmediato. No se realiza ningún reembolso por el tiempo restante del ciclo Pro.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowDowngradeModal(false); handleChangePlan('basic'); }}
                disabled={working}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50 rounded-xl transition-colors"
              >
                {working ? '…' : 'Sí, bajar a Basic'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function PagosSection() {
  const { canUse } = useAuth();
  const hasPayments = canUse('reservationPayments');

  const [status, setStatus]   = useState(null);   // { connected, reservationPayment }
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [mode, setMode]                         = useState('none');
  const [depositAmount, setDepositAmount]       = useState('');
  const [depositPerPerson, setDepositPerPerson] = useState(false);
  const [noShowFeeAmount, setNoShowFeeAmount]   = useState('');
  const [freeCancelHours, setFreeCancelHours]   = useState(24);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/stripe/connect/status');
      const rp = r.data.reservationPayment || {};
      setStatus(r.data);
      setMode(rp.mode || 'none');
      setDepositAmount(rp.depositAmount   ? (rp.depositAmount   / 100).toFixed(2) : '');
      setDepositPerPerson(rp.depositPerPerson ?? false);
      setNoShowFeeAmount(rp.noShowFeeAmount  ? (rp.noShowFeeAmount  / 100).toFixed(2) : '');
      setFreeCancelHours(rp.freeCancellationHours ?? 24);
    } catch {
      setError('No se pudo cargar la configuración de pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Leer resultado del OAuth de Stripe de la URL
    const params = new URLSearchParams(window.location.search);
    const connect = params.get('connect');
    if (connect === 'success') setSuccess('¡Cuenta Stripe conectada correctamente!');
    if (connect === 'error')   setError('No se pudo conectar la cuenta Stripe. Inténtalo de nuevo.');
    // Limpiar param de URL sin recargar
    if (connect) window.history.replaceState({}, '', window.location.pathname + '?tab=pagos');
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const r = await api.post('/stripe/connect/onboarding-url');
      window.location.href = r.data.url;
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo iniciar la conexión con Stripe');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Seguro que quieres desconectar tu cuenta Stripe? Se desactivarán los pagos en reservas.')) return;
    setDisconnecting(true);
    setError('');
    try {
      await api.delete('/stripe/connect');
      setSuccess('Cuenta Stripe desconectada');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/stripe/connect/payment-settings', {
        mode,
        depositAmount:        mode === 'deposit'        ? parseFloat(depositAmount)  || 0 : undefined,
        depositPerPerson:     mode === 'deposit'        ? depositPerPerson            : undefined,
        noShowFeeAmount:      mode === 'card_guarantee' ? parseFloat(noShowFeeAmount) || 0 : undefined,
        freeCancellationHours: parseFloat(freeCancelHours) || 24,
      });
      setSuccess('Configuración guardada');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPayments) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-500">
          <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM6 13.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm4-.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Disponible en el plan Basic</p>
        <p className="text-xs text-gray-500 mt-1">Los depósitos y garantías con tarjeta requieren el plan Basic.</p>
      </div>
      <button
        onClick={() => window.location.search = '?tab=suscripcion'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
      >
        Ver plan Basic
      </button>
    </div>
  );

  if (loading) return <div className="animate-pulse h-64 bg-gray-50 rounded-2xl" />;

  const connected = status?.connected;

  return (
    <div className="space-y-5">

      {/* ── Estado de conexión Stripe ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Cuenta Stripe</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Conecta tu cuenta Stripe para recibir depósitos y garantías directamente en tu banco.
          </p>
        </div>

        {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-3 py-2">{success}</div>}

        {connected ? (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Cuenta conectada</p>
                <p className="text-xs text-emerald-700 font-mono">{status.stripeConnectId}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-60"
            >
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">Sin cuenta Stripe</p>
              <p className="text-xs text-gray-500">Necesitas conectar tu cuenta para activar pagos</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {connecting ? 'Redirigiendo...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.799-8.684.75.75 0 0 0 0-1.052A28.897 28.897 0 0 0 3.105 2.288Z" />
                  </svg>
                  Conectar con Stripe
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Configuración de pagos ── */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pagos en reservas</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Elige si tus clientes deben pagar al reservar o dejar su tarjeta como garantía.
          </p>
        </div>

        {/* Modo */}
        <div className="space-y-2">
          {[
            { value: 'none',           label: 'Sin pago',             desc: 'Los clientes reservan sin pagar nada.' },
            { value: 'deposit',        label: 'Depósito al reservar', desc: 'El cliente paga un importe al hacer la reserva. Se reembolsa si cancela a tiempo.' },
            { value: 'card_guarantee', label: 'Tarjeta como garantía',desc: 'El cliente guarda su tarjeta. Solo se cobra si no viene o cancela fuera de plazo.' },
          ].map(opt => (
            <label key={opt.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${mode === opt.value ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input
                type="radio"
                name="paymentMode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                disabled={!connected && opt.value !== 'none'}
                className="mt-0.5 accent-violet-600"
              />
              <div>
                <p className={`text-sm font-semibold ${!connected && opt.value !== 'none' ? 'text-gray-400' : 'text-gray-900'}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                {!connected && opt.value !== 'none' && (
                  <p className="text-xs text-amber-600 mt-0.5 font-medium">Requiere cuenta Stripe conectada</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Importe depósito */}
        {mode === 'deposit' && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Configuración del depósito</h4>
            <div>
              <label className={labelCls}>Importe del depósito (€)</label>
              <input
                type="number"
                min="0.50"
                step="0.50"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="5.00"
                className={inputCls}
                required
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={depositPerPerson}
                onChange={e => setDepositPerPerson(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-gray-700">Importe <strong>por persona</strong> (ej: 5€/pax → 4 pax = 20€)</span>
            </label>
            {depositPerPerson && depositAmount && (
              <p className="text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                Ejemplo: reserva para 4 personas → depósito de <strong>{(parseFloat(depositAmount) * 4).toFixed(2)}€</strong>
              </p>
            )}
          </div>
        )}

        {/* Importe no-show */}
        {mode === 'card_guarantee' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Cargo por no presentarse</h4>
            <label className={labelCls}>Importe a cobrar si no-show (€)</label>
            <input
              type="number"
              min="0.50"
              step="0.50"
              value={noShowFeeAmount}
              onChange={e => setNoShowFeeAmount(e.target.value)}
              placeholder="15.00"
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Se cobrará este importe fijo si marcas la reserva como no-show desde el panel.
            </p>
          </div>
        )}

        {/* Ventana de cancelación gratuita */}
        {mode !== 'none' && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Política de cancelación</h4>
            <label className={labelCls}>Cancelación gratuita hasta (horas antes)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="168"
                value={freeCancelHours}
                onChange={e => setFreeCancelHours(e.target.value)}
                className={`${inputCls} w-32`}
              />
              <span className="text-sm text-gray-500">horas antes de la reserva</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {mode === 'deposit'
                ? 'Si el cliente cancela con más de esta antelación, el depósito se reembolsa automáticamente.'
                : 'Si el cliente cancela con más de esta antelación, la tarjeta se libera sin cargo.'
              }
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}

const TABS = [
  { key: 'negocio',     label: 'Negocio',      desc: 'Nombre y datos del establecimiento',   icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M4.5 1A2.5 2.5 0 0 0 2 3.5V5c0 .174.018.344.052.508A2 2 0 0 0 2 7v1a2 2 0 0 0 .052 1.492A2 2 0 0 0 2 11v1.5A2.5 2.5 0 0 0 4.5 15h7a2.5 2.5 0 0 0 2.5-2.5V11a2 2 0 0 0-.052-1.508A2 2 0 0 0 14 8V7a2 2 0 0 0-.052-1.492A2 2 0 0 0 14 4V3.5A2.5 2.5 0 0 0 11.5 1h-7Zm5 9.5H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Zm0-3H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Zm0-3H6.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1Z" clipRule="evenodd"/></svg> },
  { key: 'salas',       label: 'Salas',        desc: 'Zonas y espacios del restaurante',      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3A1.5 1.5 0 0 1 7 3.5v3A1.5 1.5 0 0 1 5.5 8h-3A1.5 1.5 0 0 1 1 6.5v-3ZM9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v3A1.5 1.5 0 0 1 13.5 8h-3A1.5 1.5 0 0 1 9 6.5v-3ZM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3ZM9 10.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3Z"/></svg> },
  { key: 'mesas',       label: 'Mesas',        desc: 'Mesas y capacidades',                   icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5V5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 5V3.5ZM7.25 8a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V8Zm3 0a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V8Z"/></svg> },
  { key: 'turnos',      label: 'Turnos',       desc: 'Horarios de comida y cena',             icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v4.27l2.78 1.6a.75.75 0 1 1-.75 1.3L7.4 9.23A.75.75 0 0 1 7 8.5V4a.75.75 0 0 1 .75-.75H8Z" clipRule="evenodd"/></svg> },
  { key: 'vacaciones',  label: 'Vacaciones',   desc: 'Días cerrados y periodos de cierre',    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h3V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 14 6.75v2.5a.75.75 0 0 1-1.5 0v-2.5c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-.5a.75.75 0 0 1 1.5 0v.5A2.75 2.75 0 0 1 11.25 16h-6.5A2.75 2.75 0 0 1 2 13.25v-6.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2ZM11 10.72 9.78 9.5a.75.75 0 0 0-1.06 1.06l1.5 1.5c.3.3.77.3 1.06 0l3-3a.75.75 0 1 0-1.06-1.06L11 10.72Z"/></svg> },
  { key: 'limites',     label: 'Límites',      desc: 'Personas máximas por reserva',          icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2 5.25a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5H2ZM2 9.25a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5H2Z"/><path d="M4.5 3.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM4.5 9.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM10.5 9.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3ZM10.5 3.5a1 1 0 1 0 0 3 1 1 0 0 0 0-3Z" style={{fill:'none',stroke:'currentColor',strokeWidth:0}}/><path fillRule="evenodd" d="M3.5 6a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm-6 4.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" clipRule="evenodd"/></svg> },
  { key: 'publico',     label: 'Página pública', desc: 'Reservas online para clientes',       icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM3.661 4.098A5.476 5.476 0 0 1 6.79 2.86c-.344.984-.543 2.086-.575 3.14H3.188a5.507 5.507 0 0 1 .473-1.902ZM3.188 7.5h3.027c.032 1.054.231 2.156.575 3.14a5.476 5.476 0 0 1-3.129-1.238A5.507 5.507 0 0 1 3.188 7.5ZM7.715 7.5h.57c-.026.96-.19 1.906-.471 2.798-.283-.892-.447-1.838-.473-2.798h.374ZM7.715 6h.374c.026-.96.19-1.906.473-2.798.281.892.445 1.838.47 2.798h-.317Zm2.312 5.14c.344-.984.543-2.086.575-3.14h3.027a5.507 5.507 0 0 1-.473 1.902 5.476 5.476 0 0 1-3.129 1.238ZM12.812 6h-3.027a9.54 9.54 0 0 0-.575-3.14 5.476 5.476 0 0 1 3.129 1.238A5.507 5.507 0 0 1 12.812 6Z"/></svg> },
  { key: 'suscripcion', label: 'Suscripción',   desc: 'Plan, uso mensual y facturación',      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v1A1.5 1.5 0 0 0 2.5 7h11A1.5 1.5 0 0 0 15 5.5v-1A1.5 1.5 0 0 0 13.5 3h-11ZM1 9.5A1.5 1.5 0 0 1 2.5 8h11A1.5 1.5 0 0 1 15 9.5v1a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 10.5v-1ZM4.5 10a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1ZM3 10.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5Z"/></svg> },
  { key: 'pagos',       label: 'Pagos',        desc: 'Depósitos y garantías en reservas',     icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M4 1a.75.75 0 0 1 .75.75V3h6.5V1.75a.75.75 0 0 1 1.5 0V3H13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h.25V1.75A.75.75 0 0 1 4 1Zm-.5 6.5A.5.5 0 0 1 4 7h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Zm0 2.5A.5.5 0 0 1 4 9.5h5a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Zm0 2.5A.5.5 0 0 1 4 12h3a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Z" clipRule="evenodd"/></svg> },
];

const OWNER_ONLY_TABS = new Set(['suscripcion', 'pagos']);

export default function Settings() {
  const { hasRole } = useAuth();
  const isOwner = hasRole('owner');
  const visibleTabs = TABS.filter(t => !OWNER_ONLY_TABS.has(t.key) || isOwner);

  const searchParams = new URLSearchParams(window.location.search);
  const initialTab   = visibleTabs.find(t => t.key === searchParams.get('tab'))?.key ?? 'negocio';
  const [tab, setTab] = useState(initialTab);
  const current = visibleTabs.find(t => t.key === tab);

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
            {visibleTabs.map(t => (
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
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 items-start">
        <nav className="hidden lg:flex flex-col lg:sticky lg:top-6">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                tab === t.key
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
              }`}
            >
              <span className={`transition-colors ${tab === t.key ? 'text-violet-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'negocio'     && <NegocioSection />}
          {tab === 'salas'       && <SalasSection />}
          {tab === 'mesas'       && <MesasSection />}
          {tab === 'turnos'      && <TurnosSection />}
          {tab === 'vacaciones'  && <VacacionesSection />}
          {tab === 'limites'     && <LimitesSection />}
          {tab === 'publico'     && <PublicoSection />}
          {tab === 'suscripcion' && <BillingSection />}
          {tab === 'pagos'       && <PagosSection />}
        </div>
      </div>
    </div>
  );
}
