import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
      {msg}
    </div>
  );
}

function Avatar({ name, email }) {
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500'];
  const base = (name || email || 'U').trim();
  const idx = (base.charCodeAt(0) || 0) % colors.length;
  const initials = base.slice(0, 2).toUpperCase();

  return (
    <div className={`w-12 h-12 rounded-xl ${colors[idx]} flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function MembershipCard({ membership, onToggle }) {
  const prefs = membership.notificationPreferences || {};

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{membership.businessName}</p>
          <p className="text-xs text-gray-400 mt-0.5">Rol: {membership.role}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Notificaciones</span>
      </div>

      <div className="space-y-2">
        <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
          <span className="text-sm text-gray-700">Avisarme por email cuando se crea una reserva</span>
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={!!prefs.newReservationEmail}
              onChange={(e) => onToggle({ newReservationEmail: e.target.checked })}
            />
            <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-indigo-500 transition-colors" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
          </span>
        </label>
        <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
          <span className="text-sm text-gray-700">Avisarme por email cuando se cancela una reserva</span>
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={!!prefs.cancelledReservationEmail}
              onChange={(e) => onToggle({ cancelledReservationEmail: e.target.checked })}
            />
            <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-indigo-500 transition-colors" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
          </span>
        </label>
      </div>
    </div>
  );
}

export default function Profile() {
  const { business, switchBusiness, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [user, setUser] = useState({ id: '', name: '', email: '' });
  const [memberships, setMemberships] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newBusiness, setNewBusiness] = useState({ name: '', email: '', phone: '', cif: '' });
  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState(false);

  const summary = useMemo(() => ({
    businesses: memberships.length,
    notificationsEnabled: memberships.reduce((acc, m) => {
      const p = m.notificationPreferences || {};
      if (p.newReservationEmail) acc += 1;
      if (p.cancelledReservationEmail) acc += 1;
      return acc;
    }, 0),
  }), [memberships]);
  const ownerMemberships = useMemo(
    () => memberships.filter((m) => m.role === 'owner'),
    [memberships]
  );
  const isOwnerAnyBusiness = ownerMemberships.length > 0;

  const load = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data.user || { id: '', name: '', email: '' });
      setProfileForm({
        name: data.user?.name || '',
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
      setShowPasswordModal(false);
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

  const handleSwitchBusiness = async (businessId) => {
    setPageError('');
    try {
      await switchBusiness(businessId);
      await load();
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo cambiar el negocio activo');
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setSavingBusiness(true);
    setPageError('');
    try {
      await api.post('/businesses', newBusiness);
      setShowCreateBusinessModal(false);
      setNewBusiness({ name: '', email: '', phone: '', cif: '' });
      await refreshBusiness();
      await load();
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo crear el negocio');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleDeleteBusiness = async (businessId, businessName) => {
    if (!window.confirm(`¿Eliminar "${businessName}"? Esta accion borra reservas, clientes y configuracion del negocio.`)) return;
    setSavingBusiness(true);
    setPageError('');
    try {
      await api.delete(`/businesses/${businessId}`);
      await refreshBusiness();
      await load();
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo eliminar el negocio');
    } finally {
      setSavingBusiness(false);
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tus datos personales, seguridad y notificaciones.</p>
        </div>
      </div>

      <ErrorBanner msg={pageError} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
        <Avatar name={profileForm.name} email={user.email} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{profileForm.name || 'Sin nombre'}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{user.email || '-'}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2.5 py-1 rounded-full bg-gray-100">{summary.businesses} negocios</span>
          <span className="px-2.5 py-1 rounded-full bg-gray-100">{summary.notificationsEnabled} alertas activas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Informacion personal</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input
                className={inputCls}
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input className={`${inputCls} bg-gray-50 text-gray-500`} value={user.email} disabled />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Seguridad</h2>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M5 8V6a5 5 0 1 1 10 0v2a2 2 0 0 1 2 2v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a2 2 0 0 1 2-2Zm8-2a3 3 0 1 0-6 0v2h6V6Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Contrasena</p>
                  <p className="text-xs text-gray-500 mt-0.5">Recomendado cambiarla periodicamente y usar una clave unica.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 shrink-0"
              >
                Cambiar
              </button>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-400">Tu sesion actual permanecera activa tras el cambio.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {memberships.length <= 1 ? 'Notificaciones' : 'Notificaciones por negocio'}
        </h2>

        {memberships.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-500">No tienes membresias activas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.length === 1 ? (
              <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                <div className="space-y-2">
                  <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                    <span className="text-sm text-gray-700">Avisarme por email cuando se crea una reserva</span>
                    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={!!memberships[0].notificationPreferences?.newReservationEmail}
                        onChange={(e) => updateMembershipPreference(memberships[0].id, { newReservationEmail: e.target.checked })}
                      />
                      <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-indigo-500 transition-colors" />
                      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
                    </span>
                  </label>
                  <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                    <span className="text-sm text-gray-700">Avisarme por email cuando se cancela una reserva</span>
                    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={!!memberships[0].notificationPreferences?.cancelledReservationEmail}
                        onChange={(e) => updateMembershipPreference(memberships[0].id, { cancelledReservationEmail: e.target.checked })}
                      />
                      <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-indigo-500 transition-colors" />
                      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform" />
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              memberships.map((m) => (
                <MembershipCard
                  key={m.id}
                  membership={m}
                  onToggle={(patch) => updateMembershipPreference(m.id, patch)}
                />
              ))
            )}
          </div>
        )}
      </section>

      {isOwnerAnyBusiness && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Mis negocios</h2>
              <p className="text-sm text-gray-500 mt-0.5">Gestiona tus negocios como propietario.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateBusinessModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Nuevo negocio
            </button>
          </div>

          <div className="space-y-3">
            {ownerMemberships.map((m) => {
              const isActive = business?.id === m.businessId;
              return (
                <div key={m.id} className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.businessName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isActive ? 'Negocio activo' : 'No activo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleSwitchBusiness(m.businessId)}
                        disabled={savingBusiness}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBusiness(m.businessId, m.businessName)}
                      disabled={savingBusiness}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showPasswordModal && (
        <Modal
          title="Cambiar contrasena"
          subtitle="Introduce tu nueva contrasena"
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordForm({ newPassword: '', confirmPassword: '' });
          }}
        >
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Nueva contrasena</label>
              <input
                type="password"
                className={inputCls}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
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
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingPassword ? 'Actualizando...' : 'Guardar nueva contrasena'}
            </button>
          </form>
        </Modal>
      )}

      {showCreateBusinessModal && (
        <Modal
          title="Nuevo negocio"
          subtitle="Crea un nuevo restaurante y te asignaremos como owner"
          onClose={() => {
            setShowCreateBusinessModal(false);
            setNewBusiness({ name: '', email: '', phone: '', cif: '' });
          }}
        >
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre del negocio</label>
              <input
                className={inputCls}
                required
                value={newBusiness.name}
                onChange={(e) => setNewBusiness((b) => ({ ...b, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                required
                value={newBusiness.email}
                onChange={(e) => setNewBusiness((b) => ({ ...b, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Telefono</label>
                <input
                  className={inputCls}
                  value={newBusiness.phone}
                  onChange={(e) => setNewBusiness((b) => ({ ...b, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>CIF</label>
                <input
                  className={inputCls}
                  value={newBusiness.cif}
                  onChange={(e) => setNewBusiness((b) => ({ ...b, cif: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingBusiness}
              className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingBusiness ? 'Creando...' : 'Crear negocio'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
