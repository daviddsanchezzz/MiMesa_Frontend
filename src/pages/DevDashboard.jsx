import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import NewClientModal, { InviteLink } from './dev/NewClientModal';
import Icon from '../ui/Icon';
import { Empty, FigureLine, RowAction, Section, SectionLink, Segmented } from '../ui/kit';

/*
 * Vetra panel: every client business in one list (owner, team, activity,
 * plan) with a detail sheet for everything you can do with it. Accounts that
 * belong to no business are listed at the end.
 */

// No free plan: new businesses try Pro 14 days, then read-only ('expired') until they pay.
// 'free' is only courtesy access (businesses from before trials, or given by Vetra).
// [label, dot colour, short label for the switch]
const PLAN = {
  trial: ['Prueba', '#0ea5e9', 'Prueba'],
  expired: ['Sin plan', '#e11d48', 'Sin plan'],
  free: ['Cortesía', '#9ca3af', 'Cortesía'],
  basic: ['Basic', '#7c3aed', 'Basic'],
  pro: ['Pro', '#059669', 'Pro'],
};
const PLAN_CHOICES = ['trial', 'basic', 'pro', 'free'];

function planState(b) {
  if (b.effectivePlan === 'expired') return 'expired';
  if (b.subscriptionStatus === 'trialing' && !b.hasSubscription) return 'trial';
  if (b.effectivePlan === 'free') return 'free';
  return b.plan;
}
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

function matches(b, filter) {
  if (filter === 'pending') return b.owner.status === 'invited';
  if (filter === 'active') return b.owner.status === 'active';
  if (filter === 'appointments' || filter === 'restaurant') return b.businessType === filter;
  if (filter === 'paid') return ['basic', 'pro'].includes(planState(b));
  if (filter === 'idle') return b.activity.last30d === 0;
  return true;
}

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

function Dot({ color, dashed }) {
  return <span className="w-2 h-2 rounded-full shrink-0" style={dashed ? { border: `1.5px dashed ${color}` } : { backgroundColor: color }} />;
}

