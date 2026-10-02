import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import FloorPlan from '../components/FloorPlan';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { PageHeader, PrimaryButton, GhostButton, Segmented, Section } from '../ui/kit';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5';
const TABLE_SHAPE_OPTIONS = [
  { value: 'circle', label: 'Circular' },
  { value: 'square', label: 'Cuadrada' },
  { value: 'rect', label: 'Rectangular' },
];
const TABLE_ANGLE_OPTIONS = [
  { value: 0, label: 'Horizontal' },
  { value: 90, label: 'Vertical' },
];

function inferTableShape(capacity) {
  if (capacity <= 4) return 'square';
  return 'rect';
}

function resolveTableShape(table) {
  return TABLE_SHAPE_OPTIONS.some(s => s.value === table?.shape)
    ? table.shape
    : inferTableShape(Number(table?.capacity) || 2);
}

function normalizeTableAngle(angle) {
  return Number(angle) === 90 ? 90 : 0;
}

function resolveTableAngle(table) {
  const shape = resolveTableShape(table);
  if (shape !== 'rect' && shape !== 'square') return 0;
  return normalizeTableAngle(table?.angle);
}

const emptyRange = () => ({ prefix: 'Mesa ', from: 1, to: 10, capacity: 2, roomId: '', shape: 'square', angle: 0 });

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
  const { planLimit } = useAuth();
  const limit = planLimit('maxTables'); // Infinity on Basic/Pro, 15 on Free

  const [tables,  setTables]  = useState([]);
  const [rooms,   setRooms]   = useState([]);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ name: '', capacity: 2, roomId: '', shape: 'square', angle: 0 });
  const [error,   setError]   = useState('');

  const [quickOpen,    setQuickOpen]    = useState(false);
  const [ranges,       setRanges]       = useState([emptyRange()]);
  const [quickError,   setQuickError]   = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const updateRange = (i, field, value) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const addRange    = () => setRanges(rs => [...rs, emptyRange()]);
  const removeRange = (i) => setRanges(rs => rs.filter((_, idx) => idx !== i));

  const preview = buildPreview(ranges);
  const openQuick = () => { setRanges([emptyRange()]); setQuickError(''); setQuickOpen(true); };

  const activeTables = tables.filter(t => !t.isLocked);
  const lockedTables = tables.filter(t => t.isLocked);
  const atLimit      = limit !== Infinity && activeTables.length >= limit;

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

  useSetMobileHeader({ title: 'Mesas', action: atLimit ? false : { label: 'Mesa', onClick: openCreate } });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const resolvedShape = TABLE_SHAPE_OPTIONS.some(s => s.value === form.shape)
        ? form.shape
        : inferTableShape(Number(form.capacity) || 2);
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        roomId: form.roomId || null,
        shape: resolvedShape,
        angle: (resolvedShape === 'rect' || resolvedShape === 'square') ? normalizeTableAngle(form.angle) : 0,
      };
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

  const handleQuickCreate = async () => {
    setQuickError('');
    if (preview.length === 0) { setQuickError('Define al menos un rango válido'); return; }
    if (preview.length > 200) { setQuickError('Máximo 200 mesas por operación'); return; }
    const tables = [];
    for (const r of ranges) {
      const from = Number(r.from), to = Number(r.to);
      if (!from || !to || from > to) continue;
      for (let i = from; i <= to; i++) {
        const resolvedShape = TABLE_SHAPE_OPTIONS.some(s => s.value === r.shape)
          ? r.shape
          : inferTableShape(Number(r.capacity) || 2);
        tables.push({
          name: `${r.prefix}${i}`,
          capacity: Number(r.capacity) || 2,
          roomId: r.roomId || null,
          shape: resolvedShape,
          angle: (resolvedShape === 'rect' || resolvedShape === 'square') ? normalizeTableAngle(r.angle) : 0,
        });
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

  const quickLabel = quickLoading ? 'Creando…' : `Crear ${preview.length} mesa${preview.length !== 1 ? 's' : ''}`;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 lg:px-8 pt-3 lg:pt-7 pb-3 lg:pb-4 shrink-0">
        <PageHeader
          title="Mesas"
          subtitle={
            <>
              {activeTables.length}{limit !== Infinity ? ` / ${limit}` : ''} mesa{activeTables.length !== 1 ? 's' : ''} activa{activeTables.length !== 1 ? 's' : ''}
              {lockedTables.length > 0 && <span className="text-amber-600"> · {lockedTables.length} bloqueada{lockedTables.length !== 1 ? 's' : ''}</span>}
              {' · '}{rooms.length} sala{rooms.length !== 1 ? 's' : ''}
            </>
          }
          mobileActions
          actions={
            <>
              <GhostButton onClick={openQuick} disabled={atLimit}>
                <span className="hidden sm:inline">Creación rápida</span><span className="sm:hidden">Crear varias</span>
              </GhostButton>
              <span className="hidden lg:inline-flex" title={atLimit ? `Límite de ${limit} mesas alcanzado` : undefined}>
                <PrimaryButton onClick={openCreate} disabled={atLimit}>Nueva mesa</PrimaryButton>
              </span>
            </>
          }
        />
      </div>

      {/* Upgrade banner when at limit */}
      {atLimit && (
        <div className="mx-4 lg:mx-8 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-amber-50 px-3 py-2 shrink-0">
          <p className="text-sm text-amber-900 flex-1 min-w-0">
            Has llegado al límite de <b className="font-semibold">{limit} mesas</b> de tu plan.
            {lockedTables.length > 0 && <> {lockedTables.length} mesa{lockedTables.length !== 1 ? 's' : ''} están bloqueadas y no se usan en las reservas.</>}
          </p>
          <Link to="/configuracion?tab=suscripcion" className="text-[13px] font-semibold text-amber-900 underline hover:no-underline shrink-0">
            Mejorar plan
          </Link>
        </div>
      )}

      {/* Floor plan — only active tables */}
      <div className="flex-1 min-h-0 overflow-hidden border-t border-gray-100">
        <FloorPlan
          tables={activeTables}
          rooms={rooms}
          onStatusChange={handleStatusChange}
          onRefresh={load}
          fullHeight={true}
          frameless
        />
      </div>

      {/* Locked tables section */}
      {lockedTables.length > 0 && (
        <div className="shrink-0 border-t border-gray-100 px-4 lg:px-8 py-3 max-h-44 overflow-y-auto">
          <Section title={`Bloqueadas por el plan · ${lockedTables.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {lockedTables.map(t => (
                <span key={t._id} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full bg-gray-100 text-[13px] text-gray-500">
                  <span className="font-medium text-gray-700">{t.name}</span>
                  <span className="tabular-nums">{t.capacity} pers.</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(t._id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-rose-600 hover:bg-white"
                    title="Eliminar"
                    aria-label={`Eliminar ${t.name}`}
                  >
                    <Icon name="x" className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Quick creator modal */}
      {quickOpen && (
        <Modal
          size="lg"
          title="Creación rápida"
          subtitle="Define rangos y se crean todas las mesas de una vez"
          onClose={() => setQuickOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setQuickOpen(false)}
                className="h-10 px-3.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <PrimaryButton onClick={handleQuickCreate} disabled={quickLoading || preview.length === 0} icon={null}>
                {quickLabel}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="divide-y divide-gray-100">
              {ranges.map((r, i) => (
                <div key={i} className="py-4 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Rango {i + 1}</h4>
                    {ranges.length > 1 && (
                      <button type="button" onClick={() => removeRange(i)} className="text-[13px] font-semibold text-rose-600 hover:text-rose-700">
                        Quitar
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
                      <label className={labelCls}>Personas</label>
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
                  <ShapeFields
                    shape={r.shape}
                    angle={r.angle}
                    onShape={(v) => updateRange(i, 'shape', v)}
                    onAngle={(v) => updateRange(i, 'angle', v)}
                  />
                </div>
              ))}
            </div>

            <button type="button" onClick={addRange}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-700 hover:text-violet-900">
              <Icon name="plus" className="w-4 h-4" strokeWidth={2} />Añadir otro rango
            </button>

            {preview.length > 0 && (
              <Section title={`Se crearán ${preview.length} mesa${preview.length !== 1 ? 's' : ''}`}>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {preview.map((name, i) => (
                    <span key={i} className="text-[11px] font-semibold px-1.5 py-px rounded bg-violet-50 text-violet-800">
                      {name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {quickError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{quickError}</p>
            )}
          </div>
        </Modal>
      )}

      {/* Create / edit modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva mesa' : 'Editar mesa'}
          subtitle={modal !== 'create' ? modal.name : undefined}
          onClose={() => setModal(null)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setModal(null)}
                className="h-10 px-3.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" form="table-form"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                {modal === 'create' ? 'Crear mesa' : 'Guardar'}
              </button>
            </div>
          }
        >
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-4">{error}</p>
          )}
          <form id="table-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mesa 1, Terraza A, Barra…"
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Personas</label>
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
            <ShapeFields
              shape={form.shape}
              angle={form.angle}
              onShape={(v) => setForm(f => ({ ...f, shape: v }))}
              onAngle={(v) => setForm(f => ({ ...f, angle: v }))}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

/** Forma (and orientation when it applies) as segmented pills. */
function ShapeFields({ shape, angle, onShape, onAngle }) {
  const oriented = shape === 'rect' || shape === 'square';
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3">
      <div>
        <label className={labelCls}>Forma</label>
        <Segmented value={shape} onChange={onShape} options={TABLE_SHAPE_OPTIONS.map(o => [o.value, o.label])} />
      </div>
      {oriented && (
        <div>
          <label className={labelCls}>Orientación</label>
          <Segmented value={normalizeTableAngle(angle)} onChange={(v) => onAngle(Number(v))} options={TABLE_ANGLE_OPTIONS.map(o => [o.value, o.label])} />
        </div>
      )}
    </div>
  );
}
