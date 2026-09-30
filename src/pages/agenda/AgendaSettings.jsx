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

const KIND_LABEL = { staff: 'Profesional', space: 'Sala o espacio', equipment: 'Equipo' };

function Card({ title, subtitle, children, action }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
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
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  );
}

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Cambiar color"
        className="w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-gray-200" style={{ backgroundColor: value }} />
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
    <Card title="Profesionales y espacios" subtitle="Quién o qué se reserva: personas, salas, cabinas, equipos.">
      <ul className="space-y-2">
        {resources.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">Todavía no hay ninguno.</li>}
        {resources.map((r) => {
          const theirs = servicesOf(r);
          const isStaff = r.kind === 'staff';
          return (
            <li key={r._id} className="border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-3">
              <label className="relative cursor-pointer shrink-0 group" title="Cambiar foto">
                <StaffAvatar name={r.name} photo={r.photo} color={colors[r._id] || '#9ca3af'} size={44} />
                <span className="absolute inset-0 rounded-full bg-black/40 text-white text-[10px] font-semibold items-center justify-center hidden group-hover:flex">
                  {uploading === r._id ? '…' : 'Foto'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(r, e.target.files[0])} />
              </label>
              <div className="min-w-0 flex-1 basis-40">
                <div className="flex items-center gap-2">
                  {renaming === r._id ? (
                    <input autoFocus className={`${inputCls} !w-48 !py-1.5`} defaultValue={r.name}
                      onBlur={(e) => { setRenaming(null); if (e.target.value.trim() && e.target.value !== r.name) update(r, { name: e.target.value.trim() }); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(null); }} />
                  ) : (
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                  )}
                  {isStaff && <ColorPicker value={colors[r._id]} onChange={(c) => update(r, { color: c })} />}
                  {!isStaff && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{KIND_LABEL[r.kind]}</span>}
                  {resting.has(r._id) && (
                    <span title="Tu plan incluye menos profesionales: no recibe citas nuevas. Sus citas ya reservadas se mantienen."
                      className="shrink-0 whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium">En pausa</span>
                  )}
                  {isStaff && r.userId && (
                    <button type="button" onClick={() => setLinking(r)} title="Usuario de la app vinculado"
                      className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium truncate max-w-[10rem]">
                      👤 {memberName(r.userId)}
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => isStaff && setEditingServices(r)}
                  className={`mt-0.5 text-xs text-left ${isStaff ? 'text-gray-500 hover:text-violet-700' : 'text-gray-400 cursor-default'}`}>
                  {theirs.length === 0
                    ? (isStaff ? 'No hace ningún servicio · Asignar' : 'No se usa en ningún servicio')
                    : `${theirs.length === services.length && services.length > 1 ? 'Todos los servicios' : theirs.map((s) => s.name).join(', ')}${isStaff ? ' · Editar' : ''}`}
                </button>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Toggle checked={r.bookableOnline !== false} onChange={(v) => update(r, { bookableOnline: v })} label="Se puede reservar online" />
                <button type="button" className="text-xs font-semibold text-violet-700 hover:text-violet-900 px-2.5 py-1.5 rounded-lg bg-violet-50" onClick={() => setEditingSchedule(r)}>Horario</button>
                <RowMenu items={[
                  { label: 'Cambiar nombre', onClick: () => setRenaming(r._id) },
                  isStaff && { label: 'Servicios que hace', onClick: () => setEditingServices(r) },
                  isStaff && { label: r.userId ? 'Cambiar usuario vinculado' : 'Vincular a un usuario', onClick: () => setLinking(r) },
                  r.photo && { label: 'Quitar foto', onClick: () => update(r, { photo: null }) },
                  { label: 'Desactivar', danger: true, onClick: () => remove(r) },
                ]} />
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="flex flex-wrap gap-2 pt-1">
        <input className={`${inputCls} !w-auto flex-1 min-w-[10rem]`} placeholder="Nombre (Ana, Sala 1…)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        <select className={`${inputCls} !w-auto`} value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button type="submit" className={btnPrimary}>Añadir</button>
      </form>
      {prosFull && (
        <UpgradeHint>
          Tu plan incluye {maxPros} profesional.{resting.size > 0 && ` ${resting.size === 1 ? 'Quien está' : 'Quienes están'} «en pausa» no recibe${resting.size === 1 ? '' : 'n'} citas nuevas.`} Con Pro trabajas con todo tu equipo.
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

function Services({ services, staff, reload }) {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [error, setError] = useState('');

  async function remove(s) {
    if (!window.confirm(`¿Desactivar el servicio ${s.name}?`)) return;
    try { await bookingsApi.deleteService(s._id); reload(); } catch (err) { setError(apiError(err)); }
  }

  return (
    <Card title="Servicios" subtitle="Lo que se puede reservar, cuánto dura y quién lo hace."
      action={<button type="button" className={btnPrimary} onClick={() => setEditing(null)}>Nuevo servicio</button>}>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
        {services.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">Todavía no hay servicios.</li>}
        {services.map((s) => {
          const req = (s.requirements || []).find((r) => r.kind === 'staff');
          const who = !req ? '—' : (req.resourceIds || []).length
            ? req.resourceIds.map((id) => staff.find((x) => x._id === id)?.name).filter(Boolean).join(', ')
            : 'Cualquier profesional';
          return (
            <li key={s._id} className="px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button type="button" className="text-sm font-medium text-gray-900 hover:text-violet-700 text-left" onClick={() => setEditing(s)}>{s.name}</button>
              <span className="text-xs text-gray-500">{s.durationMin} min · {euros(s.price?.amount)}</span>
              <span className="text-xs text-gray-400 truncate">{who}</span>
              {s.onlineBooking?.enabled === false && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Solo interno</span>}
              <button type="button" className="ml-auto text-xs text-gray-400 hover:text-rose-600" onClick={() => remove(s)}>Desactivar</button>
            </li>
          );
        })}
      </ul>
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
