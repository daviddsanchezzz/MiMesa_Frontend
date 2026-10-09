import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PrimaryButton, Toggle, MenuButton, Empty } from '../ui/kit';
import { dateNumeric } from '../lib/format';
import { confirmDialog } from '../ui/confirm';

const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
const labelCls = 'block text-[13px] font-medium text-gray-700 mb-1.5';

export default function PromoCodes() {
  useSetMobileHeader({ title: 'Publicidad', action: { label: 'Nuevo', onClick: () => setCreating(true) } });
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
    if (!await confirmDialog('¿Eliminar este código?')) return;
    try {
      await api.delete(`/promos/${id}`);
      setPromos(ps => ps.filter(p => p._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const fmtDate = dateNumeric;
  const isExpired = (p) => p.expiresAt && new Date() > new Date(p.expiresAt);
  const isMaxed   = (p) => p.maxUses !== null && p.usedCount >= p.maxUses;

  const closeCreate = () => { setCreating(false); setError(''); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Los clientes pueden usarlos al reservar online.</p>
        <PrimaryButton onClick={() => setCreating(true)} className="hidden lg:inline-flex">Nuevo código</PrimaryButton>
      </div>

      {error && !creating && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {creating && (
        <Modal title="Nuevo código promocional" subtitle="Lo introducen al reservar en tu web" size="md" onClose={closeCreate}
          footer={(
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={closeCreate}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" form="promo-form"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                Crear código
              </button>
            </div>
          )}>
          <form id="promo-form" onSubmit={handleCreate} className="space-y-4">
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div>
              <label className={labelCls} htmlFor="promo-code">Código</label>
              <input id="promo-code" className={`${inputCls} uppercase font-mono tracking-wide`} value={form.code} required maxLength={32}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="VERANO2024" />
            </div>
            <div>
              <label className={labelCls} htmlFor="promo-desc">Descripción <span className="font-normal text-gray-400">(la ve el cliente)</span></label>
              <input id="promo-desc" className={inputCls} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="10% de descuento en tu reserva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="promo-exp">Caduca el</label>
                <input id="promo-exp" type="date" className={inputCls} value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls} htmlFor="promo-max">Usos máximos</label>
                <input id="promo-max" type="number" min="1" className={inputCls} value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  placeholder="Sin límite" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Deja la fecha y los usos en blanco para que no caduque.</p>
          </form>
        </Modal>
      )}

      {loading ? (
        <p className="py-6 text-sm text-gray-500">Cargando…</p>
      ) : promos.length === 0 ? (
        <Empty>No hay códigos promocionales.</Empty>
      ) : (
        <div>
          <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span className="col-span-5">Código</span>
            <span className="col-span-2">Estado</span>
            <span className="col-span-2">Usos</span>
            <span className="col-span-2">Caduca</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {promos.map(p => {
              const expired = isExpired(p);
              const maxed   = isMaxed(p);
              const statusLabel = !p.active ? 'Inactivo' : expired ? 'Expirado' : maxed ? 'Agotado' : 'Activo';
              const live = p.active && !expired && !maxed;
              const uses = `${p.usedCount}${p.maxUses ? `/${p.maxUses}` : ''} usos`;
              const status = (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${live ? 'text-emerald-700' : 'text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500' : p.active ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  {statusLabel}
                </span>
              );
              return (
                <li key={p._id} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-50 md:grid md:grid-cols-12 md:gap-4">
                  <div className="min-w-0 flex-1 md:col-span-5">
                    <p className={`font-mono text-[15px] font-semibold tracking-wide truncate ${live ? 'text-gray-900' : 'text-gray-500'}`}>{p.code}</p>
                    {p.description && <p className="text-[13px] text-gray-500 truncate">{p.description}</p>}
                    <p className="md:hidden text-[13px] text-gray-500 flex flex-wrap items-center gap-x-2">
                      {status}<span className="text-gray-300">·</span><span className="tabular-nums">{uses}</span>
                      {p.expiresAt && <><span className="text-gray-300">·</span><span>hasta {fmtDate(p.expiresAt)}</span></>}
                    </p>
                  </div>
                  <div className="hidden md:block md:col-span-2">{status}</div>
                  <p className="hidden md:block md:col-span-2 text-sm text-gray-900 tabular-nums">{uses}</p>
                  <p className="hidden md:block md:col-span-2 text-sm text-gray-700 tabular-nums">{p.expiresAt ? fmtDate(p.expiresAt) : 'Sin fecha'}</p>
                  <div className="md:col-span-1 flex items-center justify-end gap-1 shrink-0">
                    <Toggle on={p.active} onChange={() => handleToggle(p)} label={p.active ? 'Desactivar' : 'Activar'} />
                    <MenuButton ariaLabel="Más opciones" className="w-8 h-8 justify-center text-lg leading-none text-gray-500"
                      items={[{ label: 'Eliminar código', onClick: () => handleDelete(p._id) }]}>
                      ⋯
                    </MenuButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