/** The plan as a coloured dot and its name, like the states elsewhere in the app. */
function PlanText({ state, className = '' }) {
  const [label, color] = PLAN[state] || PLAN.free;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 ${className}`}><Dot color={color} />{label}</span>;
}

function Initial({ name, type, size = 'md' }) {
  const bg = type === 'appointments' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-800';
  const dims = size === 'lg' ? 'w-12 h-12 text-lg rounded-2xl' : 'w-10 h-10 text-sm rounded-xl';
  return (
    <span className={`${dims} flex items-center justify-center font-semibold shrink-0 ${bg}`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

function OwnerText({ owner }) {
  if (owner.status === 'active') {
    return <span className="inline-flex items-center gap-1.5 min-w-0"><Dot color="#10b981" /><span className="truncate">{owner.name || owner.email}</span></span>;
  }
  if (owner.status === 'invited') {
    return <span className="inline-flex items-center gap-1.5 min-w-0 text-amber-800"><Dot color="#f59e0b" dashed /><span className="truncate">Por activar · {owner.name || owner.email}</span></span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-gray-400"><Dot color="#d1d5db" />Sin dueño</span>;
}

function BusinessRow({ b, onOpen }) {
  const people = `${b.team.length} ${b.team.length === 1 ? 'persona' : 'personas'}`;
  return (
    <li>
      <button type="button" onClick={() => onOpen(b)}
        className="w-full text-left px-2 py-3 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
        <div className="md:col-span-4 flex items-center gap-3 min-w-0 flex-1">
          <Initial name={b.name} type={b.businessType} />
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-gray-900 truncate">{b.name}</p>
            <p className="text-[13px] text-gray-500 truncate md:hidden">
              {PLAN[planState(b)]?.[0]} · {TYPE[b.businessType] || 'Restaurante'} · {people}
            </p>
            <p className="hidden md:block text-[13px] text-gray-500 truncate">{TYPE[b.businessType] || 'Restaurante'} · desde {shortDate(b.createdAt)}</p>
            <p className="text-xs text-gray-600 mt-0.5 md:hidden"><OwnerText owner={b.owner} /></p>
          </div>
        </div>
        <div className="hidden md:block md:col-span-2"><PlanText state={planState(b)} /></div>
        <div className="hidden md:block md:col-span-3 text-sm text-gray-700 min-w-0"><OwnerText owner={b.owner} /></div>
        <div className="hidden md:block md:col-span-1 text-right text-sm tabular-nums text-gray-700">{b.team.length}</div>
        <div className="md:col-span-1 text-right shrink-0">
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{b.activity.last30d}</p>
          <p className="text-[11px] text-gray-400 md:hidden">{b.activity.unit} 30 d</p>
        </div>
        <div className="hidden md:block md:col-span-1 text-right text-[13px] text-gray-500">{b.lastSeenAt ? ago(b.lastSeenAt) : 'sin entrar'}</div>
        <Icon name="right" className="md:hidden w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />
      </button>
    </li>
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
    <li className="flex items-center gap-3 py-3">
      <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">
        {(p.name || p.email || '?').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-gray-900 truncate">
          {p.name || p.email}
          {p.role && <span className="ml-1.5 text-xs font-medium text-gray-400">{ROLE[p.role] || p.role}</span>}
          {p.isDev && <span className="ml-1.5 text-xs font-semibold text-violet-700">Vetra</span>}
        </p>
        <p className="text-[13px] text-gray-500 truncate">
          {p.email}{p.emailVerified === false ? ' · sin verificar' : ''} · {p.lastSeenAt ? `entró ${ago(p.lastSeenAt)}` : 'nunca ha entrado'}
        </p>
      </div>
      {onImpersonate && <RowAction disabled={busy} onClick={onImpersonate}>Entrar</RowAction>}
      {onDelete && (
        <button type="button" disabled={busy} onClick={onDelete} title="Eliminar usuario" aria-label="Eliminar usuario"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 shrink-0">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-[18px] h-[18px]"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.1A2 2 0 0 1 11.4 17H8.6a2 2 0 0 1-2-1.9L6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </li>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-violet-600' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function BusinessSheet({ b, modules, onClose, onChanged }) {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(planState(b));
  const [mods, setMods] = useState(() => Object.fromEntries(modules.map((m) => [m.key, !!b.modules?.[m.key]?.enabled])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = plan !== planState(b) || modules.some((m) => mods[m.key] !== !!b.modules?.[m.key]?.enabled);

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
    if (plan !== planState(b)) await api.patch(`/dev/businesses/${b.id}/plan`, { plan });
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

  const state = planState(b);
  return (
    <Modal onClose={onClose} size="lg"
      header={(
        <div className="flex items-center gap-3 min-w-0">
          <Initial name={b.name} type={b.businessType} size="lg" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{b.name}</h3>
            <p className="text-[13px] text-gray-500 flex items-center gap-1.5 min-w-0">
              <PlanText state={state} className="shrink-0" />
              <span className="truncate">· {TYPE[b.businessType]} · desde {shortDate(b.createdAt)}</span>
            </p>
          </div>
        </div>
      )}
      footer={dirty ? (
        <button type="button" disabled={busy} onClick={save}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      ) : null}>
      <div className="space-y-7">
        {notice && <p className="text-sm text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
        {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}

        <FigureLine items={[
          { value: b.activity.last30d, label: `${b.activity.unit} en 30 días` },
          { value: b.activity.total, label: 'en total' },
          { value: b.lastSeenAt ? ago(b.lastSeenAt) : '—', label: 'última entrada' },
        ]} />

        {b.owner.status === 'invited' && (
          <div className="rounded-2xl bg-amber-50 p-4 space-y-3">
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
        )}
        {b.owner.status === 'none' && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">Este negocio no tiene dueño activo ni invitación pendiente.</p>
        )}

        <Section title={`Equipo · ${b.team.length}`}>
          {b.team.length ? (
            <ul className="divide-y divide-gray-100">
              {b.team.map((p) => (
                <PersonRow key={p.userId} p={p} busy={busy}
                  onImpersonate={p.exists ? () => enterAs(p.userId) : null}
                  onDelete={p.exists ? () => removeUser(p) : null} />
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500 py-2">Todavía no ha entrado nadie.</p>}
          {b.pendingInvites.length > 0 && (
            <p className="text-[13px] text-gray-500 mt-1">
              Invitados sin aceptar: {b.pendingInvites.map((i) => `${i.name || i.email} (${ROLE[i.role] || i.role})`).join(', ')}
            </p>
          )}
        </Section>

        <Section title="Plan">
          <Segmented value={plan} onChange={setPlan} options={PLAN_CHOICES.map((k) => [k, PLAN[k][2]])} />
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            {state === 'trial' && b.trialEndsAt && `En prueba hasta el ${new Date(b.trialEndsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. `}
            {state === 'expired' && 'Prueba terminada: en solo lectura hasta que pague. '}
            «Prueba» da 14 días de Pro desde hoy; «Basic» y «Pro» se regalan sin Stripe; «Cortesía» es acceso gratis sin límite de tiempo.
          </p>
        </Section>

        <Section title="Módulos">
          <ul className="divide-y divide-gray-100">
            {modules.map((m) => (
              <li key={m.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-900">{m.name}</p>
                  <p className="text-[13px] text-gray-500">{m.description}</p>
                </div>
                <Toggle on={!!mods[m.key]} label={m.name} onChange={(v) => setMods((x) => ({ ...x, [m.key]: v }))} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Datos del negocio">
          <dl className="divide-y divide-gray-100 text-sm">
            {[['Email', b.email], ['Teléfono', b.phone], ['Dirección', b.address]].map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2.5">
                <dt className="w-24 shrink-0 text-gray-500">{k}</dt><dd className="text-gray-900 min-w-0 break-words">{v || '—'}</dd>
              </div>
            ))}
            <div className="flex gap-4 py-2.5">
              <dt className="w-24 shrink-0 text-gray-500">Página</dt>
              <dd className="min-w-0">{b.publicUrl
                ? <a href={b.publicUrl} target="_blank" rel="noreferrer" className="text-violet-700 font-medium break-all hover:underline">{b.publicUrl.replace(/^https?:\/\//, '')}</a>
                : '—'}</dd>
            </div>
          </dl>
        </Section>

        <div className="pt-1">
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
  const [showOrphans, setShowOrphans] = useState(false);

  useSetMobileHeader({ title: 'Clientes', action: { label: 'Nuevo', onClick: () => setCreating(true) } });

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
      return matches(b, filter);
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

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, data ? data.businesses.filter((b) => matches(b, k)).length : 0])), [data]);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden lg:block text-2xl font-semibold tracking-tight text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 lg:mt-0.5">Negocios que usan Vetra, su equipo y su actividad.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)}
          className="hidden lg:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
          <Icon name="plus" className="w-4 h-4" strokeWidth={2} />Nuevo cliente
        </button>
      </div>

      {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">Cargando…</p>}

      {data && (
        <>
          <FigureLine items={[
            { value: s.active, label: `activos de ${s.businesses}` },
            s.pending ? { value: s.pending, label: 'por activar', tone: 'warn' } : null,
            { value: s.paid, label: 'de pago', tone: s.paid ? 'good' : undefined },
            { value: s.trialing || 0, label: 'en prueba' },
            s.expired ? { value: s.expired, label: 'sin plan' } : null,
            { value: s.activity30d, label: 'citas y reservas en 30 días' },
            { value: s.activeLast7d, label: 'entraron esta semana' },
          ]} />

          <div className="space-y-3">
            <label className="relative block">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" strokeLinecap="round" /></svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar negocio, persona o email"
                className="w-full rounded-full bg-gray-100 border border-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-violet-500/30" />
            </label>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === k ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {label}{k !== 'all' && counts[k] > 0 && <span className={`ml-1 ${filter === k ? 'text-gray-300' : 'text-gray-400'}`}>{counts[k]}</span>}
                </button>
              ))}
            </div>
          </div>

          {list.length ? (
            <div>
              <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <span className="col-span-4">Negocio</span>
                <span className="col-span-2">Plan</span>
                <span className="col-span-3">Dueño</span>
                <span className="col-span-1 text-right">Equipo</span>
                <span className="col-span-1 text-right">30 días</span>
                <span className="col-span-1 text-right">Entró</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {list.map((b) => <BusinessRow key={b.id} b={b} onOpen={(x) => setOpenId(x.id)} />)}
              </ul>
            </div>
          ) : (
            <Empty action={!data.businesses.length && (
              <button type="button" onClick={() => setCreating(true)} className="text-sm font-semibold text-violet-700">+ Crear el primero</button>
            )}>
              {data.businesses.length ? 'Ningún cliente coincide.' : 'Aún no hay clientes.'}
            </Empty>
          )}

          {orphans.length > 0 && (
            <Section title={`Cuentas sin negocio · ${orphans.length}`} className="pt-2"
              aside={<SectionLink onClick={() => setShowOrphans((v) => !v)}>{showOrphans ? 'Ocultar' : 'Ver'}</SectionLink>}>
              <p className="text-[13px] text-gray-500">Personas registradas que no pertenecen a ningún negocio (incluida la cuenta de Vetra).</p>
              {showOrphans && (
                <ul className="divide-y divide-gray-100 mt-1">
                  {orphans.map((o) => (
                    <PersonRow key={o.id} p={o} busy={busy}
                      onImpersonate={o.isDev ? null : () => enterAsOrphan(o.id)}
                      onDelete={o.isDev ? null : () => deleteOrphan(o)} />
                  ))}
                </ul>
              )}
            </Section>
          )}
        </>
      )}

      {open && <BusinessSheet key={open.id} b={open} modules={data.modules} onClose={() => setOpenId(null)} onChanged={load} />}
      {creating && <NewClientModal onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
}
