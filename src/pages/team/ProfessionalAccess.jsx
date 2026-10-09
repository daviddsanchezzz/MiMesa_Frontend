import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import Modal from '../../components/Modal';
import { btnPrimary, btnSecondary, inputCls } from '../agenda/utils';
import { confirmDialog } from '../../ui/confirm';

export const ROLES = {
  staff: 'Personal',
  manager: 'Encargado',
  owner: 'Propietario',
};
const HELP = {
  staff: 'Ve su agenda y gestiona y cobra sus citas.',
  manager:
    'Gestiona la agenda del equipo, clientes, caja y las funciones habilitadas para encargados.',
  owner: 'Control total del negocio, usuarios y facturación.',
};

export function InviteFields({ value, onChange }) {
  const { hasRole } = useAuth();
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Email
        <input
          required
          type="email"
          className={inputCls}
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Rol
        <select
          className={inputCls}
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
        >
          {Object.entries(ROLES)
            .filter(([key]) => key !== 'owner' || hasRole('owner'))
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
      </label>
      <p className="text-sm text-gray-500">{HELP[value.role]}</p>
    </div>
  );
}

export function InviteModal({ resource, onClose, onSaved }) {
  const [name, setName] = useState(resource?.name || '');
  const [value, setValue] = useState({ email: '', role: 'staff' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/invitations', {
        name: name.trim(),
        ...value,
        links: resource ? { resourceId: resource._id } : {},
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        resource
          ? `Invitar a ${resource.name}`
          : 'Invitar usuario sin profesional'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {!resource && (
          <label className="block text-sm">
            Nombre
            <input
              required
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <InviteFields value={value} onChange={setValue} />
        <p className="text-xs text-gray-500">
          Recibirá un enlace para activar su acceso. Caduca en 7 días.
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <button className={btnPrimary} disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </form>
    </Modal>
  );
}

export function MemberAccess({ member, onSaved }) {
  const { hasRole, session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable =
    hasRole('owner') &&
    member.role !== 'owner' &&
    member.userId !== session?.user?.id;
  async function change(role) {
    if (
      !role &&
      !await confirmDialog(
        '¿Revocar este acceso a Vetra? El profesional, sus citas y su historial se conservan.',
      )
    )
      return;
    if (
      role === 'owner' &&
      !await confirmDialog('¿Dar control total del negocio a este usuario?')
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (role) await api.put(`/members/${member._id}`, { role });
      else await api.delete(`/members/${member._id}`);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <p className="font-medium break-words">{member.userName}</p>
      <p className="text-sm text-gray-500 break-all">{member.userEmail}</p>
      {editable ? (
        <label className="block text-sm">
          Rol
          <select
            className={inputCls}
            disabled={busy}
            value={member.role}
            onChange={(e) => change(e.target.value)}
          >
            {Object.entries(ROLES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p>{ROLES[member.role]}</p>
      )}
      <p className="text-sm text-gray-500">{HELP[member.role]}</p>
      {editable && (
        <button
          disabled={busy}
          className="min-h-11 text-sm font-medium text-rose-700"
          onClick={() => change(null)}
        >
          Revocar acceso
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function PendingAccess({ invitation, onSaved }) {
  const { hasRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    if (!await confirmDialog('¿Cancelar esta invitación?')) return;
    setBusy(true);
    try {
      await api.delete(`/invitations/${invitation._id}`);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-amber-700 font-medium">Invitación pendiente</p>
      <p className="text-sm break-all">
        {invitation.email} · {ROLES[invitation.role]}
      </p>
      {hasRole('owner') && (
        <button
          className="min-h-11 text-sm text-rose-700"
          disabled={busy}
          onClick={cancel}
        >
          Cancelar invitación
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProfessionalAccess({
  resource,
  members,
  invitations,
  resources,
  onSaved,
}) {
  const [inviting, setInviting] = useState(false);
  const [linkId, setLinkId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const member = members.find((m) => m.userId === resource.userId);
  const pending = invitations.find(
    (i) => String(i.links?.resourceId) === String(resource._id),
  );
  const available = members.filter(
    (m) =>
      m.status !== 'invited' && !resources.some((r) => r.userId === m.userId),
  );
  async function unlink() {
    if (
      !await confirmDialog(
        '¿Desvincular esta cuenta del profesional? Conserva su acceso al negocio, pero deja de tener esta agenda propia.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await bookingsApi.updateResource(resource._id, { userId: null });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    setBusy(true);
    setError('');
    try {
      await bookingsApi.updateResource(resource._id, { userId: linkId });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Acceso a Vetra</h2>
      {member ? (
        <>
          <p className="text-sm text-emerald-700">
            {resource.name} tiene acceso
          </p>
          <MemberAccess member={member} onSaved={onSaved} />
        </>
      ) : pending ? (
        <PendingAccess invitation={pending} onSaved={onSaved} />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {resource.name} no tiene acceso a Vetra. Puede recibir citas
            igualmente.
          </p>
          <button className={btnPrimary} onClick={() => setInviting(true)}>
            Invitar a Vetra
          </button>
          {!!available.length && (
            <div className="space-y-2 pt-4">
              <label className="block text-sm">
                O vincular a un usuario del negocio
                <select
                  className={inputCls}
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                >
                  <option value="">Elegir usuario</option>
                  {available.map((m) => (
                    <option key={m._id} value={m.userId}>
                      {m.userName || m.userEmail}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={btnSecondary}
                disabled={!linkId || busy}
                onClick={link}
              >
                Vincular usuario
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {resource.userId && (
        <button
          disabled={busy}
          className="min-h-11 text-sm text-gray-500"
          onClick={unlink}
        >
          Desvincular cuenta del profesional
        </button>
      )}
      {inviting && (
        <InviteModal
          resource={resource}
          onClose={() => setInviting(false)}
          onSaved={() => {
            setInviting(false);
            onSaved();
          }}
        />
      )}
    </section>
  );
}
