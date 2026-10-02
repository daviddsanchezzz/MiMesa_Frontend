import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import ScheduleEditor, { scheduleForApi } from './ScheduleEditor';
import ServiceFormModal from './ServiceFormModal';
import { btnPrimary, btnSecondary, euros, inputCls, resizeImage, staffColors, STAFF_COLORS, summarizeRules } from './utils';
import StaffAvatar from './StaffAvatar';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import { useAuth } from '../../context/AuthContext';
import UpgradeHint from '../../components/UpgradeHint';
import { PRICES } from '../../lib/billing';

const KIND_LABEL = { staff: 'Profesional', space: 'Sala o espacio', equipment: 'Equipo' };

function Card({ title, subtitle, children, action }) {
  return (
    <section className="space-y-4">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          ) : <span className="text-sm text-gray-500">{subtitle}</span>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function BusinessHours({ onSaved }) {
  const [value, setValue] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    bookingsApi.schedule()
      .then((v) => { setValue(v); setSaved(v); })
      .catch(() => { const empty = { rules: [], overrides: [] }; setValue(empty); setSaved(empty); });
  }, []);

  const dirty = !!value && !!saved && JSON.stringify(scheduleForApi(value)) !== JSON.stringify(scheduleForApi(saved));
  useUnsavedChanges('horario', dirty);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const next = await bookingsApi.saveSchedule(scheduleForApi(value));
      setValue(next);
      setSaved(next);
      setMsg('Guardado');
      setTimeout(() => setMsg(''), 2500);
      onSaved?.();
    } catch (err) {
      setMsg(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Horario del negocio" subtitle="Cuándo se puede reservar. Los profesionales siguen este horario salvo que tengan uno propio.">
      {value && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tu horario</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">{summarizeRules(scheduleForApi(value).rules)}</p>
        </div>
      )}
      {value ? <ScheduleEditor value={value} onChange={setValue} /> : <p className="text-sm text-gray-400">Cargando…</p>}
      <div className={`flex flex-wrap items-center gap-3 ${dirty ? 'sticky bottom-3 z-10 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 shadow-sm' : ''}`}>
        <button type="button" className={btnPrimary} onClick={save} disabled={saving || !value || !dirty}>{saving ? 'Guardando…' : 'Guardar horario'}</button>
        {dirty && !saving && (
          <>
            <span className="text-sm text-amber-800">Tienes cambios sin guardar</span>
            <button type="button" className="text-sm text-gray-500 hover:text-gray-800 ml-auto" onClick={() => setValue(saved)}>Descartar</button>
          </>
        )}
        {msg && <span className={`text-sm ${msg === 'Guardado' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg === 'Guardado' ? 'Guardado ✓' : msg}</span>}
      </div>
    </Card>
  );
}

function ResourceScheduleModal({ resource, onClose }) {
  const [value, setValue] = useState(null);
  const [own, setOwn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingsApi.schedule({ ownerType: 'resource', ownerId: resource._id }).then((s) => {
      setOwn(!!s._id);
      setValue(s);
    });
  }, [resource._id]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (own) await bookingsApi.saveSchedule({ ownerType: 'resource', ownerId: resource._id, ...scheduleForApi(value) });
      else await bookingsApi.clearResourceSchedule(resource._id);
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Horario de ${resource.name}`} onClose={onClose} size="lg">
      {!value ? <p className="text-sm text-gray-400">Cargando…</p> : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <label className="flex items-center gap-2"><input type="radio" checked={!own} onChange={() => setOwn(false)} />Sigue el horario del negocio</label>
            <label className="flex items-center gap-2"><input type="radio" checked={own} onChange={() => setOwn(true)} />Tiene su propio horario y vacaciones</label>
          </div>
          {own && <ScheduleEditor value={value} onChange={setValue} />}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-emerald-500 transition-colors" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform" />
      </span>
      {label && <span className="text-xs text-gray-600">{label}</span>}
    </label>
  );
}

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Cambiar color"
        className="w-4 h-4 rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: value }} />
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 top-8 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1.5 w-max">
            {STAFF_COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => { onChange(c); setOpen(false); }}
                className={`w-7 h-7 rounded-full border-2 ${c === value ? 'border-gray-900' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Más opciones"
        className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg leading-none">⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48">
            {items.filter(Boolean).map((it) => (
              <button key={it.label} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 ${it.danger ? 'text-rose-600' : 'text-gray-700'}`}>
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StaffServicesModal({ resource, services, staff, onClose, onSaved }) {
  const does = (s) => {
    const req = (s.requirements || []).find((r) => r.kind === 'staff');
    if (!req) return false;
    return !(req.resourceIds || []).length || req.resourceIds.map(String).includes(resource._id);
  };
  const [selected, setSelected] = useState(() => new Set(services.filter(does).map((s) => s._id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function save() {
    setSaving(true);
    setError('');
    try {
      await bookingsApi.setResourceServices(resource._id, [...selected]);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Servicios de ${resource.name}`} subtitle="Marca lo que hace. Solo se le podrán reservar estos servicios." onClose={onClose}>
      <div className="space-y-2">
        {services.length === 0 && <p className="text-sm text-gray-500">Todavía no hay servicios.</p>}
        {services.map((s) => (
          <label key={s._id} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer ${selected.has(s._id) ? 'border-violet-300 bg-violet-50/50' : 'border-gray-200'}`}>
            <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} className="w-4 h-4 accent-violet-600" />
            <span className="flex-1 text-sm font-medium text-gray-900">{s.name}</span>
            <span className="text-xs text-gray-500">{s.durationMin} min · {euros(s.price?.amount)}</span>
          </label>
        ))}
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function LinkUserModal({ resource, members, onClose, onSaved }) {
  const [userId, setUserId] = useState(resource.userId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const active = members.filter((m) => m.status !== 'invited');
  async function save() {
    setSaving(true);
    setError('');
    try {
      await bookingsApi.updateResource(resource._id, { userId: userId || null });
      onSaved();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }
  return (
    <Modal title={`¿Quién es ${resource.name} en la app?`} subtitle="Esa persona verá «Mi agenda» con sus citas al entrar." onClose={onClose}>
      <div className="space-y-2">
        {[{ userId: '', userName: 'Nadie', userEmail: 'No está vinculada a ningún usuario' }, ...active].map((m) => (
          <label key={m.userId || 'none'} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer ${userId === m.userId ? 'border-violet-300 bg-violet-50/50' : 'border-gray-200'}`}>
            <input type="radio" name="link-user" checked={userId === m.userId} onChange={() => setUserId(m.userId)} className="accent-violet-600" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900 truncate">{m.userName || m.userEmail}</span>
              <span className="block text-xs text-gray-500 truncate">{m.userId ? m.userEmail : m.userEmail}</span>
            </span>
          </label>
        ))}
        {active.length <= 1 && (
          <p className="text-xs text-gray-500">Para vincular a otra persona, invítala primero desde <b>Equipo</b>.</p>
        )}
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function Resources({ resources, services, reload }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('staff');
  const [error, setError] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingServices, setEditingServices] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [linking, setLinking] = useState(null);
  const [members, setMembers] = useState([]);
  useEffect(() => { api.get('/members').then((r) => setMembers(r.data || [])).catch(() => setMembers([])); }, []);
  const memberName = (userId) => {
    const m = members.find((x) => x.userId === userId);
    return m ? (m.userName || m.userEmail) : 'Usuario';
  };
  const colors = staffColors(resources);
  const staff = resources.filter((r) => r.kind === 'staff');
  const { business } = useAuth();
  const maxPros = business?.capabilities?.maxProfessionals; // null = unlimited
  const prosFull = typeof maxPros === 'number' && staff.filter((r) => r.active !== false).length >= maxPros;
  // Same rule as the backend (planLimits.lockedStaff): over the limit, the newest rest.
  const resting = new Set(typeof maxPros === 'number'
    ? staff.filter((r) => r.active !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || String(a._id).localeCompare(String(b._id)))
      .slice(maxPros).map((r) => r._id)
    : []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await bookingsApi.createResource({ kind, name: name.trim() });
      setName('');
      setAdding(false);
      reload();
    } catch (err) { setError(apiError(err)); }
  }

  async function update(r, data) {
    setError('');
    try { await bookingsApi.updateResource(r._id, data); reload(); } catch (err) { setError(apiError(err)); }
  }

  async function uploadPhoto(r, file) {
    setError('');
    setUploading(r._id);
    try {
      const photo = await resizeImage(file, { max: 160, square: true });
      await bookingsApi.updateResource(r._id, { photo });
      reload();
    } catch (err) { setError(apiError(err, err.message)); } finally { setUploading(null); }
  }

  async function remove(r) {
    if (!window.confirm(`¿Desactivar a ${r.name}? Deja de aparecer en la agenda y en tu página; sus citas pasadas se conservan.`)) return;
    try { await bookingsApi.deleteResource(r._id); reload(); } catch (err) { setError(apiError(err)); }
  }

  const servicesOf = (r) => services.filter((s) => {
    const req = (s.requirements || []).find((x) => x.kind === r.kind);
    return req && (!(req.resourceIds || []).length || req.resourceIds.map(String).includes(r._id));
  });

  return (
    <Card subtitle={`${resources.length} ${resources.length === 1 ? 'persona o espacio' : 'personas o espacios'}`}
      action={!adding && (
        <button type="button" onClick={() => setAdding(true)}
          className="h-9 px-3.5 rounded-full bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700">+ Nuevo</button>
      )}>
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {resources.length === 0 && <li className="py-4 text-sm text-gray-400">Todavía no hay ninguno.</li>}
        {resources.map((r) => {
          const theirs = servicesOf(r);
          const isStaff = r.kind === 'staff';
          return (
            <li key={r._id} className="py-3 flex items-center gap-3">
              <label className="relative cursor-pointer shrink-0 group" title="Cambiar foto">
                <StaffAvatar name={r.name} photo={r.photo} color={colors[r._id] || '#9ca3af'} size={40} />
                <span className="absolute inset-0 rounded-full bg-black/40 text-white text-[10px] font-semibold items-center justify-center hidden group-hover:flex">
                  {uploading === r._id ? '…' : 'Foto'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(r, e.target.files[0])} />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {renaming === r._id ? (
                    <input autoFocus className={`${inputCls} !w-44 !py-1`} defaultValue={r.name}
                      onBlur={(e) => { setRenaming(null); if (e.target.value.trim() && e.target.value !== r.name) update(r, { name: e.target.value.trim() }); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(null); }} />
                  ) : (
                    <p className="text-[15px] font-medium text-gray-900 truncate">{r.name}</p>
                  )}
                  {isStaff && <ColorPicker value={colors[r._id]} onChange={(c) => update(r, { color: c })} />}
                  {!isStaff && <span className="text-[11px] px-1.5 py-px rounded bg-gray-100 text-gray-500">{KIND_LABEL[r.kind]}</span>}
                  {resting.has(r._id) && (
                    <span title="Tu plan incluye menos profesionales: no recibe citas nuevas. Sus citas ya reservadas se mantienen."
                      className="shrink-0 whitespace-nowrap text-[11px] px-1.5 py-px rounded bg-amber-50 text-amber-800 font-medium">En pausa</span>
                  )}
                </div>
                <p className="text-[13px] text-gray-500 truncate">
                  <button type="button" onClick={() => isStaff && setEditingServices(r)} className={isStaff ? 'hover:text-violet-700' : 'cursor-default'}>
                    {theirs.length === 0
                      ? (isStaff ? 'Sin servicios' : 'Sin servicios')
                      : theirs.length === services.length && services.length > 1 ? 'Todos los servicios' : theirs.map((x) => x.name).join(', ')}
                  </button>
                  {isStaff && r.userId && <> · <button type="button" onClick={() => setLinking(r)} className="hover:text-violet-700">Usuario: {memberName(r.userId)}</button></>}
                  {r.bookableOnline === false && <span className="text-gray-400"> · solo interno</span>}
                </p>
              </div>
              <button type="button" className="shrink-0 h-8 px-2.5 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100" onClick={() => setEditingSchedule(r)}>Horario</button>
              <RowMenu items={[
                { label: r.bookableOnline !== false ? 'Quitar de la reserva online' : 'Permitir reservar online', onClick: () => update(r, { bookableOnline: r.bookableOnline === false }) },
                { label: 'Cambiar nombre', onClick: () => setRenaming(r._id) },
                isStaff && { label: 'Servicios que hace', onClick: () => setEditingServices(r) },
                isStaff && { label: r.userId ? 'Cambiar usuario vinculado' : 'Vincular a un usuario', onClick: () => setLinking(r) },
                isStaff && r.photo && {
                  label: r.showPhotoToClients === false ? 'Mostrar foto a clientes' : 'Ocultar foto a clientes',
                  onClick: () => update(r, { showPhotoToClients: r.showPhotoToClients === false }),
                },
                r.photo && { label: 'Quitar foto', onClick: () => update(r, { photo: null }) },
                { label: 'Desactivar', danger: true, onClick: () => remove(r) },
              ]} />
            </li>
          );
        })}
      </ul>
      {adding && (
        <form onSubmit={add} className="rounded-2xl bg-gray-50 p-3 space-y-3">
          <input autoFocus className={inputCls} placeholder="Nombre (Ana, Cabina 2…)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`h-8 px-3 rounded-full text-[13px] font-semibold border ${kind === k ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setName(''); }} className="h-9 px-3.5 rounded-full text-[13px] font-semibold text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" className="h-9 px-4 rounded-full bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700">Añadir</button>
          </div>
        </form>
      )}
      {business?.effectivePlan === 'pro' && business?.hasSubscription && !business?.legacyAccess
        && staff.filter((r) => r.active !== false).length >= PRICES.proIncluded && (
        <p className="text-xs text-gray-500">
          Tu plan Pro incluye {PRICES.proIncluded} profesionales; cada uno más suma {PRICES.proExtra}/mes a tu factura (se ajusta solo al añadir o desactivar).
        </p>
      )}
      {prosFull && (
        <UpgradeHint>
          Tu plan incluye {maxPros} profesional.{resting.size > 0 && ` ${resting.size === 1 ? 'Quien está' : 'Quienes están'} «en pausa» no recibe${resting.size === 1 ? '' : 'n'} citas nuevas.`} Con Pro ({PRICES.pro}/mes, {PRICES.proIncluded} profesionales incluidos) trabajas con tu equipo.
        </UpgradeHint>
      )}
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
      {editingSchedule && <ResourceScheduleModal resource={editingSchedule} onClose={() => setEditingSchedule(null)} />}
      {linking && (
        <LinkUserModal resource={linking} members={members} onClose={() => setLinking(null)} onSaved={() => { setLinking(null); reload(); }} />
      )}
      {editingServices && (
        <StaffServicesModal resource={editingServices} services={services} staff={staff}
          onClose={() => setEditingServices(null)} onSaved={() => { setEditingServices(null); reload(); }} />
      )}
    </Card>
  );
}

// Services by category, in the order categories first appear (no category last).
function serviceGroups(services) {
  const map = new Map();
  for (const s of services) {
    const k = (s.category || '').trim();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return [...map.entries()].sort((a, b) => (a[0] === '') - (b[0] === ''));
}

function Services({ services, staff, reload }) {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [error, setError] = useState('');

  const [inactive, setInactive] = useState(null); // deactivated services, loaded on demand

  async function remove(s) {
    if (!window.confirm(`¿Desactivar el servicio ${s.name}? Deja de poder reservarse; lo puedes recuperar cuando quieras.`)) return;
    try { await bookingsApi.deleteService(s._id); reload(); setInactive(null); } catch (err) { setError(apiError(err)); }
  }

  async function showInactive() {
    try { setInactive((await bookingsApi.services(true)).filter((s) => s.active === false)); } catch (err) { setError(apiError(err)); }
  }

  async function restore(s) {
    try {
      await bookingsApi.updateService(s._id, { active: true });
      setInactive((list) => (list || []).filter((x) => x._id !== s._id));
      reload();
    } catch (err) { setError(apiError(err)); }
  }

  return (
    <Card subtitle={`${services.length} ${services.length === 1 ? 'servicio' : 'servicios'}`}
      action={(
        <button type="button" onClick={() => setEditing(null)}
          className="h-9 px-3.5 rounded-full bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700">+ Nuevo</button>
      )}>
      {services.length === 0 && <p className="py-4 text-sm text-gray-400 border-y border-gray-100">Todavía no hay servicios.</p>}
      {serviceGroups(services).map(([category, list]) => (
      <section key={category || '_'}>
        {(serviceGroups(services).length > 1 || category) && (
          <h4 className="pt-2 pb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-400">{category || 'Sin categoría'} · {list.length}</h4>
        )}
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {list.map((s) => {
          const req = (s.requirements || []).find((r) => r.kind === 'staff');
          const who = !req ? '' : (req.resourceIds || []).length
            ? req.resourceIds.map((id) => staff.find((x) => x._id === id)?.name).filter(Boolean).join(', ')
            : 'Cualquier profesional';
          return (
            <li key={s._id} className="py-3 flex items-center gap-3">
              <button type="button" className="min-w-0 flex-1 text-left group" onClick={() => setEditing(s)}>
                <p className="text-[15px] font-medium text-gray-900 truncate group-hover:text-violet-700">
                  {s.name}
                  {s.onlineBooking?.enabled === false && <span className="ml-1.5 align-middle text-[11px] font-normal px-1.5 py-px rounded bg-gray-100 text-gray-500">Solo interno</span>}
                </p>
                <p className="text-[13px] text-gray-500 truncate">{s.durationMin} min{who && ` · ${who}`}</p>
              </button>
              <span className="text-[15px] font-semibold tabular-nums text-gray-900">{euros(s.price?.amount)}</span>
              <RowMenu items={[
                { label: 'Editar', onClick: () => setEditing(s) },
                { label: 'Desactivar', danger: true, onClick: () => remove(s) },
              ]} />
            </li>
          );
        })}
      </ul>
      </section>
      ))}
      {inactive === null ? (
        <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-800" onClick={showInactive}>Ver servicios desactivados</button>
      ) : inactive.length === 0 ? (
        <p className="text-xs text-gray-400">No hay servicios desactivados.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500">Desactivados</p>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50">
            {inactive.map((s) => (
              <li key={s._id} className="px-3 py-2 flex items-center gap-3">
                <span className="text-sm text-gray-500">{s.name}</span>
                <span className="text-xs text-gray-400">{s.durationMin} min · {euros(s.price?.amount)}</span>
                <button type="button" className="ml-auto text-xs font-semibold text-violet-700 hover:text-violet-900" onClick={() => restore(s)}>Recuperar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {editing !== undefined && (
        <ServiceFormModal service={editing} staff={staff} onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); reload(); }} />
      )}
    </Card>
  );
}

// Self-loading sections used as tabs in Configuración (appointment businesses).
function useSetupData() {
  const [resources, setResources] = useState(null);
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');
  const reload = () => Promise.all([bookingsApi.resources(), bookingsApi.services()])
    .then(([r, s]) => { setResources(r); setServices(s); })
    .catch((err) => setError(apiError(err)));
  useEffect(() => { reload(); }, []);
  return { resources, services, reload, error };
}

function Loading({ error }) {
  return error
    ? <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
    : <p className="text-sm text-gray-400">Cargando…</p>;
}

export function ProfessionalsSettings() {
  const { resources, services, reload, error } = useSetupData();
  if (!resources || !services) return <Loading error={error} />;
  return <Resources resources={resources} services={services} reload={reload} />;
}

export function ServicesSettings() {
  const { resources, services, reload, error } = useSetupData();
  if (!resources || !services) return <Loading error={error} />;
  return <Services services={services} staff={resources.filter((r) => r.kind === 'staff')} reload={reload} />;
}

export function HoursSettings() {
  return <BusinessHours />;
}
