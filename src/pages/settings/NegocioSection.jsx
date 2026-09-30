import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi } from '../../services/bookingsApi';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import { euros, resizeImage } from '../agenda/utils';
import { ErrorBanner, inputCls, labelCls } from './shared';

const BRAND_SWATCHES = ['#be185d', '#db2777', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#111827'];

const formFrom = (b) => ({
  name: b?.name || '', email: b?.email || '', phone: b?.phone || '', address: b?.address || '', cif: b?.cif || '',
});

// What customers see at the top of the booking page, live as you type.
function BookingPreview({ form, logoUrl, color, services }) {
  const sample = services.length ? services.slice(0, 3) : [
    { _id: 'a', name: 'Corte', durationMin: 45, price: { amount: 2200 } },
    { _id: 'b', name: 'Peinado', durationMin: 30, price: { amount: 1800 } },
  ];
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-[6px] border-gray-900 bg-gray-50 shadow-xl overflow-hidden">
      <div className="h-5 bg-gray-900 flex justify-center"><div className="w-16 h-3 rounded-b-xl bg-gray-900" /></div>
      <div className="px-4 pt-4 pb-5 space-y-3">
        <div className="text-center space-y-1">
          {logoUrl
            ? <img src={logoUrl} alt="" className="h-11 max-w-[140px] mx-auto object-contain" />
            : <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>{(form.name || '?')[0].toUpperCase()}</div>}
          <p className="text-base font-bold text-gray-900 leading-tight">{form.name || 'Tu negocio'}</p>
          <p className="text-[11px] text-gray-500 leading-snug">
            {form.address || 'Dirección'}{' · '}
            <span className={form.phone ? '' : 'text-amber-600 font-semibold'}>{form.phone || 'sin teléfono'}</span>
          </p>
        </div>
        <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i === 0 ? color : '#e5e7eb' }} />)}</div>
        <p className="text-xs font-semibold text-gray-900">Elige un servicio</p>
        {sample.map((s) => (
          <div key={s._id} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex justify-between gap-2">
            <div className="min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{s.name}</p><p className="text-[10px] text-gray-500">{s.durationMin} min</p></div>
            <span className="text-xs font-semibold text-gray-900">{euros(s.price?.amount)}</span>
          </div>
        ))}
        <div className="rounded-xl py-2 text-center text-xs font-semibold text-white" style={{ backgroundColor: color }}>Reservar cita</div>
      </div>
    </div>
  );
}

function BrandCard({ business, refreshBusiness, onColor, color }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveLogo = async (file) => {
    setError('');
    setBusy(true);
    try {
      const logo = await resizeImage(file, { max: 400, type: 'image/png' });
      await api.put('/auth/settings', { logo });
      await refreshBusiness();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo subir el logo');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const removeLogo = async () => {
    setBusy(true);
    try { await api.put('/auth/settings', { logo: '' }); await refreshBusiness(); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Tu marca</h3>
        <p className="text-sm text-gray-500 mt-0.5">Sale en tu página de reservas, en los emails a tus clientes y en la app.</p>
      </div>
      <ErrorBanner msg={error} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-20 h-20 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {business?.logoUrl
            ? <img src={business.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1.5" />
            : <span className="text-[11px] text-gray-400 text-center px-2">Sin logo</span>}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50">
              {busy ? 'Subiendo…' : business?.logoUrl ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {business?.logoUrl && (
              <button type="button" disabled={busy} onClick={removeLogo} className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Quitar</button>
            )}
          </div>
          <p className="text-xs text-gray-400">PNG o JPG. Mejor con fondo transparente.</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && saveLogo(e.target.files[0])} />
        </div>
      </div>
      <div>
        <p className={labelCls}>Color principal</p>
        <div className="flex flex-wrap items-center gap-2">
          {BRAND_SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => onColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color.toLowerCase() === c ? 'border-gray-900 scale-110' : 'border-white shadow-sm'}`}
              style={{ backgroundColor: c }} />
          ))}
          <label className="relative w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center cursor-pointer text-gray-500 text-xs" title="Otro color">
            +
            <input type="color" value={color} onChange={(e) => onColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
      </div>
    </div>
  );
}

export function NegocioSection() {
  const { business, refreshBusiness, isAppointments } = useAuth();
  const [form, setForm] = useState(() => formFrom(business));
  const [saved, setSaved] = useState(() => formFrom(business));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [services, setServices] = useState([]);
  const [color, setColor] = useState(business?.brandColor || '#7c3aed');

  useEffect(() => { const f = formFrom(business); setForm(f); setSaved(f); }, [business]);
  useEffect(() => { if (business?.brandColor) setColor(business.brandColor); }, [business?.brandColor]);
  useEffect(() => { if (isAppointments) bookingsApi.services().then(setServices).catch(() => {}); }, [isAppointments]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedChanges('negocio', dirty);

  const saveColor = async (value) => {
    setColor(value);
    try { await api.put('/auth/settings', { brandColor: value }); await refreshBusiness(); } catch { /* keep the local preview */ }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk(false);
    try {
      await api.put('/auth/settings', form);
      await refreshBusiness();
      setSaved(form);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, props = {}, hint = null) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={form[key]} disabled={saving} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} {...props} />
      {hint}
    </div>
  );

  const formCard = (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Datos del negocio</h3>
      <p className="text-sm text-gray-500 mb-4">
        {isAppointments ? 'Tus clientes ven el nombre, la dirección y el teléfono al reservar y en los emails.' : 'Nombre, contacto y datos fiscales del negocio.'}
      </p>
      <ErrorBanner msg={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('name', 'Nombre')}
          {field('phone', 'Teléfono', { type: 'tel', placeholder: '600 000 000' },
            isAppointments && !form.phone
              ? <p className="text-xs text-amber-700 mt-1">Añádelo: tus clientes lo necesitan para llamarte si llegan tarde.</p>
              : null)}
          {field('address', 'Dirección', { placeholder: 'Calle, número, ciudad' })}
          {field('email', 'Email', { type: 'email' })}
          {field('cif', 'CIF', { placeholder: 'Opcional' })}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || !dirty} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {dirty && !saving && (
            <>
              <span className="text-xs text-amber-700">Cambios sin guardar</span>
              <button type="button" className="text-xs text-gray-500 hover:text-gray-800" onClick={() => setForm(saved)}>Descartar</button>
            </>
          )}
          {ok && <span className="text-sm text-emerald-600">Guardado ✓</span>}
        </div>
      </form>
    </div>
  );

  if (!isAppointments) return <div className="space-y-4">{formCard}</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
      <div className="xl:col-span-3 space-y-5">
        {formCard}
        <BrandCard business={business} refreshBusiness={refreshBusiness} color={color} onColor={saveColor} />
      </div>
      <div className="xl:col-span-2 xl:sticky xl:top-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-3">Así lo ven tus clientes</p>
        <BookingPreview form={form} logoUrl={business?.logoUrl} color={color} services={services.filter((s) => s.onlineBooking?.enabled !== false)} />
      </div>
    </div>
  );
}
