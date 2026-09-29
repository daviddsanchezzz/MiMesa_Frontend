import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import ScheduleEditor, { scheduleForApi } from './ScheduleEditor';
import ServiceFormModal from './ServiceFormModal';
import { btnPrimary, btnSecondary, euros, inputCls } from './utils';

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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { bookingsApi.schedule().then(setValue).catch(() => setValue({ rules: [], overrides: [] })); }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      setValue(await bookingsApi.saveSchedule(scheduleForApi(value)));
      setMsg('Guardado');
      onSaved?.();
    } catch (err) {
      setMsg(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Horario del negocio" subtitle="Cuándo se puede reservar. Los profesionales siguen este horario salvo que tengan uno propio.">
      {value ? <ScheduleEditor value={value} onChange={setValue} /> : <p className="text-sm text-gray-400">Cargando…</p>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} onClick={save} disabled={saving || !value}>{saving ? 'Guardando…' : 'Guardar horario'}</button>
        {msg && <span className={`text-sm ${msg === 'Guardado' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</span>}
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

function Resources({ resources, reload }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('staff');
  const [error, setError] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [renaming, setRenaming] = useState(null);

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
    try { await bookingsApi.updateResource(r._id, data); reload(); } catch (err) { setError(apiError(err)); }
  }

  async function remove(r) {
    if (!window.confirm(`¿Desactivar ${r.name}? Sus citas pasadas se conservan.`)) return;
    try { await bookingsApi.deleteResource(r._id); reload(); } catch (err) { setError(apiError(err)); }
  }

  return (
    <Card title="Profesionales y espacios" subtitle="Quién o qué se reserva: personas, salas, cabinas, equipos.">
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
        {resources.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">Todavía no hay ninguno.</li>}
        {resources.map((r) => (
          <li key={r._id} className="px-3 py-2.5 flex flex-wrap items-center gap-2">
            {renaming === r._id ? (
              <input autoFocus className={`${inputCls} !w-48 !py-1.5`} defaultValue={r.name}
                onBlur={(e) => { setRenaming(null); if (e.target.value.trim() && e.target.value !== r.name) update(r, { name: e.target.value.trim() }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(null); }} />
            ) : (
              <button type="button" className="text-sm font-medium text-gray-900 hover:text-violet-700" onClick={() => setRenaming(r._id)}>{r.name}</button>
            )}
            <span className="text-xs text-gray-400">{KIND_LABEL[r.kind]}</span>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 ml-auto">
              <input type="checkbox" checked={r.bookableOnline !== false} onChange={(e) => update(r, { bookableOnline: e.target.checked })} />
              Online
            </label>
            <button type="button" className="text-xs font-semibold text-violet-600 hover:text-violet-800" onClick={() => setEditingSchedule(r)}>Horario</button>
            <button type="button" className="text-xs text-gray-400 hover:text-rose-600" onClick={() => remove(r)}>Desactivar</button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input className={`${inputCls} !w-auto flex-1 min-w-[10rem]`} placeholder="Nombre (Ana, Sala 1…)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        <select className={`${inputCls} !w-auto`} value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button type="submit" className={btnPrimary}>Añadir</button>
      </form>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {editingSchedule && <ResourceScheduleModal resource={editingSchedule} onClose={() => setEditingSchedule(null)} />}
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
  const { resources, reload, error } = useSetupData();
  if (!resources) return <Loading error={error} />;
  return <Resources resources={resources} reload={reload} />;
}

export function ServicesSettings() {
  const { resources, services, reload, error } = useSetupData();
  if (!resources || !services) return <Loading error={error} />;
  return <Services services={services} staff={resources.filter((r) => r.kind === 'staff')} reload={reload} />;
}

export function HoursSettings() {
  return <BusinessHours />;
}
