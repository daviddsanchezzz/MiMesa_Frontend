import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import FloorPlan from '../../components/FloorPlan';
import { EmptyState, ErrorBanner, IconEdit, IconPlus, IconTrash, TABLE_ANGLE_OPTIONS, TABLE_SHAPE_OPTIONS, inferTableShape, inputCls, labelCls, normalizeTableAngle, resolveTableAngle, resolveTableShape } from './shared';

// ═══════════════════════════════════════════════════════════════════════════
// MESAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
export function MesasSection() {
  const { planLimit } = useAuth();
  const [tables,   setTables]   = useState([]);
  const [rooms,    setRooms]    = useState([]);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({ name: '', capacity: 2, roomId: '', shape: 'square', angle: 0 });
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState('lista');

  const load = async () => {
    const [t, r] = await Promise.all([api.get('/tables'), api.get('/rooms')]);
    setTables(t.data);
    setRooms(r.data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', capacity: 2, roomId: '', shape: 'square', angle: 0 }); setError(''); setModal('create'); };
  const openEdit   = (t) => {
    setForm({
      name: t.name,
      capacity: t.capacity,
      roomId: t.roomId?._id || '',
      shape: resolveTableShape(t),
      angle: resolveTableAngle(t),
    });
    setError('');
    setModal(t);
  };

  // Quick creator
  const [quickOpen,    setQuickOpen]    = useState(false);
  const [ranges,       setRanges]       = useState([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '', shape: 'square', angle: 0 }]);
  const [quickError,   setQuickError]   = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const updateRange = (i, field, value) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const addRange    = () => setRanges(rs => [...rs, { prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '', shape: 'square', angle: 0 }]);
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
        tbls.push({
          name: `${r.prefix}${i}`,
          capacity: Number(r.capacity) || 2,
          roomId: r.roomId || null,
          shape: TABLE_SHAPE_OPTIONS.some(s => s.value === r.shape)
            ? r.shape
            : inferTableShape(Number(r.capacity) || 2),
          angle: ['rect', 'square'].includes(TABLE_SHAPE_OPTIONS.some(s => s.value === r.shape) ? r.shape : inferTableShape(Number(r.capacity) || 2))
            ? normalizeTableAngle(r.angle)
            : 0,
        });
    }
    try {
      setQuickLoading(true);
      await api.post('/tables/bulk', { tables: tbls });
      await load();
      setQuickOpen(false);
      setRanges([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '', shape: 'square', angle: 0 }]);
    } catch (err) {
      setQuickError(err.response?.data?.message || 'Error al crear mesas');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        roomId: form.roomId || null,
        shape: TABLE_SHAPE_OPTIONS.some(s => s.value === form.shape)
          ? form.shape
          : inferTableShape(Number(form.capacity) || 2),
        angle: ['rect', 'square'].includes(TABLE_SHAPE_OPTIONS.some(s => s.value === form.shape)
          ? form.shape
          : inferTableShape(Number(form.capacity) || 2))
          ? normalizeTableAngle(form.angle)
          : 0,
      };
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
                onClick={() => { setRanges([{ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '', shape: 'square', angle: 0 }]); setQuickError(''); setQuickOpen(true); }}
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
            onRefresh={load}
            showStatus={false}
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
                        <p className="text-xs text-gray-400">
                          {t.capacity} personas · {TABLE_SHAPE_OPTIONS.find(s => s.value === resolveTableShape(t))?.label}
                          {(resolveTableShape(t) === 'rect' || resolveTableShape(t) === 'square') ? ` ${resolveTableAngle(t) === 90 ? 'vertical' : 'horizontal'}` : ''}
                        </p>
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
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className={labelCls}>Capacidad</label>
                    <input type="number" min="1" value={r.capacity} onChange={e => updateRange(i, 'capacity', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Forma</label>
                    <select value={r.shape} onChange={e => updateRange(i, 'shape', e.target.value)} className={inputCls}>
                      {TABLE_SHAPE_OPTIONS.map(shape => (
                        <option key={shape.value} value={shape.value}>{shape.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Orientación</label>
                    <select
                      value={normalizeTableAngle(r.angle)}
                      onChange={e => updateRange(i, 'angle', Number(e.target.value))}
                      disabled={r.shape !== 'rect' && r.shape !== 'square'}
                      className={inputCls}
                    >
                      {TABLE_ANGLE_OPTIONS.map(angle => (
                        <option key={angle.value} value={angle.value}>{angle.label}</option>
                      ))}
                    </select>
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
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Capacidad *</label>
                <input type="number" required min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Forma *</label>
                <select value={form.shape}
                  onChange={e => setForm(f => ({ ...f, shape: e.target.value }))}
                  className={inputCls}>
                  {TABLE_SHAPE_OPTIONS.map(shape => (
                    <option key={shape.value} value={shape.value}>{shape.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Orientación</label>
                <select value={normalizeTableAngle(form.angle)}
                  disabled={form.shape !== 'rect' && form.shape !== 'square'}
                  onChange={e => setForm(f => ({ ...f, angle: Number(e.target.value) }))}
                  className={inputCls}>
                  {TABLE_ANGLE_OPTIONS.map(angle => (
                    <option key={angle.value} value={angle.value}>{angle.label}</option>
                  ))}
                </select>
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
