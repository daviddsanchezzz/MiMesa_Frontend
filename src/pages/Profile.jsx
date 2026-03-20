import { useEffect, useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
      {msg}
    </div>
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
      setPageError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPageError('Las contraseñas no coinciden');
      return;
    }

    setSavingPassword(true);
    setPageError('');
    try {
      await api.put('/users/me/password', { newPassword: passwordForm.newPassword });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo actualizar la contraseña');
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
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona tus datos personales, seguridad y notificaciones</p>
      </div>

      <ErrorBanner msg={pageError} />

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Informacion personal</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input
                className={inputCls}
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <input
                className={inputCls}
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={`${inputCls} bg-gray-50`} value={user.email} disabled />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingProfile ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Seguridad</h2>
        <form onSubmit={savePassword} className="space-y-4 max-w-md">
          <div>
            <label className={labelCls}>Nueva contraseña</label>
            <input
              type="password"
              className={inputCls}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Confirmar nueva contraseña</label>
            <input
              type="password"
              className={inputCls}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Notificaciones por negocio</h2>
        <div className="space-y-3">
          {memberships.map((m) => (
            <div key={m.id} className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900">{m.businessName}</p>
              <p className="text-xs text-gray-400 mb-3">Rol: {m.role}</p>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!m.notificationPreferences?.newReservationEmail}
                    onChange={(e) => updateMembershipPreference(m.id, { newReservationEmail: e.target.checked })}
                  />
                  Avisarme por email cuando se crea una reserva
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!m.notificationPreferences?.cancelledReservationEmail}
                    onChange={(e) => updateMembershipPreference(m.id, { cancelledReservationEmail: e.target.checked })}
                  />
                  Avisarme por email cuando se cancela una reserva
                </label>
              </div>
            </div>
          ))}
          {memberships.length === 0 && (
            <p className="text-sm text-gray-500">No tienes membresias activas.</p>
          )}
        </div>
      </section>
    </div>
  );
}
