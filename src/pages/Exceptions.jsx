import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Modal from '../components/Modal';
import { PageHeader, PrimaryButton, Section, MenuButton, Empty } from '../ui/kit';
import { confirmDialog } from '../ui/confirm';
import { inputCls, labelCls } from '../ui/form';

const ALL_SHIFTS_KEY = '__all__';

const typeOptions = [
  { value: 'closed', label: 'Restaurante cerrado (turno bloqueado)', short: 'Cerrado', hint: 'No se aceptan reservas en ese turno', dot: 'bg-slate-500' },
  { value: 'full', label: 'Turno lleno (bloquear reservas)', short: 'Turno lleno', hint: 'Se muestra como completo', dot: 'bg-amber-500' },
  { value: 'call', label: 'Reserva solo por teléfono', short: 'Solo por teléfono', hint: 'La web pide que llamen', dot: 'bg-violet-500' },
  { value: 'close_room', label: 'Cerrar una sala en ese turno', short: 'Sala cerrada', hint: 'El resto de salas sigue abierto', dot: 'bg-rose-500' },
];

function typeInfo(type) {
  return typeOptions.find((t) => t.value === type) || { short: type, dot: 'bg-gray-400' };
}

function shiftLabel(shiftName) {
  return shiftName === ALL_SHIFTS_KEY ? 'Todos los turnos' : shiftName;
}

