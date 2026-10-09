import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { queryClient, useData } from '../lib/query';
import FloorEditor from '../floor/FloorEditor';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { PageHeader, PrimaryButton, GhostButton, Segmented, Section } from '../ui/kit';
import { inputCls, labelCls } from '../ui/form';
import { ErrorBanner } from '../ui/feedback';

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
  const limit = planLimit('maxTables'); // Infinity on Basic/Pro
  const tablesQ = useData(['tables'], () => api.get('/tables').then((r) => r.data || []));
  const roomsQ = useData(['rooms'], () => api.get('/rooms').then((r) => r.data || []));
  const tables = tablesQ.data || [];
  const rooms = roomsQ.data || [];

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
  const atLimit      = limit !== Infinity && tables.length >= limit;
  const seats = activeTables.reduce((s, t) => s + (Number(t.capacity) || 0), 0);

  useSetMobileHeader({ title: 'Mesas y salas', action: atLimit ? false : { label: 'Varias', onClick: openQuick } });

  const handleQuickCreate = async () => {
    setQuickError('');
    if (preview.length === 0) { setQuickError('Define al menos un rango válido'); return; }
    if (preview.length > 200) { setQuickError('Máximo 200 mesas por operación'); return; }
    const list = [];
    for (const r of ranges) {
      const from = Number(r.from), to = Number(r.to);
      if (!from || !to || from > to) continue;
      for (let i = from; i <= to; i++) {
        const resolvedShape = TABLE_SHAPE_OPTIONS.some(s => s.value === r.shape)
          ? r.shape
          : inferTableShape(Number(r.capacity) || 2);
        list.push({
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
      await api.post('/tables/bulk', { tables: list });
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      setQuickOpen(false);
      setRanges([emptyRange()]);
    } catch (err) {
      setQuickError(err.response?.data?.message || 'Error al crear mesas');
    } finally {
      setQuickLoading(false);
    }
  };

  const quickLabel = quickLoading ? 'Creando…' : `Crear ${preview.length} mesa${preview.length !== 1 ? 's' : ''}`;

  const header = (
    <>
      <PageHeader
        title="Mesas y salas"
        subtitle={
          <>
            {activeTables.length}{limit !== Infinity ? ` de ${limit}` : ''} mesa{activeTables.length !== 1 ? 's' : ''} · {seats} plazas · {rooms.length} sala{rooms.length !== 1 ? 's' : ''}
            {lockedTables.length > 0 && <span className="text-amber-600"> · {lockedTables.length} bloqueada{lockedTables.length !== 1 ? 's' : ''}</span>}
          </>
        }
        actions={<GhostButton onClick={openQuick} disabled={atLimit}><Icon name="list" className="w-4 h-4" />Crear varias</GhostButton>}
      />
      {atLimit && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-900 flex-1 min-w-0">
            Has llegado al límite de <b className="font-semibold">{limit} mesas</b> de tu plan.
            {lockedTables.length > 0 && <> Las bloqueadas salen en gris y no se usan en las reservas.</>}
          </p>
          <Link to="/configuracion?tab=suscripcion" className="text-[13px] font-semibold text-amber-900 underline hover:no-underline shrink-0">Mejorar plan</Link>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col">
      <FloorEditor maxTables={limit} header={header} />

      {/* Quick creator modal */}
      {quickOpen && (
        <Modal
          size="lg"
          title="Crear varias mesas"
          subtitle="Por ejemplo Mesa 1 a Mesa 10, de 4 personas, en la Terraza"
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
              <ErrorBanner>{quickError}</ErrorBanner>
            )}
          </div>
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
