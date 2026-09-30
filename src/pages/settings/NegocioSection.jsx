import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ErrorBanner, inputCls, labelCls } from './shared';

// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function NegocioSection() {
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
        <p className="text-sm text-gray-500 mb-4">Nombre, contacto y datos fiscales del negocio.</p>
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
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.phone} disabled={!canEdit || saving} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
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
