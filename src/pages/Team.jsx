import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { owner: 'Propietario', manager: 'Manager', staff: 'Staff' };
const ROLE_COLORS = {
  owner:   'bg-indigo-100 text-indigo-700',
  manager: 'bg-amber-100 text-amber-700',
  staff:   'bg-gray-100 text-gray-600',
};

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] || ROLE_COLORS.staff}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Avatar({ name, email }) {
  const initial = (name || email || '?')[0].toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {initial}
    </div>
  );
}

export default function Team() {
  const { role: myRole, session, hasRole } = useAuth();
  const myUserId = session?.user?.id;

  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Add member form
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({ email: '', role: 'staff' });
  const [addError, setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const isOwner = hasRole('owner');

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get('/members');
      setMembers(data);
    } catch {
      setError('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Add member ──────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      await api.post('/members', addForm);
      setAddForm({ email: '', role: 'staff' });
      setShowAdd(false);
      fetchMembers();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error al añadir el miembro');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Change role ─────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/members/${memberId}`, { role: newRole });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el rol');
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────
  const handleRemove = async (memberId, name) => {
    if (!confirm(`¿Eliminar a ${name || 'este miembro'} del negocio?`)) return;
    try {
      await api.delete(`/members/${memberId}`);
      setMembers(prev => prev.filter(m => m._id !== memberId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el miembro');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-xl bg-indigo-600 animate-pulse" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Equipo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        {hasRole('manager') && (
          <button
            onClick={() => { setShowAdd(v => !v); setAddError(''); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Añadir miembro
          </button>
        )}
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Añadir miembro</h3>
          {addError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              {addError}
            </div>
          )}
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email del usuario</label>
              <input
                type="email" required
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@email.com"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">El usuario debe tener cuenta en MiMesa.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="staff">Staff — acceso básico</option>
                <option value="manager">Manager — gestión operativa</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit" disabled={addLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {addLoading ? 'Añadiendo...' : 'Añadir'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddError(''); }}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Members list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {members.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No hay miembros todavía</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((member) => {
              const isMe     = member.userId === myUserId;
              const isOwnerRow = member.role === 'owner';

              return (
                <li key={member._id} className="flex items-center gap-3 px-5 py-4">
                  <Avatar name={member.userName} email={member.userEmail} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.userName || '—'}
                        {isMe && <span className="text-xs text-gray-400 font-normal ml-1">(tú)</span>}
                      </p>
                      <RoleBadge role={member.role} />
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{member.userEmail}</p>
                  </div>

                  {/* Actions — owner only, can't act on self or other owners */}
                  {isOwner && !isMe && !isOwnerRow && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                      </select>
                      <button
                        onClick={() => handleRemove(member._id, member.userName)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Eliminar miembro"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Role legend */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Descripción de roles</p>
        <div className="space-y-2">
          {[
            { role: 'owner',   desc: 'Control total del negocio, usuarios y facturación' },
            { role: 'manager', desc: 'Gestión operativa: reservas, turnos, clientes, mesas' },
            { role: 'staff',   desc: 'Solo lectura y operaciones básicas' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-3">
              <RoleBadge role={role} />
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
