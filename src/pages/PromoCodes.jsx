import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PrimaryButton, Toggle, MoreMenu, MenuButton, Empty } from '../ui/kit';
import { dateNumeric } from '../lib/format';
import { confirmDialog } from '../ui/confirm';
import { inputCls, labelCls } from '../ui/form';
import { ErrorBanner, Loading } from '../ui/feedback';
import { DataTable, StatusDot } from '../ui/list';


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

  const promoRow = (p) => {
    const expired = isExpired(p);
    const maxed = isMaxed(p);
    const label = !p.active ? 'Inactivo' : expired ? 'Expirado' : maxed ? 'Agotado' : 'Activo';
    const live = p.active && !expired && !maxed;
    const uses = `${p.usedCount}${p.maxUses ? `/${p.maxUses}` : ''} usos`;
    const status = <StatusDot tone={live ? 'green' : p.active ? 'amber' : 'gray'}>{label}</StatusDot>;
    const controls = (
      <div className="flex items-center justify-end gap-1">
        <Toggle on={p.active} onChange={() => handleToggle(p)} label={p.active ? 'Desactivar' : 'Activar'} />
        <MoreMenu items={[{ label: 'Eliminar código', danger: true, onClick: () => handleDelete(p._id) }]} />
      </div>
    );
    const code = (
      <span className="block min-w-0">
        <span className={`block truncate font-mono text-[15px] font-semibold tracking-wide ${live ? 'text-gray-900' : 'text-gray-500'}`}>{p.code}</span>
        {p.description && <span className="block truncate text-[13px] text-gray-500">{p.description}</span>}
      </span>
    );
    return {
      code, status, uses, controls,
      mobile: {
        title: <span className={`font-mono tracking-wide ${live ? '' : 'text-gray-500'}`}>{p.code}</span>,
        subtitle: p.description || undefined,
        status: <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-gray-500">{status}<span className="text-gray-300">·</span><span className="tabular-nums">{uses}</span>{p.expiresAt && <><span className="text-gray-300">·</span><span>hasta {fmtDate(p.expiresAt)}</span></>}</span>,
        trailing: controls,
      },
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Los clientes pueden usarlos al reservar online.</p>
        <PrimaryButton onClick={() => setCreating(true)} className="hidden lg:inline-flex">Nuevo código</PrimaryButton>
      </div>

      {error && !creating && <ErrorBanner>{error}</ErrorBanner>}

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
            {error && <ErrorBanner>{error}</ErrorBanner>}
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
        <Loading />
      ) : promos.length === 0 ? (
        <Empty>No hay códigos promocionales.</Empty>
      ) : (
        <DataTable rows={promos} rowKey={(p) => p._id}
          mobile={(p) => ({ ...promoRow(p).mobile })}
          columns={[
            { label: 'Código', span: 5, render: (p) => promoRow(p).code },
            { label: 'Estado', span: 2, render: (p) => promoRow(p).status },
            { label: 'Usos', span: 2, render: (p) => <span className="tabular-nums text-gray-900">{promoRow(p).uses}</span> },
            { label: 'Caduca', span: 2, render: (p) => <span className="tabular-nums">{p.expiresAt ? fmtDate(p.expiresAt) : 'Sin fecha'}</span> },
            { label: '', span: 1, align: 'right', render: (p) => promoRow(p).controls },
          ]} />
      )}
    </div>
  );
}
