<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
=======
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { bookingsApi } from '../services/bookingsApi';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Modal from '../components/Modal';
import Icon from '../ui/Icon';
import { PageHeader, PrimaryButton, Section, MenuButton, Empty, Segmented } from '../ui/kit';
>>>>>>> 1f9caddbdaece80755cdfd4a32b6a7e6aeaffa96

const ROLE_LABELS = { owner: 'Propietario', manager: 'Encargado', staff: 'Personal' };
<<<<<<< HEAD
const ROLE_HELP = {
  owner: ['Acceso total al negocio', 'Gestiona equipo, roles y facturación'],
  manager: ['Gestiona la operativa', 'Accede a las funciones permitidas por el negocio'],
  staff: ['Ve la agenda', 'Gestiona sus citas', 'Realiza operaciones básicas'],
};
const DAYS = [['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'], ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo']];
const inputCls = 'w-full min-h-11 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500';
const money = (value, currency = 'EUR') => new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(value) || 0);
const fullName = (p) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim();

function Avatar({ professional, large = false }) {
  return <div className={`${large ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'} rounded-full text-white font-bold flex items-center justify-center shrink-0`} style={{ backgroundColor: professional?.color || '#7C3AED' }}>{fullName(professional)[0]?.toUpperCase() || '?'}</div>;
}
function Loading() { return <div className="space-y-3"><div className="h-20 rounded-2xl bg-gray-100 animate-pulse" /><div className="h-36 rounded-2xl bg-gray-100 animate-pulse" /></div>; }
function Empty({ onCreate }) { return <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm"><div className="w-12 h-12 mx-auto mb-3 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-2xl">+</div><h2 className="font-semibold text-gray-900">Añade tu primer profesional</h2><p className="text-sm text-gray-500 mt-1 mb-5">Podrá recibir reservas aunque no tenga acceso a Vetra.</p><button onClick={onCreate} className="min-h-11 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold">Crear profesional</button></div>; }

function ProfessionalForm({ professional, onClose, onSaved }) {
  const { hasRole } = useAuth();
  const [form, setForm] = useState({ firstName: professional?.firstName || '', lastName: professional?.lastName || '', color: professional?.color || '#7C3AED' });
  const [access, setAccess] = useState({ enabled: false, email: '', role: 'staff' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (e) => { e.preventDefault(); setSaving(true); setError(''); try { const res = professional?._id ? await api.put(`/staff/employees/${professional._id}`, form) : await api.post('/staff/employees', form); if (!professional && access.enabled) await api.post('/invitations', { name: `${form.firstName} ${form.lastName}`.trim(), email: access.email, role: access.role, professionalId: res.data._id }); onSaved(res.data); } catch (err) { setError(err.response?.data?.message || 'No se pudo guardar el profesional'); } finally { setSaving(false); } };
  return <Modal title={professional ? 'Editar profesional' : 'Nuevo profesional'} onClose={onClose}><form onSubmit={submit} className="space-y-4">
    {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-sm font-medium text-gray-700">Nombre<input autoFocus required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={`${inputCls} mt-1.5`} /></label><label className="text-sm font-medium text-gray-700">Apellidos<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={`${inputCls} mt-1.5`} /></label></div>
    <label className="block text-sm font-medium text-gray-700">Color del avatar<div className="mt-1.5 flex items-center gap-3"><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-11 rounded-xl border border-gray-300 p-1 bg-white" /><span className="text-sm text-gray-500">Identifica su agenda rápidamente</span></div></label>
    {!professional && <div className="border border-gray-200 rounded-xl p-3"><label className="min-h-11 flex items-center gap-3 text-sm font-semibold text-gray-800"><input type="checkbox" checked={access.enabled} onChange={(e) => setAccess({ ...access, enabled: e.target.checked })} className="w-5 h-5 accent-violet-600" />Dar acceso a Vetra</label><p className="text-xs text-gray-500 ml-8">Podrá iniciar sesión y gestionar las funciones permitidas por su rol.</p>{access.enabled && <div className="grid sm:grid-cols-2 gap-3 mt-3"><input required type="email" placeholder="email@ejemplo.com" value={access.email} onChange={(e) => setAccess({ ...access, email: e.target.value })} className={inputCls} /><select value={access.role} onChange={(e) => setAccess({ ...access, role: e.target.value })} className={inputCls}><option value="staff">Personal</option><option value="manager">Encargado</option>{hasRole('owner') && <option value="owner">Propietario</option>}</select></div>}</div>}
    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100">Cancelar</button><button disabled={saving} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-white bg-violet-600 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button></div>
  </form></Modal>;
}

function TeamList({ professionals, members, onCreate }) {
  const navigate = useNavigate();
  const linkedMemberIds = new Set(professionals.map((p) => p.member?._id).filter(Boolean).map(String));
  const unlinked = members.filter((m) => !linkedMemberIds.has(String(m._id)));
  return <div className="space-y-5 max-w-4xl mx-auto"><div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-bold text-gray-900">Equipo</h1><p className="text-sm text-gray-500 mt-0.5">{professionals.length} {professionals.length === 1 ? 'profesional' : 'profesionales'}</p></div><button onClick={onCreate} className="min-h-11 shrink-0 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm">+ Profesional</button></div>
    {professionals.length === 0 ? <Empty onCreate={onCreate} /> : <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">{professionals.map((p) => { const services = (p.services || []).filter((s) => s.active !== false).map((s) => s.name); return <button key={p._id} onClick={() => navigate(`/equipo/${p._id}`, { state: { from: '/equipo' } })} className="w-full min-h-[76px] p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"><Avatar professional={p} /><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-gray-900 truncate">{fullName(p)}</p>{p.status !== 'active' && <span className="text-[11px] rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">Inactivo</span>}</div><p className="text-xs text-gray-500 truncate mt-0.5">{services.length ? services.join(', ') : 'Sin servicios asignados'}</p><p className="text-xs text-gray-400 mt-0.5">{p.scheduleMode === 'custom' ? 'Horario propio' : 'Horario del negocio'}</p></div><span className={`hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.member ? 'bg-emerald-50 text-emerald-700' : p.pendingInvitation ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{p.member ? 'Con acceso' : p.pendingInvitation ? 'Invitación pendiente' : 'Sin acceso'}</span><span className="text-gray-300">›</span></button>; })}</div>}
    {unlinked.length > 0 && <section><h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Usuarios sin profesional</h2><div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">{unlinked.map((m) => <div key={m._id} className="px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-gray-800 truncate">{m.userName || m.userEmail}</p><p className="text-xs text-gray-400 truncate">{m.userEmail}</p></div><span className="text-xs text-gray-500">{ROLE_LABELS[m.role] || m.role}</span></div>)}</div></section>}
  </div>;
}

function GeneralTab({ professional, performance, onEdit, onSave }) {
  const navigate = useNavigate(); const [editingSchedule, setEditingSchedule] = useState(false); const [scheduleMode, setScheduleMode] = useState(professional.scheduleMode || 'business'); const [weekly, setWeekly] = useState(professional.weeklySchedule || {}); const [vacations, setVacations] = useState(professional.vacations || []); const [vacationForm, setVacationForm] = useState({ startDate: '', endDate: '', reason: '' });
  const toggleDay = (key) => setWeekly((w) => ({ ...w, [key]: w[key]?.enabled ? { ...w[key], enabled: false } : { enabled: true, start: w[key]?.start || '09:00', end: w[key]?.end || '18:00' } }));
  const save = async () => { await onSave({ scheduleMode, weeklySchedule: weekly, vacations }); setEditingSchedule(false); };
  const futureVacations = (professional.vacations || []).filter((v) => v.endDate >= new Date().toISOString().slice(0, 10));
  return <div className="space-y-4"><section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3"><Avatar professional={professional} large /><div className="flex-1 min-w-0"><h2 className="text-lg font-bold text-gray-900 truncate">{fullName(professional)}</h2><span className={`text-xs font-semibold ${professional.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>● {professional.status === 'active' ? 'Activo' : 'Inactivo'}</span></div><button onClick={onEdit} className="min-h-11 px-3 text-sm font-semibold text-violet-700 rounded-xl hover:bg-violet-50">Editar</button></section>
    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><div className="flex justify-between items-start gap-3"><div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Horario</p><p className="text-sm font-semibold text-gray-900 mt-1">{professional.scheduleMode === 'custom' ? 'Tiene horario propio' : 'Sigue el horario del negocio'}</p></div><button onClick={() => setEditingSchedule(!editingSchedule)} className="min-h-11 px-3 text-sm font-semibold text-violet-700 rounded-xl hover:bg-violet-50">{editingSchedule ? 'Cerrar' : 'Editar'}</button></div>
      {editingSchedule && <div className="mt-4 pt-4 border-t border-gray-100 space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[['business', 'Horario del negocio'], ['custom', 'Horario propio y vacaciones']].map(([value, label]) => <button key={value} onClick={() => setScheduleMode(value)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${scheduleMode === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'}`}>{label}</button>)}</div>{scheduleMode === 'custom' && <><div className="space-y-2">{DAYS.map(([key, label]) => { const day = weekly[key] || {}; return <div key={key} className="min-h-11 flex items-center gap-2"><label className="flex items-center gap-2 w-28 text-sm font-medium"><input type="checkbox" checked={!!day.enabled} onChange={() => toggleDay(key)} />{label}</label>{day.enabled && <><input type="time" value={day.start || '09:00'} onChange={(e) => setWeekly({ ...weekly, [key]: { ...day, start: e.target.value } })} className="border rounded-lg px-2 py-2 text-sm min-w-0" /><span className="text-gray-400">–</span><input type="time" value={day.end || '18:00'} onChange={(e) => setWeekly({ ...weekly, [key]: { ...day, end: e.target.value } })} className="border rounded-lg px-2 py-2 text-sm min-w-0" /></>}</div>; })}</div><div className="pt-3 border-t border-gray-100"><p className="text-sm font-semibold text-gray-800 mb-2">Vacaciones</p>{vacations.map((v, i) => <div key={`${v.startDate}-${i}`} className="flex items-center gap-2 py-1 text-sm"><span className="flex-1">{v.startDate} – {v.endDate}{v.reason ? ` · ${v.reason}` : ''}</span><button onClick={() => setVacations(vacations.filter((_, idx) => idx !== i))} className="w-11 h-11 text-red-500" aria-label="Eliminar vacaciones">×</button></div>)}<div className="grid sm:grid-cols-3 gap-2"><input type="date" value={vacationForm.startDate} onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })} className={inputCls} /><input type="date" min={vacationForm.startDate} value={vacationForm.endDate} onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })} className={inputCls} /><button disabled={!vacationForm.startDate || !vacationForm.endDate} onClick={() => { setVacations([...vacations, vacationForm]); setVacationForm({ startDate: '', endDate: '', reason: '' }); }} className="min-h-11 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-40">Añadir vacaciones</button></div></div></>}<button onClick={save} className="min-h-11 w-full sm:w-auto px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold">Guardar horario</button></div>}
    </section><section className="grid sm:grid-cols-2 gap-4"><div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agenda</p><p className="text-sm text-gray-900 mt-2"><b>{performance?.appointments || 0} citas</b> este mes · {money(performance?.generated || 0)}</p><button onClick={() => navigate(`/reservations?professional=${professional._id}`)} className="min-h-11 mt-2 text-sm font-semibold text-violet-700">Ver agenda →</button></div><div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Próximas vacaciones</p><p className="text-sm text-gray-900 mt-2">{futureVacations.length ? `${futureVacations[0].startDate} – ${futureVacations[0].endDate}` : 'Ninguna'}</p><p className="text-xs text-gray-400 mt-2">Las vacaciones propias se guardan en su ficha.</p></div></section>
  </div>;
}

function ServicesTab({ professional, onSave }) {
  const [services, setServices] = useState(professional.services || []); const [saving, setSaving] = useState(false);
  const update = (i, patch) => setServices(services.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const save = async () => { setSaving(true); await onSave({ services: services.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() })) }); setSaving(false); };
  return <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"><div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Servicios de {professional.firstName}</h2><p className="text-sm text-gray-500 mt-1">Añade los servicios que realiza. Solo se le podrá reservar para estos servicios.</p></div><div className="p-4 space-y-3">{services.length === 0 && <p className="text-sm text-gray-400 text-center py-5">Todavía no tiene servicios asignados</p>}{services.map((service, i) => <div key={service._id || i} className="border border-gray-200 rounded-xl p-3"><div className="flex gap-2"><input aria-label="Servicio" placeholder="Ej. Manicura" value={service.name} onChange={(e) => update(i, { name: e.target.value })} className={`${inputCls} flex-1`} /><button onClick={() => setServices(services.filter((_, idx) => idx !== i))} className="w-11 h-11 rounded-xl text-red-500 hover:bg-red-50" aria-label="Eliminar servicio">×</button></div><div className="grid grid-cols-2 gap-2 mt-2"><label className="text-xs text-gray-500">Duración (min)<input type="number" min="5" step="5" value={service.duration} onChange={(e) => update(i, { duration: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label><label className="text-xs text-gray-500">Precio (€)<input type="number" min="0" step="0.01" value={service.price} onChange={(e) => update(i, { price: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label></div></div>)}<div className="flex flex-col sm:flex-row gap-2"><button onClick={() => setServices([...services, { name: '', duration: 30, price: 0, active: true }])} className="min-h-11 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">+ Añadir servicio</button><button disabled={saving} onClick={save} className="min-h-11 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold sm:ml-auto disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar servicios'}</button></div></div></section>;
}

function Metric({ label, value, note }) { return <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900 mt-1">{value}</p>{note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}</div>; }
function CompensationTab({ professional, performance, onRefresh }) {
  const comp = professional.activeCompensation; const [editing, setEditing] = useState(!comp); const [form, setForm] = useState({ paymentType: comp?.paymentType || 'monthly_fixed', baseAmount: comp?.baseAmount || '', effectiveFrom: new Date().toISOString().slice(0, 10), currency: 'EUR' }); const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); await api.post(`/staff/employees/${professional._id}/compensations`, { ...form, baseAmount: Number(form.baseAmount) }); await onRefresh(); setEditing(false); setSaving(false); };
  const compText = comp ? `${money(comp.baseAmount, comp.currency)} ${comp.paymentType === 'monthly_fixed' ? '/mes' : comp.paymentType === 'hourly' ? '/hora' : '/turno'}` : '';
  return <div className="space-y-4"><section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cómo cobra</p>{comp ? <><p className="font-semibold text-gray-900 mt-2">{comp.paymentType === 'monthly_fixed' ? 'Sueldo fijo' : comp.paymentType === 'hourly' ? 'Por horas' : 'Por turno'}</p><p className="text-sm text-gray-500">{compText}</p></> : <p className="text-sm text-gray-600 mt-2">Sin definir cómo cobra</p>}</div><button onClick={() => setEditing(!editing)} className="min-h-11 px-3 text-sm font-semibold text-violet-700">{comp ? 'Cambiar' : 'Configurar remuneración'}</button></div>{editing && <form onSubmit={submit} className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-3"><select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className={inputCls}><option value="monthly_fixed">Sueldo mensual</option><option value="hourly">Por hora</option><option value="per_shift">Por turno</option></select><input required type="number" min="0" step="0.01" placeholder="Importe" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} className={inputCls} /><button disabled={saving} className="min-h-11 rounded-xl bg-violet-600 text-white text-sm font-semibold">Guardar</button></form>}</section><section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p><div className="grid grid-cols-2 gap-3 mt-3"><Metric label="Ingresos generados" value={money(performance?.generated)} /><Metric label="Citas" value={performance?.appointments || 0} /><Metric label="Coste estimado" value={money(performance?.cost)} note="Según turnos y remuneración" /><Metric label="Margen para el negocio" value={money(performance?.margin)} /></div></section></div>;
}

function AccessTab({ professional, onRefresh }) {
  const { hasRole } = useAuth(); const member = professional.member; const invite = professional.pendingInvitation; const [form, setForm] = useState({ email: professional.email || '', role: 'staff' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const inviteUser = async (e) => { e.preventDefault(); setSaving(true); setError(''); try { await api.post('/invitations', { name: fullName(professional), ...form, professionalId: professional._id }); await onRefresh(); } catch (err) { setError(err.response?.data?.message || 'No se pudo enviar la invitación'); } finally { setSaving(false); } };
  const changeRole = async (role) => { try { await api.put(`/members/${member._id}`, { role }); await onRefresh(); } catch (err) { setError(err.response?.data?.message || 'No se pudo cambiar el rol'); } };
  const revoke = async () => { if (!confirm(`¿Revocar el acceso de ${professional.firstName}? El profesional, sus reservas y configuración se conservarán.`)) return; try { await api.delete(`/staff/employees/${professional._id}/access`); await onRefresh(); } catch (err) { setError(err.response?.data?.message || 'No se pudo revocar el acceso'); } };
  return <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Acceso a Vetra</h2>{error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2 mt-3">{error}</p>}{member ? <div className="mt-4"><p className="text-sm font-semibold text-emerald-700">✓ {professional.firstName} tiene acceso</p><p className="text-sm text-gray-500 mt-1">{member.userEmail}</p><label className="block text-xs font-semibold text-gray-500 mt-5">Rol<select value={member.role} disabled={!hasRole('owner') || member.role === 'owner'} onChange={(e) => changeRole(e.target.value)} className={`${inputCls} mt-1.5 max-w-sm disabled:bg-gray-50`}><option value="staff">Personal</option><option value="manager">Encargado</option><option value="owner">Propietario</option></select></label><ul className="mt-4 space-y-1">{ROLE_HELP[member.role]?.map((x) => <li key={x} className="text-sm text-gray-600">• {x}</li>)}</ul>{hasRole('owner') && member.role !== 'owner' && <button onClick={revoke} className="min-h-11 mt-5 px-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50">Revocar acceso</button>}</div> : invite ? <div className="mt-4"><p className="text-sm font-semibold text-amber-700">Invitación pendiente</p><p className="text-sm text-gray-500 mt-1">{invite.email} · {ROLE_LABELS[invite.role]}</p><p className="text-xs text-gray-400 mt-3">El acceso se vinculará automáticamente al aceptar la invitación.</p></div> : <div className="mt-4"><p className="text-sm text-gray-600">{professional.firstName} no tiene acceso a Vetra. Puede recibir citas igualmente.</p><form onSubmit={inviteUser} className="mt-5 space-y-3 max-w-md"><label className="block text-sm font-medium text-gray-700">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} mt-1.5`} /></label><label className="block text-sm font-medium text-gray-700">Rol<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${inputCls} mt-1.5`}><option value="staff">Personal</option><option value="manager">Encargado</option>{hasRole('owner') && <option value="owner">Propietario</option>}</select></label><p className="text-xs text-gray-400">Podrá iniciar sesión y gestionar las funciones permitidas por su rol.</p><button disabled={saving} className="min-h-11 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Enviando…' : 'Invitar a Vetra'}</button></form></div>}</section>;
}

function ProfessionalDetail({ professionals, performance, onRefresh }) {
  const { id } = useParams(); const navigate = useNavigate(); const location = useLocation(); const [params, setParams] = useSearchParams(); const professional = professionals.find((p) => String(p._id) === id); const [edit, setEdit] = useState(false); const tabs = ['general', 'servicios', 'remuneracion', 'acceso']; const active = tabs.includes(params.get('tab')) ? params.get('tab') : 'general';
  if (!professional) return <div className="text-center py-16 text-gray-500">Profesional no encontrado</div>;
  const row = performance?.rows?.find((r) => String(r.employeeId) === id); const save = async (payload) => { await api.put(`/staff/employees/${id}`, payload); await onRefresh(); };
  return <div className="space-y-4 max-w-4xl mx-auto"><div className="flex items-center gap-3"><button onClick={() => navigate(location.state?.from || '/equipo')} className="w-11 h-11 rounded-xl hover:bg-gray-100 text-gray-600 text-xl" aria-label="Volver">‹</button><div className="min-w-0"><p className="text-xs text-gray-400">Equipo</p><h1 className="text-xl font-bold text-gray-900 truncate">{fullName(professional)}</h1></div></div><div className="overflow-x-auto [scrollbar-width:none] -mx-4 px-4"><div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">{tabs.map((tab) => <button key={tab} onClick={() => setParams({ tab })} className={`min-h-11 px-4 rounded-lg text-sm font-semibold capitalize ${active === tab ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}>{tab === 'remuneracion' ? 'Remuneración' : tab}</button>)}</div></div>{active === 'general' && <GeneralTab professional={professional} performance={row} onEdit={() => setEdit(true)} onSave={save} />}{active === 'servicios' && <ServicesTab professional={professional} onSave={save} />}{active === 'remuneracion' && <CompensationTab professional={professional} performance={row} onRefresh={onRefresh} />}{active === 'acceso' && <AccessTab professional={professional} onRefresh={onRefresh} />}{edit && <ProfessionalForm professional={professional} onClose={() => setEdit(false)} onSaved={async () => { setEdit(false); await onRefresh(); }} />}</div>;
=======
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

const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

/* Sub-components */
function Avatar({ name, email }) {
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

function ErrorBanner({ msg, className = '' }) {
  return msg ? (
    <p className={`flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ${className}`}>
      <Icon name="alert" className="w-4 h-4 shrink-0" />
      {msg}
    </p>
  ) : null;
>>>>>>> 1f9caddbdaece80755cdfd4a32b6a7e6aeaffa96
}

export default function Team() {
<<<<<<< HEAD
  const { id } = useParams(); const [professionals, setProfessionals] = useState([]); const [members, setMembers] = useState([]); const [performance, setPerformance] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [create, setCreate] = useState(false); const navigate = useNavigate(); const month = useMemo(() => new Date().toISOString().slice(0, 7), []);
  useSetMobileHeader({ title: 'Equipo', actions: null });
  const load = useCallback(async () => { try { setError(''); const [p, m, perf] = await Promise.all([api.get('/staff/employees?includeInactive=true'), api.get('/members'), api.get(`/staff/performance?month=${month}`)]); setProfessionals(p.data); setMembers(m.data); setPerformance(perf.data); } catch (err) { setError(err.response?.data?.message || 'No se pudo cargar el equipo'); } finally { setLoading(false); } }, [month]);
  useEffect(() => { load(); }, [load]); if (loading) return <Loading />;
  return <>{error && <div className="max-w-4xl mx-auto mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}{id ? <ProfessionalDetail professionals={professionals} performance={performance} onRefresh={load} /> : <TeamList professionals={professionals} members={members} onCreate={() => setCreate(true)} />}{create && <ProfessionalForm onClose={() => setCreate(false)} onSaved={async (p) => { setCreate(false); await load(); navigate(`/equipo/${p._id}`); }} />}</>;
=======
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
  useSetMobileHeader({ title: 'Equipo', action: isManager ? { label: 'Invitar', onClick: () => setShowModal(true) } : false });

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
    if (!confirm(`¿Eliminar a ${name || 'este miembro'} del equipo?`)) return;
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

  return (
    <>
      <div className="w-full space-y-8">
        <PageHeader
          title="Equipo"
          subtitle={`${members.length} ${members.length === 1 ? 'persona' : 'personas'} en tu negocio`}
          actions={isManager && <PrimaryButton onClick={() => setShowModal(true)}>Invitar persona</PrimaryButton>}
        />

        <ErrorBanner msg={pageError} />

        {/* Members */}
        <Section title="Miembros">
          {members.length === 0 ? (
            <Empty>Aún no hay miembros en este negocio</Empty>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <span className={showAgenda ? 'col-span-6' : 'col-span-9'}>Persona</span>
                {showAgenda && <span className="col-span-3">Agenda</span>}
                <span className="col-span-3 text-right pr-10">Rol</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {members.map((member) => {
                  const isMe      = member.userId === myUserId;
                  const isOwnerRow = member.role === 'owner';
                  const canEdit   = isOwner && !isMe && !isOwnerRow;
                  const pro       = showAgenda ? proOfUser(member.userId) : null;

                  return (
                    <li key={member._id} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-50 md:grid md:grid-cols-12 md:gap-4">
                      <div className={`flex items-center gap-3 min-w-0 flex-1 ${showAgenda ? 'md:col-span-6' : 'md:col-span-9'}`}>
                        <Avatar name={member.userName} email={member.userEmail} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-[15px] font-medium text-gray-900 truncate">{member.userName || '-'}</p>
                            {isMe && <span className="text-[11px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-600">tú</span>}
                          </div>
                          <p className="text-[13px] text-gray-500 truncate">
                            {member.userEmail || '-'}
                          </p>
                          {showAgenda && <p className="md:hidden text-[13px] text-gray-400 truncate">{pro ? `Agenda de ${pro.name}` : 'Sin agenda propia'}</p>}
                        </div>
                      </div>

                      {showAgenda && (
                        <p className={`hidden md:block md:col-span-3 text-[13px] truncate ${pro ? 'text-gray-700' : 'text-gray-400'}`}>
                          {pro ? `Agenda de ${pro.name}` : 'Sin agenda propia'}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 shrink-0 md:col-span-3">
                        {canEdit ? (
                          <>
                            <MenuButton ariaLabel="Cambiar rol" className="h-8 pl-2.5 pr-2"
                              items={['staff', 'manager', 'owner'].map((r) => ({
                                label: ROLE_LABELS[r], active: member.role === r,
                                onClick: () => { if (r !== member.role) handleRoleChange(member._id, r); },
                              }))}>
                              <RoleText role={member.role} />
                              <Icon name="down" className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                            </MenuButton>
                            <MenuButton ariaLabel="Más opciones" className="w-8 h-8 justify-center text-lg leading-none text-gray-500"
                              items={[{ label: 'Quitar del equipo', onClick: () => handleRemove(member._id, member.userName) }]}>
                              ⋯
                            </MenuButton>
                          </>
                        ) : (
                          <span className="pr-10"><RoleText role={member.role} /></span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
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
      </div>

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
>>>>>>> 1f9caddbdaece80755cdfd4a32b6a7e6aeaffa96
}
