import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

const typeOptions = [
  { value: 'closed', label: 'Restaurante cerrado (turno bloqueado)' },
  { value: 'full', label: 'Turno lleno (bloquear reservas)' },
  { value: 'call', label: 'Reserva solo por telefono' },
  { value: 'close_room', label: 'Cerrar una sala en ese turno' },
];

function typeBadge(type) {
  if (type === 'closed') return 'bg-gray-100 text-gray-700';
  if (type === 'full') return 'bg-amber-100 text-amber-700';
  if (type === 'call') return 'bg-violet-100 text-violet-700';
  if (type === 'close_room') return 'bg-rose-100 text-rose-700';
  return 'bg-gray-100 text-gray-700';
}

function typeLabel(type) {
  return typeOptions.find((t) => t.value === type)?.label || type;
}

export default function Exceptions() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(today);
  const [rows, setRows] = useState([]);
  const [slots, setSlots] = useState([]);
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

  const shiftNames = useMemo(
    () => [...new Set((slots || []).map((s) => s.shiftName).filter(Boolean))],
    [slots]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [exceptionsRes, slotsRes, roomsRes] = await Promise.all([
        api.get(`/exceptions?date=${dateFilter}`),
        api.get(`/shifts/slots?date=${dateFilter}`),
        api.get('/rooms'),
      ]);
      setRows(Array.isArray(exceptionsRes.data) ? exceptionsRes.data : []);
      setSlots(Array.isArray(slotsRes.data) ? slotsRes.data : []);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las excepciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dateFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      date: dateFilter,
      shiftName: shiftNames[0] || '',
      type: 'closed',
      roomId: '',
      message: '',
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
      message: row.message || '',
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
      setError(err?.response?.data?.message || 'No se pudo guardar la excepcion');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm('¿Eliminar esta excepcion?')) return;
    try {
      await api.delete(`/exceptions/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la excepcion');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Excepciones</h2>
          <p className="text-sm text-gray-400 mt-0.5">Bloquea turnos o salas para un dia concreto</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          Nueva excepcion
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <label className={labelCls}>Fecha</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Excepciones del {dateFilter}</h3>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">No hay excepciones para esta fecha.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Turno</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sala</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mensaje</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row._id} className={i < rows.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-5 py-3.5 text-gray-800 font-medium">{row.shiftName}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${typeBadge(row.type)}`}>
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{row.roomId?.name || '-'}</td>
                    <td className="px-4 py-3.5 text-gray-500 max-w-[320px]">
                      <p className="truncate">{row.message || '-'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeRow(row._id)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-8 overflow-auto">
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editing ? 'Editar excepcion' : 'Nueva excepcion'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">Define bloqueos por turno y fecha</p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                X
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className={labelCls}>Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Turno</label>
                <select
                  value={form.shiftName}
                  onChange={(e) => setForm((f) => ({ ...f, shiftName: e.target.value }))}
                  className={inputCls}
                  required
                >
                  <option value="">Selecciona turno</option>
                  {shiftNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipo de excepcion</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, roomId: '' }))}
                  className={inputCls}
                  required
                >
                  {typeOptions.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              {form.type === 'close_room' && (
                <div>
                  <label className={labelCls}>Sala a cerrar</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecciona sala</option>
                    {rooms.map((room) => (
                      <option key={room._id} value={room._id}>{room.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Mensaje opcional</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Texto que verá el cliente cuando aplique"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear excepcion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
