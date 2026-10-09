import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import PushNotificationToggle from '../components/PushNotificationToggle';
import { isPushSupported } from '../services/pushNotifications';
import BusinessTypePicker from '../components/BusinessTypePicker';
import PasswordInput from '../components/PasswordInput';
import { notify } from '../lib/notify';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Icon from '../ui/Icon';
import ProfessionalAvatar from '../components/ProfessionalAvatar';
import { bookingsApi } from '../services/bookingsApi';
import { resizeImage } from './agenda/utils';
import { confirmDialog } from '../ui/confirm';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';
const ROLE_LABELS = { owner: 'Propietario', manager: 'Encargado', staff: 'Personal' };
const EMPTY_BUSINESS = { businessType: 'restaurant', name: '', email: '', phone: '', address: '', cif: '' };

function Group({ title, hint, children }) {
  return (
    <section>
      {title && <h2 className="px-1 mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-gray-400">{title}</h2>}
      <ul className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">{children}</ul>
      {hint && <p className="px-1 mt-1.5 text-xs text-gray-400">{hint}</p>}
    </section>
  );
}

function Row({ icon, label, value, hint, onClick, control, danger, tone = 'gray' }) {
  const tones = { gray: 'bg-gray-100 text-gray-700', violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-600' };
  const inner = (
    <>
      {icon && <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones[danger ? 'rose' : tone]}`}><Icon name={icon} className="w-5 h-5" /></span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${danger ? 'text-rose-600' : 'text-gray-900'}`}>{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      {value && <span className="text-sm text-gray-500 truncate max-w-[45%] text-right">{value}</span>}
      {control}
      {onClick && !control && !danger && <Icon name="right" className="w-4 h-4 text-gray-300" strokeWidth={2} />}
    </>
  );
  const cls = 'w-full flex items-center gap-3 px-4 py-3 text-left';
  return (
    <li>
      {onClick
        ? <button type="button" onClick={onClick} className={`${cls} hover:bg-gray-50 active:bg-gray-100 transition-colors`}>{inner}</button>
        : <div className={cls}>{inner}</div>}
    </li>
  );
}

function Switch({ checked, disabled, onChange, label }) {
  return (
    <label className={`relative inline-flex h-6 w-11 shrink-0 items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input type="checkbox" className="peer sr-only" aria-label={label} checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-emerald-500 transition-colors" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm peer-checked:translate-x-5 transition-transform pointer-events-none" />
    </label>
  );
}

// Email alerts, worded for the kind of business.
function alertRows(businessType) {
  const appt = businessType === 'appointments';
  return [
    { key: 'newReservationEmail', icon: 'inbox', label: appt ? 'Cita nueva' : 'Reserva nueva', hint: appt ? 'Email con el cliente, el servicio y la hora' : 'Email con el nombre, el día y las personas' },
    { key: 'cancelledReservationEmail', icon: 'x', label: appt ? 'Cita cancelada' : 'Reserva cancelada', hint: appt ? 'Para saber al momento que tienes un hueco' : 'Para ofrecer la mesa a otra persona' },
  ];
}

/**
 * Mi perfil: who you are, your password, which alerts you get and (owners)
 * your businesses — a grouped list like Más and Configuración.
 */
export default function Profile() {
  useSetMobileHeader({ title: 'Mi perfil', action: false });
  const { business, switchBusiness, refreshBusiness, role, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [user, setUser] = useState({ id: '', name: '', email: '' });
  const [memberships, setMemberships] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBusiness, setNewBusiness] = useState(EMPTY_BUSINESS);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [busyBusiness, setBusyBusiness] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const isStaff = role === 'staff';
  const owned = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships]);
  const activeMembership = memberships.find((m) => m.businessId === business?.id);

  const load = async () => {
    try {
      const [{ data }, ownProfessional] = await Promise.all([
        api.get('/users/me'),
        business?.businessType === 'appointments' ? bookingsApi.myResource().catch(() => null) : Promise.resolve(null),
      ]);
      setUser(data.user || { id: '', name: '', email: '' });
      setMemberships(data.memberships || []);
      setProfessional(ownProfessional);
    } catch (err) {
      setPageError(err.response?.data?.message || 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const saveName = async (e) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      const { data } = await api.put('/users/me', { name: nameDraft.trim() });
      setUser((u) => ({ ...u, ...data.user }));
      setEditingName(false);
      notify('Nombre guardado');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el nombre', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword.length < 8) return setPasswordError('Tiene que tener al menos 8 caracteres.');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordError('Las dos contraseñas no coinciden.');
    setSavingPassword(true);
    try {
      await api.put('/users/me/password', { newPassword: passwordForm.newPassword });
      setShowPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      notify('Contraseña cambiada');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleAlert = async (membershipId, patch) => {
    if (isStaff) return;
    const prev = memberships;
    setMemberships(memberships.map((m) => (m.id === membershipId ? { ...m, notificationPreferences: { ...m.notificationPreferences, ...patch } } : m)));
    try {
      await api.put(`/users/me/memberships/${membershipId}/notifications`, patch);
    } catch (err) {
      setMemberships(prev);
      notify(err.response?.data?.message || 'No se pudo guardar el aviso', 'error');
    }
  };

  const updateProfessionalPhoto = async (patch) => {
    setSavingPhoto(true);
    try {
      const updated = await bookingsApi.updateMyPhoto(patch);
      setProfessional(updated);
      notify('Foto profesional actualizada');
    } catch (err) {
      notify(err.response?.data?.message || err.message || 'No se pudo actualizar la foto', 'error');
    } finally {
      setSavingPhoto(false);
    }
  };

  const uploadProfessionalPhoto = async (file) => {
    try {
      const photo = await resizeImage(file, { max: 160, square: true });
      await updateProfessionalPhoto({ photo });
    } catch (err) {
      notify(err.message || 'No se pudo leer la imagen', 'error');
    }
  };

  const activate = async (m) => {
    setBusyBusiness(m.businessId);
    try { await switchBusiness(m.businessId); await load(); notify(`Ahora estás en ${m.businessName}`); } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cambiar de negocio', 'error');
    } finally { setBusyBusiness(null); }
  };

  const removeBusiness = async (m) => {
    if (!await confirmDialog(`¿Eliminar «${m.businessName}»? Se borran sus reservas, clientes y configuración. No se puede deshacer.`)) return;
    setBusyBusiness(m.businessId);
    try { await api.delete(`/businesses/${m.businessId}`); await refreshBusiness(); await load(); notify('Negocio eliminado'); } catch (err) {
      notify(err.response?.data?.message || 'No se pudo eliminar el negocio', 'error');
    } finally { setBusyBusiness(null); }
  };

  const createBusiness = async (e) => {
    e.preventDefault();
    setSavingBusiness(true);
    try {
      await api.post('/businesses', newBusiness);
      setCreating(false);
      setNewBusiness(EMPTY_BUSINESS);
      await refreshBusiness();
      await load();
      notify('Negocio creado');
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el negocio', 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Cargando…</p>;

  const displayName = user.name || 'Sin nombre';

  return (
    <div className="w-full space-y-7">
      <header className="flex items-center gap-4 pt-1">
        <label className={professional ? 'relative shrink-0 cursor-pointer group' : 'shrink-0'} title={professional ? 'Cambiar foto profesional' : undefined}>
          <ProfessionalAvatar name={professional?.name || displayName} photo={professional?.photo} color={professional?.color} size={64} />
          {professional && (
            <>
              <span className="absolute inset-0 rounded-full bg-black/40 text-white text-[11px] font-semibold hidden group-hover:flex items-center justify-center">
                {savingPhoto ? 'â€¦' : 'Foto'}
              </span>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" disabled={savingPhoto}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProfessionalPhoto(file); e.target.value = ''; }} />
            </>
          )}
        </label>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 truncate">{displayName}</h1>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {activeMembership && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{ROLE_LABELS[activeMembership.role] || activeMembership.role} en {activeMembership.businessName}</p>
          )}
        </div>
      </header>

      {pageError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{pageError}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-7 items-start">
      <div className="space-y-7">
      <Group title="Tus datos">
        {editingName ? (
          <li className="px-4 py-3">
            <form onSubmit={saveName} className="flex items-center gap-2">
              <input autoFocus className={`${inputCls} !py-2`} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={100} aria-label="Nombre" />
              <button type="submit" disabled={savingName || !nameDraft.trim()} className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50">
                {savingName ? '…' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="h-10 px-2 text-sm text-gray-500">Cancelar</button>
            </form>
          </li>
        ) : (
          <Row icon="person" label="Nombre" value={user.name || 'Añadir'} onClick={() => { setNameDraft(user.name || ''); setEditingName(true); }} />
        )}
        <Row icon="chat" label="Email" value={user.email} />
        <Row icon="cog" label="Contraseña" value="••••••••" onClick={() => setShowPassword(true)} />
      </Group>

      {professional && (
        <Group title="Foto profesional" hint="Dentro de Vetra la foto siempre identifica tus citas y tu agenda.">
          <Row icon="person" label="Foto" hint={professional.photo ? 'JPG, PNG o WebP' : 'Sube una foto para sustituir las iniciales'}
            onClick={() => photoInputRef.current?.click()} value={professional.photo ? 'Cambiar' : 'Subir'} />
          {professional.photo && (
            <Row icon="person" label="Mostrar a clientes" hint="Aparecerá cuando te elijan al reservar"
              control={<Switch label="Mostrar foto a clientes" checked={professional.showPhotoToClients !== false} disabled={savingPhoto}
                onChange={(value) => updateProfessionalPhoto({ showPhotoToClients: value })} />} />
          )}
          {professional.photo && (
            <Row icon="x" label="Quitar foto" danger onClick={() => updateProfessionalPhoto({ photo: null })} />
          )}
        </Group>
      )}

      {memberships.length > 0 && memberships.map((m) => (
        <Group key={m.id}
          title={memberships.length > 1 ? `Avisos · ${m.businessName}` : 'Avisos por email'}
          hint={isStaff ? 'Con tu rol no puedes cambiar estos avisos; pídeselo al responsable.' : null}>
          {alertRows(m.businessType).map((r) => (
            <Row key={r.key} icon={r.icon} label={r.label} hint={r.hint}
              control={<Switch label={r.label} checked={m.notificationPreferences?.[r.key]} disabled={isStaff} onChange={(v) => toggleAlert(m.id, { [r.key]: v })} />} />
          ))}
        </Group>
      ))}

      </div>
      <div className="space-y-7">
      <Group title="En este dispositivo">
        <PushNotificationToggle businessType={business?.businessType} />
        {!isPushSupported() && (
          <Row icon="alert" label="Avisos al momento" hint="Este navegador no admite avisos. Prueba desde Chrome o Safari, o añade Vetra a la pantalla de inicio." />
        )}
      </Group>

      {owned.length > 0 && (
        <Group title="Mis negocios">
          {owned.map((m) => {
            const active = business?.id === m.businessId;
            return (
              <Row key={m.id} icon="building" tone={active ? 'violet' : 'gray'} label={m.businessName}
                hint={active ? 'Estás en este negocio' : (m.businessType === 'appointments' ? 'Citas' : 'Restaurante')}
                control={(
                  <div className="flex items-center gap-1 shrink-0">
                    {!active && (
                      <button type="button" disabled={busyBusiness === m.businessId} onClick={() => activate(m)}
                        className="h-8 px-3 rounded-full bg-gray-100 text-[13px] font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50">Entrar</button>
                    )}
                    <button type="button" disabled={busyBusiness === m.businessId} onClick={() => removeBusiness(m)} aria-label={`Eliminar ${m.businessName}`}
                      className="w-8 h-8 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center">
                      <Icon name="x" className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                )} />
            );
          })}
          <Row icon="plus" label="Crear otro negocio" onClick={() => setCreating(true)} />
        </Group>
      )}

      <Group>
        <Row icon="logout" label="Cerrar sesión" danger onClick={() => logout()} />
      </Group>
      </div>
      </div>

      {showPassword && (
        <Modal title="Cambiar contraseña" subtitle="Tu sesión sigue abierta después del cambio."
          onClose={() => { setShowPassword(false); setPasswordForm({ newPassword: '', confirmPassword: '' }); setPasswordError(''); }}>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Nueva contraseña</label>
              <PasswordInput value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} autoComplete="new-password" />
            </div>
            <div>
              <label className={labelCls}>Repítela</label>
              <PasswordInput value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" />
            </div>
            {passwordError && <p className="text-sm text-rose-600">{passwordError}</p>}
            <button type="submit" disabled={savingPassword} className="w-full h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
              {savingPassword ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </Modal>
      )}

      {creating && (
        <Modal title="Nuevo negocio" subtitle="Serás su propietario; tu negocio actual no cambia." size="md"
          onClose={() => { setCreating(false); setNewBusiness(EMPTY_BUSINESS); }}>
          <form onSubmit={createBusiness} className="space-y-4">
            <div>
              <p className={labelCls}>Tipo de negocio</p>
              <BusinessTypePicker value={newBusiness.businessType} onChange={(businessType) => setNewBusiness((b) => ({ ...b, businessType }))} />
            </div>
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} required value={newBusiness.name} onChange={(e) => setNewBusiness((b) => ({ ...b, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Email del negocio</label>
              <input type="email" className={inputCls} required value={newBusiness.email} onChange={(e) => setNewBusiness((b) => ({ ...b, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} value={newBusiness.phone} onChange={(e) => setNewBusiness((b) => ({ ...b, phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>CIF</label>
                <input className={inputCls} value={newBusiness.cif} onChange={(e) => setNewBusiness((b) => ({ ...b, cif: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input className={inputCls} value={newBusiness.address} onChange={(e) => setNewBusiness((b) => ({ ...b, address: e.target.value }))} />
            </div>
            <button type="submit" disabled={savingBusiness} className="w-full h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
              {savingBusiness ? 'Creando…' : 'Crear negocio'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
