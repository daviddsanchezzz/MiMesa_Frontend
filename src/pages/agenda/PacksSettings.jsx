import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnPrimary, btnSecondary, centsToInput, euros, inputCls, labelCls, parseEuros } from './utils';

const VALIDITY = [[null, 'No caduca'], [90, '3 meses'], [180, '6 meses'], [365, '1 año'], [730, '2 años']];

function PackModal({ pack, services, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: pack?.name || '',
    sessions: pack ? String(pack.sessions) : '5',
    price: pack ? centsToInput(pack.price) : '',
    validityDays: pack?.validityDays ?? null,
    serviceIds: pack?.serviceIds?.map(String) || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleService = (id) => set({ serviceIds: form.serviceIds.includes(id) ? form.serviceIds.filter((x) => x !== id) : [...form.serviceIds, id] });

  async function save() {
    setError('');
    const price = parseEuros(form.price);
    if (!form.name.trim()) return setError('Ponle un nombre al bono');
    if (price === null) return setError('El precio no es válido');
    setSaving(true);
    try {
      const data = { name: form.name.trim(), sessions: Number(form.sessions), price, validityDays: form.validityDays, serviceIds: form.serviceIds };
      if (pack) await bookingsApi.updatePack(pack._id, data); else await bookingsApi.createPack(data);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const perSession = parseEuros(form.price) && Number(form.sessions) > 0 ? Math.round(parseEuros(form.price) / Number(form.sessions)) : null;

  return (
    <Modal title={pack ? 'Editar bono' : 'Nuevo bono'} subtitle="Se paga por adelantado y se gasta una sesión en cada cita." onClose={onClose} size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      )}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nombre</label>
          <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Bono 5 sesiones de láser" maxLength={80} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sesiones</label>
            <input className={`${inputCls} tabular-nums text-right`} inputMode="numeric" value={form.sessions} onChange={(e) => set({ sessions: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label className={labelCls}>Precio total (€)</label>
            <input className={`${inputCls} tabular-nums text-right`} inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="250" />
          </div>
        </div>
        {perSession !== null && <p className="-mt-2 text-xs text-gray-500">Sale a {euros(perSession)} por sesión.</p>}
        <div>
          <label className={labelCls}>Validez</label>
          <select className={inputCls} value={form.validityDays ?? ''} onChange={(e) => set({ validityDays: e.target.value ? Number(e.target.value) : null })}>
            {VALIDITY.map(([days, label]) => <option key={label} value={days ?? ''}>{label}</option>)}
          </select>
        </div>
        <div>
          <p className={labelCls}>¿Para qué servicios vale?</p>
          <label className="flex items-center gap-2 py-1.5 text-sm text-gray-800">
            <input type="checkbox" checked={form.serviceIds.length === 0} onChange={() => set({ serviceIds: [] })} />
            Para cualquier servicio
          </label>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl px-3">
            {services.map((s) => (
              <li key={s._id}>
                <label className="flex items-center gap-2 py-2 text-sm text-gray-800">
                  <input type="checkbox" checked={form.serviceIds.includes(String(s._id))} onChange={() => toggleService(String(s._id))} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{euros(s.price?.amount)}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-gray-500">Si eliges servicios, el bono solo se puede usar en citas hechas solo de esos servicios.</p>
        </div>
        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}

/** Configuración → Bonos: the packs the business sells. */
export default function PacksSettings() {
  const [packs, setPacks] = useState(null);
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [error, setError] = useState('');

  const load = () => bookingsApi.packs(true).then(setPacks).catch((err) => setError(apiError(err)));
  useEffect(() => {
    load();
    bookingsApi.services().then(setServices).catch(() => {});
  }, []);

  async function remove(p) {
    if (!window.confirm(`¿Quitar el bono «${p.name}»? Los clientes que ya lo tienen lo conservan.`)) return;
    try { await bookingsApi.deletePack(p._id); load(); } catch (err) { setError(apiError(err)); }
  }
  async function restore(p) {
    try { await bookingsApi.updatePack(p._id, { name: p.name, sessions: p.sessions, price: p.price, serviceIds: p.serviceIds, validityDays: p.validityDays, active: true }); load(); }
    catch (err) { setError(apiError(err)); }
  }

  if (!packs) return <p className="text-sm text-gray-400">{error || 'Cargando…'}</p>;
  const active = packs.filter((p) => p.active);
  const off = packs.filter((p) => !p.active);
  const serviceNames = (p) => (p.serviceIds || []).length
    ? p.serviceIds.map((id) => services.find((s) => s._id === id)?.name).filter(Boolean).join(', ') || 'Servicios elegidos'
    : 'Cualquier servicio';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Vende sesiones por adelantado: el cliente paga el bono y en cada cita gastas una sesión.</p>
        <button type="button" onClick={() => setEditing(null)} className="shrink-0 h-9 px-3.5 rounded-full bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700">+ Nuevo</button>
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[15px] font-medium text-gray-900">Todavía no tienes bonos</p>
          <p className="mt-1 text-sm text-gray-500">Por ejemplo «5 sesiones de láser» a un precio cerrado. Lo vendes desde la ficha del cliente.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border-y border-gray-100">
          {active.map((p) => (
            <li key={p._id} className="py-3 flex items-center gap-3">
              <button type="button" className="min-w-0 flex-1 text-left group" onClick={() => setEditing(p)}>
                <p className="text-[15px] font-medium text-gray-900 truncate group-hover:text-violet-700">{p.name}</p>
                <p className="text-[13px] text-gray-500 truncate">{p.sessions} sesiones · {serviceNames(p)} · {p.validityDays ? `caduca a los ${p.validityDays >= 365 ? `${Math.round(p.validityDays / 365)} ${p.validityDays >= 730 ? 'años' : 'año'}` : `${Math.round(p.validityDays / 30)} meses`}` : 'no caduca'}</p>
              </button>
              <span className="text-[15px] font-semibold tabular-nums text-gray-900">{euros(p.price)}</span>
              <button type="button" onClick={() => remove(p)} className="w-8 h-8 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50" aria-label="Quitar bono" title="Quitar bono">✕</button>
            </li>
          ))}
        </ul>
      )}

      {off.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500">Retirados</p>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50">
            {off.map((p) => (
              <li key={p._id} className="px-3 py-2 flex items-center gap-3">
                <span className="text-sm text-gray-500">{p.name}</span>
                <button type="button" className="ml-auto text-xs font-semibold text-violet-700 hover:text-violet-900" onClick={() => restore(p)}>Volver a vender</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {editing !== undefined && <PackModal pack={editing} services={services} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
    </section>
  );
}
