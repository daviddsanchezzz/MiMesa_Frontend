import { useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, btnSecondary, inputCls, labelCls } from './utils';

function toForm(service) {
  const staffReq = (service?.requirements || []).find((r) => r.kind === 'staff');
  const spaceReq = (service?.requirements || []).find((r) => r.kind === 'space');
  return {
    name: service?.name || '',
    category: service?.category || '',
    durationMin: service?.durationMin ?? 30,
    bufferAfterMin: service?.bufferAfterMin ?? 0,
    slotIntervalMin: service?.slotIntervalMin ?? 15,
    price: service ? String((service.price?.amount || 0) / 100) : '',
    taxRate: service?.tax?.rate ?? 21,
    staffIds: (staffReq?.resourceIds || []).map(String),
    customerCanChoose: staffReq ? !!staffReq.customerCanChoose : true,
    needsSpace: !!spaceReq,
    online: service?.onlineBooking?.enabled ?? true,
    minNoticeHours: service?.onlineBooking?.minNoticeHours ?? 2,
    maxDaysAhead: service?.onlineBooking?.maxDaysAhead ?? 60,
    requireApproval: !!service?.onlineBooking?.requireApproval,
  };
}

// Requirements this simple form does not edit (equipment, custom setups via API) are kept as they were.
function toApi(f, original) {
  const kept = (original?.requirements || []).filter((r) => r.kind !== 'staff' && r.kind !== 'space');
  const isPool = original?.capacityMode === 'pool';
  return {
    name: f.name.trim(),
    category: f.category.trim(),
    durationMin: Number(f.durationMin),
    bufferAfterMin: Number(f.bufferAfterMin),
    slotIntervalMin: Number(f.slotIntervalMin),
    price: { amount: Math.round(Number(String(f.price).replace(',', '.') || 0) * 100) },
    tax: { rate: Number(f.taxRate) },
    ...(isPool ? {} : {
      requirements: [
        { kind: 'staff', resourceIds: f.staffIds, customerCanChoose: f.customerCanChoose },
        ...(f.needsSpace ? [{ kind: 'space', optional: true }] : []),
        ...kept.map(({ kind, count, resourceIds, optional, customerCanChoose, matchPartySize }) => ({
          kind, count, resourceIds: (resourceIds || []).map(String), optional, customerCanChoose, matchPartySize,
        })),
      ],
    }),
    onlineBooking: {
      enabled: f.online,
      minNoticeHours: Number(f.minNoticeHours),
      maxDaysAhead: Number(f.maxDaysAhead),
      requireApproval: f.requireApproval,
    },
  };
}

const STEP5 = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

export default function ServiceFormModal({ service, staff, onClose, onSaved }) {
  const [f, setF] = useState(() => toForm(service));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const toggleStaff = (id) => set({ staffIds: f.staffIds.includes(id) ? f.staffIds.filter((x) => x !== id) : [...f.staffIds, id] });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = toApi(f, service);
      onSaved(service ? await bookingsApi.updateService(service._id, data) : await bookingsApi.createService(data));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const durations = STEP5.includes(Number(f.durationMin)) ? STEP5 : [...STEP5, Number(f.durationMin)].sort((a, b) => a - b);

  return (
    <Modal title={service ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre</label>
            <input className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} required maxLength={120} placeholder="Corte, Sesión individual…" />
          </div>
          <div>
            <label className={labelCls}>Categoría <span className="font-normal text-gray-400">(opcional)</span></label>
            <input className={inputCls} value={f.category} onChange={(e) => set({ category: e.target.value })} maxLength={60} />
          </div>
          <div>
            <label className={labelCls}>Duración</label>
            <select className={inputCls} value={f.durationMin} onChange={(e) => set({ durationMin: e.target.value })}>
              {durations.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Precio (€)</label>
            <input className={inputCls} inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Margen después <span className="font-normal text-gray-400">(limpiar, preparar)</span></label>
            <select className={inputCls} value={f.bufferAfterMin} onChange={(e) => set({ bufferAfterMin: e.target.value })}>
              {[0, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m ? `${m} min` : 'Sin margen'}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Horas que se ofrecen cada</label>
            <select className={inputCls} value={f.slotIntervalMin} onChange={(e) => set({ slotIntervalMin: e.target.value })}>
              {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>IVA</label>
            <select className={inputCls} value={f.taxRate} onChange={(e) => set({ taxRate: e.target.value })}>
              <option value={21}>21 %</option>
              <option value={10}>10 %</option>
              <option value={4}>4 %</option>
              <option value={0}>Exento (0 %)</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>¿Quién lo hace? <span className="font-normal text-gray-400">(sin marcar = cualquiera)</span></label>
          <div className="flex flex-wrap gap-2">
            {staff.length === 0 && <p className="text-xs text-gray-400">Aún no hay profesionales.</p>}
            {staff.map((s) => (
              <button key={s._id} type="button" onClick={() => toggleStaff(s._id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  f.staffIds.includes(s._id) ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
            <input type="checkbox" checked={f.customerCanChoose} onChange={(e) => set({ customerCanChoose: e.target.checked })} />
            El cliente puede elegir profesional
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
            <input type="checkbox" checked={f.needsSpace} onChange={(e) => set({ needsSpace: e.target.checked })} />
            Usa una sala o espacio si hay uno libre
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input type="checkbox" checked={f.online} onChange={(e) => set({ online: e.target.checked })} />
            Se puede reservar online
          </label>
          {f.online && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Antelación mínima (h)</label>
                <input type="number" min={0} className={inputCls} value={f.minNoticeHours} onChange={(e) => set({ minNoticeHours: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Hasta cuántos días vista</label>
                <input type="number" min={1} max={730} className={inputCls} value={f.maxDaysAhead} onChange={(e) => set({ maxDaysAhead: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:mt-6">
                <input type="checkbox" checked={f.requireApproval} onChange={(e) => set({ requireApproval: e.target.checked })} />
                Requiere aprobación
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
