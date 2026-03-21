import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ── Constants ─────────────────────────────────────────────────────────── */
const ROLE_LABELS = { owner: 'Propietario', manager: 'Manager', staff: 'Staff' };

const ROLE_STYLE = {
  owner:   { pill: 'bg-violet-50 text-violet-700 ring-violet-200',   dot: 'bg-violet-500' },
  manager: { pill: 'bg-amber-50  text-amber-700  ring-amber-200',    dot: 'bg-amber-500'  },
  staff:   { pill: 'bg-gray-100  text-gray-600   ring-gray-200',     dot: 'bg-gray-400'   },
};

const AVATAR_PALETTE = [
  'from-violet-500 to-violet-700',
  'from-violet-500 to-purple-700',
  'from-rose-500   to-pink-700',
  'from-amber-500  to-orange-600',
  'from-emerald-500 to-teal-700',
  'from-cyan-500   to-blue-600',
];

function avatarGradient(str = '') {
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/* ── Sub-components ────────────────────────────────────────────────────── */
function Avatar({ name, email, size = 'md' }) {
  const initial = (name || email || '?')[0].toUpperCase();
  const grad    = avatarGradient(name || email);
  const sz      = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold shrink-0 shadow-sm`}>
      {initial}
    </div>
  );
}

function RolePill({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.staff;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function ErrorBanner({ msg }) {
  return msg ? (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-9.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" clipRule="evenodd"/>
      </svg>
      {msg}
    </div>
  ) : null;
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function Team() {
  const { role: myRole, session, hasRole } = useAuth();
  const myUserId = session?.user?.id;

  const [members,     setMembers]     = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageError,   setPageError]   = useState('');

  // Invite modal
  const [showModal,   setShowModal]   = useState(false);
  const [invForm,     setInvForm]     = useState({ name: '', email: '', role: 'staff' });
  const [invError,    setInvError]    = useState('');
  const [invLoading,  setInvLoading]  = useState(false);
  const [invSent,     setInvSent]     = useState(false);

  const isOwner   = hasRole('owner');
  const isManager = hasRole('manager');

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        api.get('/members'),
        isManager ? api.get('/invitations') : Promise.resolve({ data: [] }),
      ]);
      setMembers(mRes.data);
      setInvitations(iRes.data);
    } catch {
      setPageError('No se pudo cargar el equipo');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Send invitation ─────────────────────────────────────────────────── */
  const handleInvite = async (e) => {
    e.preventDefault();
    setInvError('');
    setInvLoading(true);
    try {
      await api.post('/invitations', invForm);
      setInvSent(true);
      fetchAll();
    } catch (err) {
      setInvError(err.response?.data?.message || 'Error al enviar la invitación');
    } finally {
      setInvLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setInvSent(false);
    setInvForm({ name: '', email: '', role: 'staff' });
    setInvError('');
  };

  /* ── Role change ─────────────────────────────────────────────────────── */
  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/members/${memberId}`, { role: newRole });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el rol');
    }
  };

  /* ── Remove member ───────────────────────────────────────────────────── */
  const handleRemove = async (memberId, name) => {
    if (!confirm(`¿Eliminar a ${name || 'este miembro'} del equipo?`)) return;
    try {
      await api.delete(`/members/${memberId}`);
      setMembers(prev => prev.filter(m => m._id !== memberId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  /* ── Cancel invitation ───────────────────────────────────────────────── */
  const handleCancelInvite = async (id) => {
    try {
      await api.delete(`/invitations/${id}`);
      setInvitations(prev => prev.filter(i => i._id !== id));
    } catch {
      alert('Error al cancelar la invitación');
    }
  };

  /* ── Loading / error ─────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 rounded-xl bg-violet-600 animate-pulse" />
    </div>
  );

  return (
    <>
      <div className="space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipo</h1>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} {members.length === 1 ? 'persona' : 'personas'} en tu negocio</p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-violet-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.573 5.384-1.573.398-.254.628-.707.57-1.175a7 7 0 0 0-13.908 0ZM15.75 7.5a.75.75 0 0 0-1.5 0v2.25H12a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H18a.75.75 0 0 0 0-1.5h-2.25V7.5Z"/>
              </svg>
              Invitar persona
            </button>
          )}
        </div>

        <ErrorBanner msg={pageError} />

        {/* ── Members list ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Miembros activos</p>
          </div>

          {members.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-400">
                  <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400">Aún no hay miembros en este negocio</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {members.map((member) => {
                const isMe      = member.userId === myUserId;
                const isOwnerRow = member.role === 'owner';
                const canEdit   = isOwner && !isMe && !isOwnerRow;

                return (
                  <li key={member._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <Avatar name={member.userName} email={member.userEmail} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {member.userName || '—'}
                        </p>
                        {isMe && (
                          <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">tú</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{member.userEmail || '—'}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer hover:border-gray-300 transition-colors"
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                      ) : (
                        <RolePill role={member.role} />
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleRemove(member._id, member.userName)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Eliminar miembro"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Pending invitations ──────────────────────────────────────── */}
        {isManager && invitations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Invitaciones pendientes</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {invitations.map((inv) => (
                <li key={inv._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                      <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/>
                      <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.name}</p>
                    <p className="text-xs text-gray-400 truncate">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RolePill role={inv.role} />
                    <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
                    {isOwner && (
                      <button
                        onClick={() => handleCancelInvite(inv._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Cancelar invitación"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Role legend ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: 'owner',   desc: 'Control total, usuarios y facturación' },
            { role: 'manager', desc: 'Reservas, turnos, clientes y mesas' },
            { role: 'staff',   desc: 'Solo lectura y operaciones básicas' },
          ].map(({ role, desc }) => (
            <div key={role} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <RolePill role={role} />
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invite modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-[fadeIn_150ms_ease]">
            {invSent ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-green-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Invitación enviada</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Le hemos enviado un email a <strong>{invForm.email}</strong> con el enlace para activar su cuenta.
                </p>
                <button onClick={closeModal} className="mt-4 text-sm text-violet-600 font-medium hover:underline">
                  Cerrar
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Invitar al equipo</h3>
                  <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
                    </svg>
                  </button>
                </div>

                <ErrorBanner msg={invError} />

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                    <input
                      required
                      value={invForm.name}
                      onChange={e => setInvForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="María García"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email" required
                      value={invForm.email}
                      onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="maria@email.com"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'staff',   label: 'Staff',   sub: 'Acceso básico' },
                        { value: 'manager', label: 'Manager', sub: 'Gestión operativa' },
                      ].map(opt => (
                        <label
                          key={opt.value}
                          className={`flex flex-col gap-0.5 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                            invForm.role === opt.value
                              ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-300'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio" name="role" value={opt.value}
                            checked={invForm.role === opt.value}
                            onChange={e => setInvForm(f => ({ ...f, role: e.target.value }))}
                            className="sr-only"
                          />
                          <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                          <span className="text-xs text-gray-400">{opt.sub}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    Recibirá un email con un enlace para crear su cuenta y unirse al negocio. El enlace caduca en 7 días.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit" disabled={invLoading}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      {invLoading ? 'Enviando...' : 'Enviar invitación'}
                    </button>
                    <button
                      type="button" onClick={closeModal}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
