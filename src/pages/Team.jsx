import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { bookingsApi } from '../services/bookingsApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { PrimaryButton, Section, MenuButton, MoreMenu, Empty, Segmented } from '../ui/kit';
import Page from '../ui/Page';
import { ErrorBanner } from '../ui/feedback';
import ProfessionalAvatar from '../components/ProfessionalAvatar';
import { confirmDialog } from '../ui/confirm';
import { inputCls } from '../ui/form';
import { Chip, DataTable } from '../ui/list';

/* Constants */
const ROLE_LABELS = { owner: 'Propietario', manager: 'Encargado', staff: 'Personal' };
const ROLE_DOT = { owner: 'bg-violet-500', manager: 'bg-amber-500', staff: 'bg-gray-400' };

const AVATAR_TINTS = [
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-gray-100 text-gray-700',
];

function avatarTint(str = '') {
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

/* Sub-components */
function Avatar({ name, email, professional }) {
  if (professional) {
    return <ProfessionalAvatar name={professional.name || name} photo={professional.photo} color={professional.color} size={40} decorative />;
  }
  const initial = (name || email || '?')[0].toUpperCase();
  return (
    <span className={`w-10 h-10 rounded-full ${avatarTint(name || email)} flex items-center justify-center text-sm font-semibold shrink-0`}>
      {initial}
    </span>
  );
}

function RoleText({ role }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-700">
      <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[role] || ROLE_DOT.staff}`} />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

/* Main page */
export default function Team() {
  const { role: myRole, session, hasRole, isAppointments } = useAuth();
  const myUserId = session?.user?.id;

  const [members,     setMembers]     = useState([]);
  const [invitations, setInvitations] = useState([]);
  // Appointment businesses: professionals in the agenda, to link a new member to
  const [pros,        setPros]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageError,   setPageError]   = useState('');

  // Invite modal
  const [showModal,   setShowModal]   = useState(false);
  const [invForm,     setInvForm]     = useState({ name: '', email: '', role: 'staff', resourceId: '' });
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
      if (isAppointments) {
        const res = await bookingsApi.resources().catch(() => []);
        setPros((res || []).filter((r) => r.kind === 'staff'));
      }
    } catch {
      setPageError('No se pudo cargar el equipo');
    } finally {
      setLoading(false);
    }
  }, [isManager, isAppointments]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const proOfUser = (userId) => pros.find((r) => r.userId && r.userId === userId) || null;
  const proById = (id) => pros.find((r) => String(r._id) === String(id)) || null;
  // Why a professional can't be picked for a new invitation (already someone's, or already invited)
  const proBusy = (r) => {
    if (r.userId) {
      const m = members.find((x) => x.userId === r.userId);
      return `ya es ${m?.userName || 'otra cuenta'}`;
    }
    const inv = invitations.find((i) => i.links?.resourceId === String(r._id) && i.email !== invForm.email.trim().toLowerCase());
    return inv ? `invitación pendiente a ${inv.name}` : '';
  };

  /* Send invitation */
  const handleInvite = async (e) => {
    e.preventDefault();
    setInvError('');
    setInvLoading(true);
    try {
      const { resourceId, ...rest } = invForm;
      await api.post('/invitations', { ...rest, links: resourceId ? { resourceId } : {} });
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
    setInvForm({ name: '', email: '', role: 'staff', resourceId: '' });
    setInvError('');
  };

  /* Role change */
  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/members/${memberId}`, { role: newRole });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el rol');
    }
  };

  /* Remove member */
  const handleRemove = async (memberId, name) => {
    if (!await confirmDialog(`¿Eliminar a ${name || 'este miembro'} del equipo?`)) return;
    try {
      await api.delete(`/members/${memberId}`);
      setMembers(prev => prev.filter(m => m._id !== memberId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  /* Cancel invitation */
  const handleCancelInvite = async (id) => {
    try {
      await api.delete(`/invitations/${id}`);
      setInvitations(prev => prev.filter(i => i._id !== id));
    } catch {
      alert('Error al cancelar la invitación');
    }
  };

  /* Loading / error */
  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 rounded-xl bg-violet-600 animate-pulse" />
    </div>
  );

  const showAgenda = isAppointments && pros.length > 0;
  const roleOptions = [
    { value: 'staff',   label: 'Personal',  sub: isAppointments ? 'Ve su agenda y cobra sus citas.' : 'Acceso básico: consulta y operaciones del día.' },
    { value: 'manager', label: 'Encargado', sub: isAppointments ? 'Agenda de todo el equipo, clientes, caja y cierres.' : 'Reservas, turnos, clientes y mesas.' },
    ...(isOwner ? [{ value: 'owner', label: 'Propietario', sub: 'Control total del negocio, usuarios y facturación.' }] : []),
  ];
  const roleHelp = [
    { role: 'owner',   desc: 'Control total, usuarios y facturación' },
    { role: 'manager', desc: isAppointments ? 'Agenda de todo el equipo, clientes, caja y cierres' : 'Reservas, turnos, clientes y mesas' },
    { role: 'staff',   desc: isAppointments ? 'Ve su agenda (si está vinculado a un profesional) y cobra sus citas' : 'Solo lectura y operaciones básicas' },
  ];

  const memberRow = (member) => {
    const isMe = member.userId === myUserId;
    const canEdit = isOwner && !isMe && member.role !== 'owner';
    const pro = showAgenda ? proOfUser(member.userId) : null;
    const person = (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={member.userName} email={member.userEmail} professional={pro} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2"><span className="truncate text-[15px] font-medium text-gray-900">{member.userName || '-'}</span>{isMe && <Chip>tú</Chip>}</span>
          <span className="block truncate text-[13px] text-gray-500">{member.userEmail || '-'}</span>
        </span>
      </span>
    );
    const role = canEdit ? (
      <>
        <MenuButton ariaLabel="Cambiar rol" className="h-8 pl-2.5 pr-2"
          items={['staff', 'manager', 'owner'].map((r) => ({ label: ROLE_LABELS[r], active: member.role === r, onClick: () => { if (r !== member.role) handleRoleChange(member._id, r); } }))}>
          <RoleText role={member.role} />
          <Icon name="down" className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
        </MenuButton>
        <MoreMenu items={[{ label: 'Quitar del equipo', danger: true, onClick: () => handleRemove(member._id, member.userName) }]} />
      </>
    ) : <span className="pr-10"><RoleText role={member.role} /></span>;
    return {
      person, role,
      mobile: {
        leading: <Avatar name={member.userName} email={member.userEmail} professional={pro} />,
        title: <span className="flex items-center gap-2">{member.userName || '-'}{isMe && <Chip>tú</Chip>}</span>,
        subtitle: member.userEmail || '-',
        status: showAgenda ? <span className="text-[13px] text-gray-400">{pro ? `Agenda de ${pro.name}` : 'Sin agenda propia'}</span> : undefined,
        trailing: <span className="flex shrink-0 items-center gap-1">{role}</span>,
      },
    };
  };

  return (
    <>
      <Page title="Accesos" subtitle={`${members.length} ${members.length === 1 ? 'persona' : 'personas'} en tu negocio`}
        primary={isManager ? { label: 'Invitar persona', short: 'Invitar', onClick: () => setShowModal(true) } : undefined} mobileAction={false}>

        <ErrorBanner>{pageError}</ErrorBanner>

        {/* Members */}
        <Section title="Miembros">
          {members.length === 0 ? (
            <Empty>Aún no hay miembros en este negocio</Empty>
          ) : (
            <>
              <DataTable rows={members} rowKey={(m) => m._id} mobile={(member) => memberRow(member).mobile}
                columns={[
                  { label: 'Persona', span: showAgenda ? 6 : 9, render: (member) => memberRow(member).person },
                  ...(showAgenda ? [{ label: 'Agenda', span: 3, render: (member) => { const pro = proOfUser(member.userId); return <span className={`truncate text-[13px] ${pro ? 'text-gray-700' : 'text-gray-400'}`}>{pro ? `Agenda de ${pro.name}` : 'Sin agenda propia'}</span>; } }] : []),
                  { label: 'Rol', span: 3, align: 'right', render: (member) => <div className="flex items-center justify-end gap-1">{memberRow(member).role}</div> },
                ]} />
            </>
          )}
        </Section>

        {/* Pending invitations */}
        {isManager && invitations.length > 0 && (
          <Section title="Invitaciones pendientes">
            <ul className="divide-y divide-gray-100">
              {invitations.map((inv) => {
                const pro = inv.links?.resourceId ? proById(inv.links.resourceId) : null;
                return (
                  <li key={inv._id} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-50">
                    <span className="w-10 h-10 rounded-full border-[1.5px] border-dashed border-gray-300 text-gray-400 flex items-center justify-center shrink-0">
                      <Icon name="inbox" className="w-[18px] h-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-gray-900 truncate">{inv.name}</p>
                      <p className="text-[13px] text-gray-500 truncate">
                        {inv.email} · {ROLE_LABELS[inv.role] || inv.role}
                        {pro && <> · será {pro.name} en la agenda</>}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 shrink-0">
                      <span className="w-2 h-2 rounded-full border-[1.5px] border-dashed border-amber-500" />
                      Pendiente
                    </span>
                    {isOwner && (
                      <button type="button" onClick={() => handleCancelInvite(inv._id)}
                        className="shrink-0 ml-2 text-[13px] font-semibold text-rose-600 hover:text-rose-800">
                        Cancelar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {/* Role help */}
        <Section title="Qué puede hacer cada rol">
          <dl className="space-y-1.5 px-2 pt-1">
            {roleHelp.map(({ role, desc }) => (
              <div key={role} className="flex flex-col sm:flex-row sm:items-baseline gap-x-4">
                <dt className="sm:w-32 shrink-0"><RoleText role={role} /></dt>
                <dd className="text-[13px] text-gray-500 pl-3.5 sm:pl-0">{desc}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </Page>

      {/* Invite modal */}
      {showModal && (
        invSent ? (
          <Modal title="Invitación enviada" onClose={closeModal}
            footer={<div className="flex justify-end"><PrimaryButton icon={null} onClick={closeModal}>Hecho</PrimaryButton></div>}>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Icon name="check" className="w-[18px] h-[18px]" strokeWidth={2} />
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Le hemos enviado un email a <span className="font-semibold text-gray-900">{invForm.email}</span> con el enlace para activar su cuenta.
              </p>
            </div>
          </Modal>
        ) : (
          <Modal title="Invitar al equipo" subtitle="Recibirá un email para crear su cuenta" size="md" onClose={closeModal}
            footer={(
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={closeModal}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                  Cancelar
                </button>
                <button type="submit" form="invite-form" disabled={invLoading}
                  className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
                  {invLoading ? 'Enviando…' : 'Enviar invitación'}
                </button>
              </div>
            )}>
            <ErrorBanner msg={invError} className="mb-4" />

            <form id="invite-form" onSubmit={handleInvite} className="space-y-5">
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-[13px] font-medium text-gray-700 mb-1.5">Nombre</span>
                  <input required value={invForm.name}
                    onChange={e => setInvForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="María García" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[13px] font-medium text-gray-700 mb-1.5">Email</span>
                  <input type="email" required value={invForm.email}
                    onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="maria@email.com" className={inputCls} />
                </label>
              </div>

              <div>
                <p className="text-[13px] font-medium text-gray-700 mb-1.5">Rol</p>
                <Segmented value={invForm.role} options={roleOptions.map((o) => [o.value, o.label])}
                  onChange={(v) => setInvForm(f => ({ ...f, role: v }))} />
                <p className="text-[13px] text-gray-500 mt-2">{roleOptions.find((o) => o.value === invForm.role)?.sub}</p>
              </div>

              {isAppointments && pros.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-gray-700">¿Es uno de tus profesionales?</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {invForm.resourceId
                      ? `Al entrar verá la agenda de ${proById(invForm.resourceId)?.name || 'ese profesional'} y podrá bloquear su tiempo.`
                      : 'Si ya lo has creado en la agenda, elígelo para que al entrar vea sus citas.'}
                  </p>
                  <ul className="mt-2 divide-y divide-gray-100 border-y border-gray-100" role="radiogroup">
                    {[{ _id: '', name: 'No, no atiende citas' }, ...pros].map((r) => {
                      const busy = r._id ? proBusy(r) : '';
                      const selected = String(invForm.resourceId) === String(r._id);
                      return (
                        <li key={r._id || 'none'}>
                          <button type="button" role="radio" aria-checked={selected} disabled={!!busy}
                            onClick={() => {
                              const id = r._id ? String(r._id) : '';
                              const pro = proById(id);
                              setInvForm((f) => ({ ...f, resourceId: id, name: f.name.trim() ? f.name : (pro?.name || '') }));
                            }}
                            className="w-full flex items-center gap-3 py-2.5 text-left disabled:cursor-not-allowed">
                            <span className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${selected ? 'border-[5px] border-violet-600' : 'border-[1.5px] border-gray-300'}`} />
                            <span className={`text-sm ${busy ? 'text-gray-400' : 'text-gray-900'}`}>{r.name}</span>
                            {busy && <span className="text-xs text-gray-400 truncate">{busy}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-400 leading-relaxed">
                El enlace para unirse al negocio caduca en 7 días.
              </p>
            </form>
          </Modal>
        )
      )}
    </>
  );
}
