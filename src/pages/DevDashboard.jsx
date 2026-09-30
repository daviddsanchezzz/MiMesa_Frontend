import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import NewClientModal, { InviteLink } from './dev/NewClientModal';

/*
 * Vetra panel: every client business in one list (owner, team, activity,
 * plan) with a detail sheet for everything you can do with it. Accounts that
 * belong to no business are listed at the end.
 */

const PLAN = {
  free: ['Free', 'bg-gray-100 text-gray-600'],
  basic: ['Basic', 'bg-violet-50 text-violet-700'],
  pro: ['Pro', 'bg-emerald-50 text-emerald-700'],
};
const ROLE = { owner: 'Propietario', manager: 'Encargado', staff: 'Personal' };
const TYPE = { appointments: 'Citas', restaurant: 'Restaurante' };

const FILTERS = [
  ['all', 'Todos'],
  ['pending', 'Por activar'],
  ['active', 'Activos'],
  ['appointments', 'Citas'],
  ['restaurant', 'Restaurantes'],
  ['paid', 'De pago'],
  ['idle', 'Sin actividad'],
];

function ago(date) {
  if (!date) return 'nunca';
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 2) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortDate(date) {
  return date ? new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
}

function Pill({ className, children }) {
  return <span className={`inline-flex items-center shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}>{children}</span>;
}

function Stat({ label, value, sub, tone = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold leading-tight mt-0.5 tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Initial({ name, type }) {
  const bg = type === 'appointments' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-800';
  return (
    <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${bg}`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Dot({ className }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${className}`} />;
}

function OwnerLine({ owner }) {
  if (owner.status === 'active') {
    return <p className="text-xs text-gray-600 truncate"><Dot className="bg-emerald-500" />{owner.name || owner.email}</p>;
  }
  if (owner.status === 'invited') {
    return <p className="text-xs text-amber-800 truncate"><Dot className="bg-amber-500" />Por activar · {owner.name || owner.email}</p>;
  }
  return <p className="text-xs text-gray-400 truncate"><Dot className="bg-gray-300" />Sin dueño</p>;
}

function BusinessRow({ b, onOpen }) {
  const [planLabel, planCls] = PLAN[b.plan] || PLAN.free;
  return (
    <li>
      <button type="button" onClick={() => onOpen(b)}
        className="w-full text-left bg-white rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 hover:border-gray-300 active:bg-gray-50">
        <Initial name={b.name} type={b.businessType} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Pill className={planCls}>{planLabel}</Pill>
            <span className="truncate">{TYPE[b.businessType] || 'Restaurante'} · {b.team.length} {b.team.length === 1 ? 'persona' : 'personas'}</span>
          </p>
          <OwnerLine owner={b.owner} />
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900 tabular-nums">{b.activity.last30d}</p>
          <p className="text-[11px] text-gray-500">{b.activity.unit} 30 d</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{b.lastSeenAt ? ago(b.lastSeenAt) : 'sin entrar'}</p>
        </div>
      </button>
    </li>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h4>
      {children}
    </section>
  );
}

/** Start a session as that user (support). */
async function impersonate(userId, startImpersonation) {
  let token = '';
  let user = { id: userId };
  try {
    const { data } = await api.post(`/dev/users/${userId}/impersonate`);
    token = data?.token || '';
    user = data?.user || user;
  } catch (err) {
    // Older backends lack /api/dev/users/:id/impersonate: use Better Auth's.
    if (err?.response?.status !== 404) throw err;
    const response = await api.post('/betterauth/admin/impersonate-user', { userId });
    token = response?.headers?.['set-auth-token'] || '';
    user = response?.data?.user || user;
  }
  if (!token) throw new Error('No se recibió token de suplantación');
  await startImpersonation({ token, user });
}

function PersonRow({ p, onImpersonate, onDelete, busy }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
        {(p.name || p.email || '?').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {p.name || p.email}
          {p.role && <span className="ml-1.5 text-[11px] font-semibold text-gray-500">{ROLE[p.role] || p.role}</span>}
          {p.isDev && <Pill className="ml-1.5 bg-violet-100 text-violet-700">Vetra</Pill>}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {p.email}{p.emailVerified === false ? ' · sin verificar' : ''}
        </p>
        <p className="text-[11px] text-gray-400">{p.lastSeenAt ? `Entró ${ago(p.lastSeenAt)}` : 'Nunca ha entrado'}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {onImpersonate && (
          <button type="button" disabled={busy} onClick={onImpersonate} title="Entrar como esta persona"
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Entrar</button>
        )}
        {onDelete && (
          <button type="button" disabled={busy} onClick={onDelete} title="Eliminar usuario" aria-label="Eliminar usuario"
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.44c-.8.08-1.58.18-2.36.3a.75.75 0 1 0 .22 1.49l.15-.03.85 10.6A2.75 2.75 0 0 0 7.6 19h4.8a2.75 2.75 0 0 0 2.74-2.46l.85-10.6.15.03a.75.75 0 1 0 .22-1.49c-.78-.12-1.57-.22-2.36-.3v-.44A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.67.03 2.5.08v-.33c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.33C8.33 4.03 9.16 4 10 4Z" clipRule="evenodd" /></svg>
          </button>
        )}
      </div>
    </li>
  );
}

function BusinessSheet({ b, modules, onClose, onChanged }) {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(b.plan);
  const [mods, setMods] = useState(() => Object.fromEntries(modules.map((m) => [m.key, !!b.modules?.[m.key]?.enabled])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = plan !== b.plan || modules.some((m) => mods[m.key] !== !!b.modules?.[m.key]?.enabled);

  const run = async (fn, ok) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      if (ok) setNotice(ok);
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    if (plan !== b.plan) await api.patch(`/dev/businesses/${b.id}/plan`, { plan });
    for (const m of modules) {
      if (mods[m.key] !== !!b.modules?.[m.key]?.enabled) {
        await api.patch(`/dev/businesses/${b.id}/modules/${m.key}`, { enabled: mods[m.key] });
      }
    }
  }, 'Cambios guardados.');

  const enterAs = async (userId) => {
    setBusy(true); setError('');
    try {
      await impersonate(userId, startImpersonation);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setBusy(false);
    }
  };

  const removeUser = (p) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${p.email}? No se puede deshacer.`)) return;
    run(() => api.delete(`/dev/users/${p.userId}`), 'Usuario eliminado.');
  };

  const removeBusiness = async () => {
    const typed = window.prompt(`Esto borra ${b.name} y todos sus datos. Escribe el nombre del negocio para confirmar:`);
    if (typed === null) return;
    if (typed.trim() !== b.name.trim()) { setError('El nombre no coincide. No se ha borrado nada.'); return; }
    setBusy(true);
    try {
      await api.delete(`/dev/businesses/${b.id}`);
      onClose();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg"
      header={(
        <div className="flex items-center gap-3 min-w-0">
          <Initial name={b.name} type={b.businessType} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">{b.name}</h3>
            <p className="text-xs text-gray-500">{TYPE[b.businessType]} · cliente desde {shortDate(b.createdAt)}</p>
          </div>
        </div>
      )}
      footer={dirty ? (
        <button type="button" disabled={busy} onClick={save}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      ) : null}>
      <div className="space-y-6">
        {notice && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{notice}</p>}
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2.5">
            <p className="text-lg font-bold text-gray-900 tabular-nums">{b.activity.last30d}</p>
            <p className="text-[11px] text-gray-500">{b.activity.unit} 30 días</p>
          </div>
          <div className="rounded-xl bg-gray-50 py-2.5">
            <p className="text-lg font-bold text-gray-900 tabular-nums">{b.activity.total}</p>
            <p className="text-[11px] text-gray-500">{b.activity.unit} en total</p>
          </div>
          <div className="rounded-xl bg-gray-50 py-2.5">
            <p className="text-sm font-bold text-gray-900 pt-1">{b.lastSeenAt ? ago(b.lastSeenAt) : '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">última entrada</p>
          </div>
        </div>

        {b.owner.status === 'invited' && (
          <Section title="Invitación del dueño">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
              <p className="text-sm text-amber-900">
                <strong>{b.owner.name}</strong> ({b.owner.email}) aún no ha activado su cuenta.
                {b.owner.expiresAt && ` El enlace caduca el ${shortDate(b.owner.expiresAt)}.`}
              </p>
              {b.owner.inviteLink && <InviteLink link={b.owner.inviteLink} businessName={b.name} ownerName={b.owner.name} />}
              <button type="button" disabled={busy}
                onClick={() => run(() => api.post(`/dev/businesses/${b.id}/resend-owner-invite`, {}), 'Invitación reenviada con un enlace nuevo.')}
                className="text-sm font-semibold text-amber-900 hover:underline disabled:opacity-50">
                Reenviar por email con un enlace nuevo
              </button>
            </div>
          </Section>
        )}
        {b.owner.status === 'none' && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">Este negocio no tiene dueño activo ni invitación pendiente.</p>
        )}

        <Section title={`Equipo · ${b.team.length}`}>
          {b.team.length ? (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl px-3">
              {b.team.map((p) => (
                <PersonRow key={p.userId} p={p} busy={busy}
                  onImpersonate={p.exists ? () => enterAs(p.userId) : null}
                  onDelete={p.exists ? () => removeUser(p) : null} />
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">Todavía no ha entrado nadie.</p>}
          {b.pendingInvites.length > 0 && (
            <p className="text-xs text-gray-500">
              Invitados sin aceptar: {b.pendingInvites.map((i) => `${i.name || i.email} (${ROLE[i.role] || i.role})`).join(', ')}
            </p>
          )}
        </Section>

        <Section title="Plan">
          <div className="inline-flex p-1 rounded-xl bg-gray-100">
            {['free', 'basic', 'pro'].map((k) => (
              <button key={k} type="button" onClick={() => setPlan(k)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${plan === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {PLAN[k][0]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Módulos">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {modules.map((m) => (
              <li key={m.key}>
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50 h-full">
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-violet-600 shrink-0" checked={!!mods[m.key]}
                    onChange={(e) => setMods((x) => ({ ...x, [m.key]: e.target.checked }))} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{m.name}</span>
                    <span className="block text-xs text-gray-500">{m.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Datos del negocio">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-gray-500">Email</dt><dd className="text-gray-900 truncate">{b.email || '—'}</dd>
            <dt className="text-gray-500">Teléfono</dt><dd className="text-gray-900">{b.phone || '—'}</dd>
            <dt className="text-gray-500">Dirección</dt><dd className="text-gray-900">{b.address || '—'}</dd>
            <dt className="text-gray-500">Página</dt>
            <dd className="min-w-0">{b.publicUrl
              ? <a href={b.publicUrl} target="_blank" rel="noreferrer" className="text-violet-700 font-medium break-all hover:underline">{b.publicUrl.replace(/^https?:\/\//, '')}</a>
              : '—'}</dd>
          </dl>
        </Section>

        <div className="pt-3 border-t border-gray-100">
          <button type="button" disabled={busy} onClick={removeBusiness}
            className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50">
            Eliminar negocio…
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DevDashboard() {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useSetMobileHeader({ title: 'Clientes', action: { label: 'Cliente', onClick: () => setCreating(true) } });

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/dev/overview');
      setData(d);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const term = q.trim().toLowerCase();

  const list = useMemo(() => {
    if (!data) return [];
    return data.businesses.filter((b) => {
      if (term) {
        const text = [b.name, b.email, b.phone, b.owner.name, b.owner.email, ...b.team.map((t) => `${t.name} ${t.email}`)]
          .join(' ').toLowerCase();
        if (!text.includes(term)) return false;
      }
      if (filter === 'pending') return b.owner.status === 'invited';
      if (filter === 'active') return b.owner.status === 'active';
      if (filter === 'appointments' || filter === 'restaurant') return b.businessType === filter;
      if (filter === 'paid') return b.plan !== 'free';
      if (filter === 'idle') return b.activity.last30d === 0;
      return true;
    });
  }, [data, term, filter]);

  const orphans = useMemo(() => {
    if (!data) return [];
    return data.orphans.filter((o) => !term || `${o.name} ${o.email}`.toLowerCase().includes(term));
  }, [data, term]);

  const open = data?.businesses.find((b) => b.id === openId) || null;
  const s = data?.stats;

  const enterAsOrphan = async (id) => {
    setBusy(true);
    try {
      await impersonate(id, startImpersonation);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setBusy(false);
    }
  };

  const deleteOrphan = async (o) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${o.email}? No se puede deshacer.`)) return;
    setBusy(true);
    try { await api.delete(`/dev/users/${o.id}`); await load(); } catch (err) { setError(err.response?.data?.message || err.message); } finally { setBusy(false); }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      <div className="hidden xl:flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">Negocios que usan Vetra, su equipo y su actividad.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">+ Nuevo cliente</button>
      </div>

      {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Activos" value={s.active} sub={`de ${s.businesses} negocios`} />
            <Stat label="Por activar" value={s.pending} sub="invitación pendiente" tone={s.pending ? 'text-amber-600' : 'text-gray-900'} />
            <Stat label="De pago" value={s.paid} sub={`${s.businesses - s.paid} en Free`} />
            <Stat label="Actividad 30 d" value={s.activity30d} sub={`${s.activeLast7d} entraron esta semana`} />
          </div>

          <div className="space-y-2">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar negocio, persona o email"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5 [scrollbar-width:none]">
              {FILTERS.map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === k ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {list.length ? (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {list.map((b) => <BusinessRow key={b.id} b={b} onOpen={(x) => setOpenId(x.id)} />)}
            </ul>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
              {data.businesses.length ? 'Ningún cliente coincide.' : 'Aún no hay clientes.'}
              {!data.businesses.length && (
                <div><button type="button" onClick={() => setCreating(true)} className="mt-2 text-sm font-semibold text-violet-600">+ Crear el primero</button></div>
              )}
            </div>
          )}

          {orphans.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 px-4 py-3 group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 list-none flex items-center justify-between">
                <span>Cuentas sin negocio · {orphans.length}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
              </summary>
              <p className="text-xs text-gray-500 mt-1">Personas registradas que no pertenecen a ningún negocio (incluida la cuenta de Vetra).</p>
              <ul className="divide-y divide-gray-100 mt-1">
                {orphans.map((o) => (
                  <PersonRow key={o.id} p={o} busy={busy}
                    onImpersonate={o.isDev ? null : () => enterAsOrphan(o.id)}
                    onDelete={o.isDev ? null : () => deleteOrphan(o)} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {open && <BusinessSheet key={open.id} b={open} modules={data.modules} onClose={() => setOpenId(null)} onChanged={load} />}
      {creating && <NewClientModal onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
}
