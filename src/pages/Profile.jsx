import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-slate-300 bg-white rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent';
const labelCls = 'block text-xs font-semibold tracking-wide uppercase text-slate-500 mb-1.5';

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3.5 py-2.5">
      {msg}
    </div>
  );
}

function SectionCard({ title, subtitle, children, tone = 'default' }) {
  const toneClass = tone === 'soft'
    ? 'bg-gradient-to-br from-cyan-50 via-white to-blue-50 border-cyan-100'
    : 'bg-white border-slate-200';

  return (
    <section className={`rounded-3xl border shadow-sm ${toneClass}`}>
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
        <span className="absolute inset-0 rounded-full bg-slate-300 peer-checked:bg-cyan-500 transition-colors" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
      </span>
    </label>
  );
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [user, setUser] = useState({ id: '', name: '', email: '', phone: '' });
  const [memberships, setMemberships] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const initials = useMemo(() => {
    const text = (profileForm.name || user.email || 'U').trim();
    return text.slice(0, 2).toUpperCase();
  }, [profileForm.name, user.email]);

  const load = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data.user || { id: '', name: '', email: '', phone: '' });
      setProfileForm({
        name: data.user?.name || '',
        phone: data.user?.phone || '',
      });
      setMemberships(data.memberships || []);
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setPageError('');
    try {
      const { data } = await api.put('/users/me', profileForm);
      setUser((u) => ({ ...u, ...data.user }));
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo guardar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setPageError('La nueva contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPageError('Las contrasenas no coinciden');
      return;
    }

    setSavingPassword(true);
    setPageError('');
    try {
      await api.put('/users/me/password', { newPassword: passwordForm.newPassword });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo actualizar la contrasena');
    } finally {
      setSavingPassword(false);
    }
  };

  const updateMembershipPreference = async (membershipId, patch) => {
    const prev = memberships;
    const optimistic = memberships.map((m) =>
      m.id === membershipId
        ? { ...m, notificationPreferences: { ...m.notificationPreferences, ...patch } }
        : m
    );
    setMemberships(optimistic);
    try {
      await api.put(`/users/me/memberships/${membershipId}/notifications`, patch);
    } catch (err) {
      setMemberships(prev);
      setPageError(err.response?.data?.message || 'No se pudieron guardar las notificaciones');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-6 py-7 text-white shadow-lg">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
            <p className="text-sm text-cyan-100/90 mt-1">Gestiona tus datos personales, seguridad y alertas por negocio.</p>
          </div>
        </div>
      </div>

      <ErrorBanner msg={pageError} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard title="Informacion personal" subtitle="Estos datos se usan dentro del equipo y en comunicaciones internas." tone="soft">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre</label>
                <input
                  className={inputCls}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className={labelCls}>Telefono</label>
                <input
                  className={inputCls}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+34 ..."
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={`${inputCls} bg-slate-100 text-slate-500`} value={user.email} disabled />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
              >
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Seguridad" subtitle="Cambia tu contrasena de acceso.">
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Nueva contrasena</label>
              <input
                type="password"
                className={inputCls}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <div>
              <label className={labelCls}>Confirmar nueva contrasena</label>
              <input
                type="password"
                className={inputCls}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
              >
                {savingPassword ? 'Actualizando...' : 'Actualizar contrasena'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Notificaciones por negocio" subtitle="Activa o desactiva alertas de reservas para cada membresia.">
        {memberships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No tienes membresias activas.
          </div>
        ) : (
          <div className="space-y-4">
            {memberships.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{m.businessName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Rol: {m.role}</p>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                    Alertas
                  </span>
                </div>

                <div className="space-y-2">
                  <Toggle
                    checked={!!m.notificationPreferences?.newReservationEmail}
                    onChange={(e) => updateMembershipPreference(m.id, { newReservationEmail: e.target.checked })}
                    label="Nueva reserva"
                    description="Recibir email cuando entra una reserva nueva"
                  />
                  <Toggle
                    checked={!!m.notificationPreferences?.cancelledReservationEmail}
                    onChange={(e) => updateMembershipPreference(m.id, { cancelledReservationEmail: e.target.checked })}
                    label="Reserva cancelada"
                    description="Recibir email cuando una reserva se cancela"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