function parseDay(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// "sáb 10 oct"
function humanDay(iso) {
  return parseDay(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[.,]/g, '');
}

// "Octubre 2026"
function monthTitle(iso) {
  const d = parseDay(iso);
  const m = d.toLocaleDateString('es-ES', { month: 'long' });
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

function defaultMessageForType(type) {
  if (type === 'closed') return 'Restaurante cerrado en este turno';
  if (type === 'full') return 'Turno completo';
  if (type === 'call') return 'Por favor, llama por teléfono';
  if (type === 'close_room') return 'Sala cerrada para este turno';
  return 'Excepción activa en este turno';
}

function TypeText({ type, room }) {
  const t = typeInfo(type);
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
      <span className="truncate">{t.short}{room ? ` · ${room}` : ''}</span>
    </span>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-colors ${active ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
      {children}
    </button>
  );
}

export default function Exceptions({ embedded = false }) {
  useSetMobileHeader({ title: embedded ? undefined : 'Cierres', action: { label: 'Nueva', onClick: () => openCreate() } });
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState([]);
  const [formSlots, setFormSlots] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    date: today,
    shiftName: '',
    type: 'closed',
    roomId: '',
    message: '',
  });

  const shiftNames = useMemo(() => (
    [...new Set((formSlots || []).map((s) => s.shiftName).filter(Boolean))]
  ), [formSlots]);

  const futureRows = useMemo(() => (
    (rows || [])
      .filter((r) => r?.date && r.date >= today)
      .sort((a, b) => (a.date.localeCompare(b.date) || a.shiftName.localeCompare(b.shiftName)))
  ), [rows, today]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [exceptionsRes, roomsRes] = await Promise.all([
        api.get('/exceptions'),
        api.get('/rooms'),
      ]);
      setRows(Array.isArray(exceptionsRes.data) ? exceptionsRes.data : []);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las excepciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!formOpen || !form.date) {
      setFormSlots([]);
      return;
    }
    api.get(`/shifts/slots?date=${form.date}`)
      .then((res) => setFormSlots(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFormSlots([]));
  }, [formOpen, form.date]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      date: today,
      shiftName: '',
      type: 'closed',
      roomId: '',
      message: defaultMessageForType('closed'),
    });
    setFormOpen(true);
    setError('');
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      date: row.date,
      shiftName: row.shiftName,
      type: row.type,
      roomId: row.roomId?._id || row.roomId || '',
      message: row.message || defaultMessageForType(row.type),
    });
    setFormOpen(true);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        shiftName: form.shiftName,
        type: form.type,
        message: form.message,
      };
      if (form.type === 'close_room') payload.roomId = form.roomId || null;

      if (editing?._id) await api.put(`/exceptions/${editing._id}`, payload);
      else await api.post('/exceptions', payload);

      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la excepción');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id) => {
    if (!await confirmDialog('¿Eliminar esta excepción?')) return;
    try {
      await api.delete(`/exceptions/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la excepción');
    }
  };

  const months = useMemo(() => {
    const out = [];
    futureRows.forEach((row) => {
      const key = row.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, title: monthTitle(row.date), rows: [row] });
    });
    return out;
  }, [futureRows]);

  const canSubmit = !!form.date && !!form.shiftName && (form.type !== 'close_room' || !!form.roomId);
  const closeForm = () => setFormOpen(false);

  return (
    <div className="w-full space-y-8">
      {embedded ? (
        <p className="text-sm text-gray-500">Días y turnos con cierre, aforo completo o reserva solo por teléfono. Solo se muestran los próximos.</p>
      ) : (
        <PageHeader
          title="Cierres y excepciones"
          subtitle="Días y turnos con cierre, aforo completo o reserva solo por teléfono. Solo se muestran los próximos."
          actions={<PrimaryButton onClick={openCreate}>Nueva excepción</PrimaryButton>}
        />
      )}
      {embedded && futureRows.length > 0 && <div className="hidden lg:flex justify-end -mt-4"><PrimaryButton onClick={openCreate}>Nueva excepción</PrimaryButton></div>}

      {error && !formOpen && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <p className="py-8 text-sm text-gray-500">Cargando…</p>
      ) : futureRows.length === 0 ? (
        <Empty action={<PrimaryButton onClick={openCreate}>Nueva excepción</PrimaryButton>}>
          No hay cierres ni excepciones próximas.
        </Empty>
      ) : (
        <div className="space-y-8">
          <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400 -mb-6">
            <span className="col-span-2">Fecha</span>
            <span className="col-span-2">Turno</span>
            <span className="col-span-3">Tipo</span>
            <span className="col-span-4">Mensaje</span>
          </div>
          {months.map((month) => (
            <Section key={month.key} title={month.title}>
              <ul className="divide-y divide-gray-100">
                {month.rows.map((row) => {
                  const room = row.type === 'close_room' ? row.roomId?.name : '';
                  return (
                    <li key={row._id}
                      className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-gray-50 md:grid md:grid-cols-12 md:gap-4">
                      <div className="w-14 shrink-0 md:hidden leading-tight">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{humanDay(row.date).split(' ')[0]}</p>
                        <p className="text-[15px] font-semibold text-gray-900 tabular-nums whitespace-nowrap">{humanDay(row.date).split(' ').slice(1).join(' ')}</p>
                      </div>
                      <p className="hidden md:block md:col-span-2 text-[15px] font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {humanDay(row.date)}
                      </p>
                      {/* phone: two lines */}
                      <div className="min-w-0 flex-1 md:hidden">
                        <p className="text-[15px] font-medium text-gray-900 truncate"><TypeText type={row.type} room={room} /></p>
                        <p className="text-[13px] text-gray-500 truncate">
                          {shiftLabel(row.shiftName)}{row.message ? ` · ${row.message}` : ''}
                        </p>
                      </div>
                      {/* desktop: columns */}
                      <p className="hidden md:block md:col-span-2 text-sm text-gray-900 truncate">{shiftLabel(row.shiftName)}</p>
                      <p className="hidden md:flex md:col-span-3 text-sm text-gray-900 min-w-0"><TypeText type={row.type} room={room} /></p>
                      <p className="hidden md:block md:col-span-4 text-[13px] text-gray-500 truncate">{row.message || '—'}</p>
                      <div className="md:col-span-1 flex justify-end shrink-0">
                        <MenuButton ariaLabel="Más opciones" className="w-8 h-8 justify-center text-lg leading-none text-gray-500"
                          items={[
                            { label: 'Editar', onClick: () => openEdit(row) },
                            { label: 'Eliminar', onClick: () => removeRow(row._id) },
                          ]}>
                          ⋯
                        </MenuButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          title={editing ? 'Editar excepción' : 'Nueva excepción'}
          subtitle="Bloqueo para una fecha y un turno"
          size="md"
          onClose={closeForm}
          footer={(
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={closeForm}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" form="exception-form" disabled={saving || !canSubmit}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
                {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear excepción')}
              </button>
            </div>
          )}
        >
          <form id="exception-form" onSubmit={submit} className="space-y-6">
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div>
              <label className={labelCls} htmlFor="exc-date">Fecha</label>
              <input
                id="exc-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, shiftName: '' }))}
                className={inputCls}
                required
              />
              {form.date && <p className="text-xs text-gray-500 mt-1.5">{humanDay(form.date)}</p>}
            </div>

            <div>
              <p className={labelCls}>Turno</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={form.shiftName === ALL_SHIFTS_KEY} onClick={() => setForm((f) => ({ ...f, shiftName: ALL_SHIFTS_KEY }))}>
                  Todos los turnos
                </Chip>
                {shiftNames.map((name) => (
                  <Chip key={name} active={form.shiftName === name} onClick={() => setForm((f) => ({ ...f, shiftName: name }))}>
                    {name}
                  </Chip>
                ))}
              </div>
              {form.shiftName && form.shiftName !== ALL_SHIFTS_KEY && !shiftNames.includes(form.shiftName) && (
                <p className="text-xs text-gray-500 mt-1.5">Turno actual: {form.shiftName}</p>
              )}
              {!form.shiftName && <p className="text-xs text-gray-400 mt-1.5">Elige un turno.</p>}
            </div>

            <div>
              <p className={labelCls}>Qué pasa ese turno</p>
              <ul className="divide-y divide-gray-100 border-y border-gray-100" role="radiogroup">
                {typeOptions.map((t) => {
                  const selected = form.type === t.value;
                  return (
                    <li key={t.value}>
                      <button type="button" role="radio" aria-checked={selected}
                        onClick={() => setForm((f) => {
                          const nextType = t.value;
                          const prevDefault = defaultMessageForType(f.type);
                          const shouldUpdateMessage = !String(f.message || '').trim() || f.message === prevDefault;
                          return {
                            ...f,
                            type: nextType,
                            roomId: '',
                            message: shouldUpdateMessage ? defaultMessageForType(nextType) : f.message,
                          };
                        })}
                        className="w-full flex items-center gap-3 py-2.5 text-left">
                        <span className={`w-4 h-4 rounded-full shrink-0 ${selected ? 'border-[5px] border-violet-600' : 'border-[1.5px] border-gray-300'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <span className={`w-2 h-2 rounded-full ${t.dot}`} />{t.short}
                          </span>
                          <span className="block text-xs text-gray-500">{t.hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {form.type === 'close_room' && (
              <div>
                <p className={labelCls}>Sala a cerrar</p>
                {rooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay salas creadas.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((room) => (
                      <Chip key={room._id} active={String(form.roomId) === String(room._id)}
                        onClick={() => setForm((f) => ({ ...f, roomId: room._id }))}>
                        {room.name}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls} htmlFor="exc-msg">Mensaje para el cliente <span className="font-normal text-gray-400">(opcional)</span></label>
              <textarea
                id="exc-msg"
                rows={2}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className={`${inputCls} resize-none`}
                placeholder="Texto que verá el cliente cuando aplique"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
