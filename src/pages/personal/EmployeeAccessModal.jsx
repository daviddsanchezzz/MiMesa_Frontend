import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { confirmDialog } from '../../ui/confirm';

const ROLE_LABELS = { owner: 'Propietario', manager: 'Encargado', staff: 'Personal' };
const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
const btnPrimary = 'inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60';
const btnQuiet = 'inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60';

const errorOf = (err) => err?.response?.data?.message || 'Algo ha fallado. Inténtalo de nuevo.';

/**
 * Acceso a Vetra of an employee of Personal: invite them by email, link a user already in the team,
 * or undo it. Once linked, they see their own shifts in «Mi horario».
 */
export default function EmployeeAccessModal({ employee, onClose, onChanged }) {
  const { hasRole } = useAuth();
  const fullName = `${employee.firstName} ${employee.lastName || ''}`.trim();
  const member = employee.member || null;
  const pending = employee.pendingInvitation || null;
  const [mode, setMode] = useState('invite');
  const [email, setEmail] = useState(employee.email || '');
  const [role, setRole] = useState('staff');
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    if (member || pending) return;
    api.get('/members').then((r) => setMembers((r.data || []).filter((m) => !m.professionalId && m.status !== 'invited'))).catch(() => {});
  }, [member, pending]);

  async function run(fn, message) {
    setBusy(true); setError('');
    try {
      await fn();
      setDone(message);
      onChanged();
    } catch (err) {
      setError(errorOf(err));
    } finally {
      setBusy(false);
    }
  }

  const invite = () => run(
    () => api.post('/invitations', { name: fullName, email: email.trim(), role, professionalId: employee._id }),
    `Invitación enviada a ${email.trim()}. Al aceptarla, verá aquí su horario.`,
  );
  const link = () => run(() => api.put(`/staff/employees/${employee._id}/link`, { memberId }), 'Usuario vinculado.');
  const unlink = async () => {
    if (!await confirmDialog(`¿Desvincular a ${fullName}? Seguirá en el equipo, pero dejará de ver su horario como empleado.`)) return;
    run(() => api.delete(`/staff/employees/${employee._id}/link`), 'Usuario desvinculado.');
  };
  const revoke = async () => {
    if (!await confirmDialog(`¿Quitar el acceso a Vetra de ${fullName}? Su ficha, turnos y pagos se conservan.`)) return;
    run(() => api.delete(`/staff/employees/${employee._id}/access`), 'Acceso retirado.');
  };
  const cancelInvitation = () => run(() => api.delete(`/invitations/${pending._id}`), 'Invitación cancelada.');

  return (
    <Modal title="Acceso a Vetra" subtitle={fullName} onClose={onClose} size="md">
      <div className="space-y-4">
        {done && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {member && !done && (
          <>
            <div className="rounded-2xl border border-gray-200 px-4 py-3">
              <p className="text-[15px] font-semibold text-gray-900">Tiene acceso</p>
              <p className="mt-0.5 text-sm text-gray-600">{member.userName || member.userEmail}{member.userName && member.userEmail ? ` · ${member.userEmail}` : ''}</p>
              <p className="mt-0.5 text-xs text-gray-500">Rol: {ROLE_LABELS[member.role] || member.role}. Ve su horario en «Mi horario».</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnQuiet} disabled={busy} onClick={unlink}>Desvincular usuario</button>
              {hasRole('owner') && member.role !== 'owner' && <button type="button" className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50" disabled={busy} onClick={revoke}>Quitar acceso a Vetra</button>}
            </div>
          </>
        )}

        {!member && pending && !done && (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[15px] font-semibold text-gray-900">Invitación pendiente</p>
              <p className="mt-0.5 text-sm text-gray-600">{pending.email} · {ROLE_LABELS[pending.role] || pending.role}</p>
              <p className="mt-0.5 text-xs text-gray-500">Caduca en unos días. Al aceptarla quedará enlazado a este empleado.</p>
            </div>
            <button type="button" className={btnQuiet} disabled={busy} onClick={cancelInvitation}>Cancelar invitación</button>
          </>
        )}

        {!member && !pending && !done && (
          <>
            <p className="text-sm text-gray-600">Si {employee.firstName} tiene acceso a Vetra, verá aquí los turnos que le asignes en el planificador.</p>
            <div className="inline-flex p-0.5 rounded-full bg-gray-100">
              {[['invite', 'Invitar por email'], ['link', 'Vincular un usuario']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setMode(key)}
                  className={`px-3.5 py-1.5 text-[13px] rounded-full font-semibold ${mode === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
              ))}
            </div>

            {mode === 'invite' ? (
              <div className="space-y-3">
                <label className="block text-sm">Email
                  <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </label>
                <label className="block text-sm">Rol
                  <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="staff">Personal: ve sus turnos y las reservas</option>
                    <option value="manager">Encargado: además gestiona el local</option>
                  </select>
                </label>
                <button type="button" className={btnPrimary} disabled={busy || !email.trim()} onClick={invite}>{busy ? 'Enviando…' : 'Enviar invitación'}</button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay usuarios del equipo sin vincular. Invítalo por email y quedará enlazado al aceptar.</p>
                ) : (
                  <>
                    <label className="block text-sm">Usuario del equipo
                      <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                        <option value="">Elige un usuario…</option>
                        {members.map((m) => <option key={m._id} value={m._id}>{m.userName || m.userEmail} · {ROLE_LABELS[m.role] || m.role}</option>)}
                      </select>
                    </label>
                    <button type="button" className={btnPrimary} disabled={busy || !memberId} onClick={link}>{busy ? 'Vinculando…' : 'Vincular'}</button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
