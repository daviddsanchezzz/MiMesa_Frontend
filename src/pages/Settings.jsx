import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
  </svg>
);
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
  </svg>
);
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
  </svg>
);
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7-4.75a.75.75 0 0 1 .75.75v4.27l2.78 1.6a.75.75 0 1 1-.75 1.3L7.4 9.23A.75.75 0 0 1 7 8.5V4a.75.75 0 0 1 .75-.75H8Z" clipRule="evenodd" />
  </svg>
);

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4">
      {msg}
    </div>
  );
}

function EmptyState({ onAction, actionLabel, text }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5 text-gray-300">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-medium">{text}</p>
      {onAction && (
        <button onClick={onAction} className="mt-3 text-sm text-indigo-600 hover:underline font-medium">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SALAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function SalasSection() {
  const [rooms,  setRooms]  = useState([]);
  const [tables, setTables] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ name: '', capacity: '', description: '' });
  const [error,  setError]  = useState('');

  const load = async () => {
    const [r, t] = await Promise.all([api.get('/rooms'), api.get('/tables')]);
    setRooms(r.data);
    setTables(t.data);
  };
  useEffect(() => { load(); }, []);

  const tableCount = (roomId) => tables.filter(t => t.roomId?._id === roomId).length;
  const totalCap   = rooms.reduce((s, r) => s + (r.capacity || 0), 0);

  const openCreate = () => { setForm({ name: '', capacity: '', description: '' }); setError(''); setModal('create'); };
  const openEdit   = (r) => { setForm({ name: r.name, capacity: r.capacity, description: r.description || '' }); setError(''); setModal(r); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (modal === 'create') await api.post('/rooms', payload);
      else                    await api.put(`/rooms/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sala? Las mesas asignadas quedarán sin sala.')) return;
    await api.delete(`/rooms/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rooms.length} sala{rooms.length !== 1 ? 's' : ''} · {totalCap} plazas totales
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <IconPlus /> Nueva sala
        </button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState text="Sin salas todavía" onAction={openCreate} actionLabel="Crear la primera sala" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const used = tableCount(room._id);
            const pct  = room.capacity > 0 ? Math.min(100, Math.round((used / room.capacity) * 100)) : 0;
            return (
              <div key={room._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{room.name}</h3>
                    {room.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-semibold shrink-0 ml-2">
                    {room.capacity} plazas
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{used} mesas asignadas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(room)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 font-medium transition-colors"
                  >
                    <IconEdit /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(room._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors"
                  >
                    <IconTrash /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva sala' : 'Editar sala'}
          subtitle={modal !== 'create' ? modal.name : 'Añade una nueva sala al restaurante'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Interior, Terraza, Privado..."
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Capacidad máx. *</label>
                <input type="number" required min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Vista al jardín, con aire acondicionado..."
                className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear sala' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MESAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function MesasSection() {
  const [tables, setTables] = useState([]);
  const [rooms,  setRooms]  = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({ name: '', capacity: 2, roomId: '' });
  const [error,  setError]  = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    const [t, r] = await Promise.all([api.get('/tables'), api.get('/rooms')]);
    setTables(t.data);
    setRooms(r.data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', capacity: 2, roomId: '' }); setError(''); setModal('create'); };
  const openEdit   = (t) => { setForm({ name: t.name, capacity: t.capacity, roomId: t.roomId?._id || '' }); setError(''); setModal(t); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, capacity: Number(form.capacity), roomId: form.roomId || null };
      if (modal === 'create') await api.post('/tables', payload);
      else                    await api.put(`/tables/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    await api.delete(`/tables/${id}`);
    load();
  };

  const filtered = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.roomId?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, t) => {
    const key   = t.roomId ? t.roomId._id : '__none__';
    const label = t.roomId ? t.roomId.name : 'Sin sala';
    if (!acc[key]) acc[key] = { label, rows: [] };
    acc[key].rows.push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mesa o sala..."
            className="w-full border border-gray-300 rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <IconPlus /> Nueva mesa
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text={search ? 'Sin resultados' : 'Sin mesas todavía'}
          onAction={!search ? openCreate : null}
          actionLabel="Crear la primera mesa"
        />
      ) : (
        <div className="space-y-5">
          {Object.values(grouped).map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                {group.label}
                <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                  {group.rows.length}
                </span>
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                {group.rows.map(t => (
                  <div key={t._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="#6366f1" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v5.75A2.75 2.75 0 0 1 9.25 12H4.75A2.75 2.75 0 0 1 2 9.25V3.5h-.25A.75.75 0 0 1 1 2.75Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.capacity} personas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 font-medium transition-colors"
                      >
                        <IconEdit /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                      >
                        <IconTrash /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nueva mesa' : 'Editar mesa'}
          subtitle={modal !== 'create' ? modal.name : 'Añade una nueva mesa'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mesa 1, Terraza A, Barra..."
                className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Capacidad *</label>
                <input type="number" required min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sala</label>
                <select value={form.roomId}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className={inputCls}>
                  <option value="">Sin sala</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>{r.name} (cap. {r.capacity})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear mesa' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TURNOS SECTION
// ═══════════════════════════════════════════════════════════════════════════
const DAYS = [
  { value: 1, label: 'L', full: 'Lunes'      },
  { value: 2, label: 'M', full: 'Martes'     },
  { value: 3, label: 'X', full: 'Miércoles'  },
  { value: 4, label: 'J', full: 'Jueves'     },
  { value: 5, label: 'V', full: 'Viernes'    },
  { value: 6, label: 'S', full: 'Sábado'     },
  { value: 0, label: 'D', full: 'Domingo'    },
];

const SHIFT_COLORS = [
  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-400'  },
  { bg: 'bg-rose-50',    text: 'text-rose-700',     border: 'border-rose-200',    dot: 'bg-rose-400'    },
  { bg: 'bg-emerald-50', text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-50',  text: 'text-violet-700',   border: 'border-violet-200',  dot: 'bg-violet-400'  },
  { bg: 'bg-sky-50',     text: 'text-sky-700',      border: 'border-sky-200',     dot: 'bg-sky-400'     },
];

const colorOf = (index) => SHIFT_COLORS[index % SHIFT_COLORS.length];

const emptyShiftForm = () => ({
  name: '', startTime: '12:00', endTime: '16:00',
  days: [1,2,3,4,5,6,0], subShifts: [],
  startDate: '', endDate: '',
});

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function TurnosSection() {
  const [shifts, setShifts] = useState([]);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(emptyShiftForm());
  const [error,  setError]  = useState('');

  const load = async () => { const r = await api.get('/shifts'); setShifts(r.data); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyShiftForm()); setError(''); setModal('create'); };
  const openEdit   = (s)  => {
    setForm({
      name: s.name, startTime: s.startTime || '12:00', endTime: s.endTime || '16:00',
      days: s.days || [0,1,2,3,4,5,6], subShifts: s.subShifts.map(ss => ({ ...ss })),
      startDate: s.startDate || '', endDate: s.endDate || '',
    });
    setError(''); setModal(s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.days.length) { setError('Selecciona al menos un día'); return; }
    if ((form.startDate && !form.endDate) || (!form.startDate && form.endDate)) {
      setError('Si indicas rango de fechas, debes rellenar tanto inicio como fin'); return;
    }
    try {
      const payload = {
        name: form.name, startTime: form.startTime, endTime: form.endTime,
        days: form.days, subShifts: form.subShifts.filter(ss => ss.time),
        startDate: form.startDate || null, endDate: form.endDate || null,
      };
      if (modal === 'create') await api.post('/shifts', payload);
      else                    await api.put(`/shifts/${modal._id}`, payload);
      await load(); setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este turno?')) return;
    await api.delete(`/shifts/${id}`); load();
  };

  const toggleDay    = (v) => setForm(f => ({ ...f, days: f.days.includes(v) ? f.days.filter(d => d !== v) : [...f.days, v] }));
  const addSubShift  = ()  => setForm(f => ({ ...f, subShifts: [...f.subShifts, { time: '', label: '' }] }));
  const rmSubShift   = (i) => setForm(f => ({ ...f, subShifts: f.subShifts.filter((_, idx) => idx !== i) }));
  const updSubShift  = (i, key, val) => setForm(f => ({
    ...f, subShifts: f.subShifts.map((ss, idx) => idx === i ? { ...ss, [key]: val } : ss),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {shifts.length} turno{shifts.length !== 1 ? 's' : ''} configurado{shifts.length !== 1 ? 's' : ''}
        </p>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <IconPlus /> Nuevo turno
        </button>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          text="Sin turnos configurados"
          onAction={openCreate}
          actionLabel="Crear el primer turno"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift, idx) => {
            const clr = colorOf(idx);
            const isSpecific = !!(shift.startDate && shift.endDate);
            return (
              <div key={shift._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                {/* Name + time range */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`} />
                    <h3 className="font-semibold text-gray-900 truncate">{shift.name}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${clr.bg} ${clr.text}`}>
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>

                {/* Specific badge */}
                {isSpecific && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Específico</span>
                    <span className="opacity-70">{fmtDate(shift.startDate)} – {fmtDate(shift.endDate)}</span>
                  </div>
                )}

                {/* Day pills */}
                <div className="flex gap-1">
                  {DAYS.map(d => (
                    <span key={d.value} title={d.full}
                      className={`w-6 h-6 rounded-md text-[9px] flex items-center justify-center font-bold ${
                        shift.days?.includes(d.value) ? `${clr.bg} ${clr.text}` : 'bg-gray-100 text-gray-300'
                      }`}>
                      {d.label}
                    </span>
                  ))}
                </div>

                {/* Sub-shifts */}
                {shift.subShifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shift.subShifts.map((ss, i) => (
                      <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${clr.bg} ${clr.border} ${clr.text}`}>
                        <IconClock /> {ss.time}
                        {ss.label && <span className="opacity-60">· {ss.label}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Franjas de 30 min automáticas</p>
                )}

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button onClick={() => openEdit(shift)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 font-medium transition-colors">
                    <IconEdit /> Editar
                  </button>
                  <button onClick={() => handleDelete(shift._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 font-medium transition-colors">
                    <IconTrash /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'Nuevo turno' : 'Editar turno'}
          subtitle={modal !== 'create' ? modal.name : 'Configura el horario y los días del turno'}
          onClose={() => setModal(null)}
        >
          <ErrorBanner msg={error} />
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mediodía, Noche, Brunch..."
                className={inputCls} />
            </div>

            {/* Time range */}
            <div>
              <label className={labelCls}>Horario *</label>
              <div className="flex items-center gap-2">
                <input type="time" required value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className={`${inputCls} flex-1`} />
                <span className="text-gray-400 text-sm font-medium shrink-0">hasta</span>
                <input type="time" required value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className={`${inputCls} flex-1`} />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className={labelCls}>Días activos *</label>
              <div className="flex gap-1.5">
                {DAYS.map(d => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      form.days.includes(d.value)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional date range (specific shift) */}
            <div>
              <label className={labelCls}>
                Rango de fechas
                <span className="text-gray-400 font-normal ml-1 text-xs">(opcional — deja vacío para turno general)</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="date" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={`${inputCls} flex-1`} />
                <span className="text-gray-400 text-sm font-medium shrink-0">hasta</span>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={`${inputCls} flex-1`} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Un turno específico tiene prioridad sobre el turno general con el mismo nombre en ese período.
              </p>
            </div>

            {/* Optional specific slots */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <label className={`${labelCls} mb-0`}>Horarios específicos</label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Opcional — sin horarios se generan franjas de 30 min dentro del rango
                  </p>
                </div>
                <button type="button" onClick={addSubShift}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold shrink-0 ml-2 mt-0.5">
                  <IconPlus /> Añadir
                </button>
              </div>
              {form.subShifts.length > 0 && (
                <div className="space-y-2">
                  {form.subShifts.map((ss, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
                        <IconClock />
                        <input type="time" required value={ss.time}
                          onChange={e => updSubShift(i, 'time', e.target.value)}
                          className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none w-24" />
                        <span className="text-gray-300 shrink-0">·</span>
                        <input type="text" value={ss.label}
                          onChange={e => updSubShift(i, 'label', e.target.value)}
                          placeholder="Etiqueta (ej: Primera noche)"
                          className="text-sm text-gray-500 bg-transparent focus:outline-none flex-1 min-w-0" />
                      </div>
                      <button type="button" onClick={() => rmSubShift(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition-colors shrink-0">
                        <IconX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {modal === 'create' ? 'Crear turno' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VACACIONES SECTION
// ═══════════════════════════════════════════════════════════════════════════
function VacacionesSection() {
  const [vacations, setVacations] = useState([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => { const r = await api.get('/vacations'); setVacations(r.data); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/vacations', form);
      setForm({ startDate: '', endDate: '', reason: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este período de cierre?')) return;
    await api.delete(`/vacations/${id}`); load();
  };

  const fmtRange = (startDate, endDate) => {
    const fmt = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = vacations.filter(v => v.endDate >= today);
  const past     = vacations.filter(v => v.endDate < today);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Añadir período de cierre</h3>
        <ErrorBanner msg={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha inicio *</label>
              <input type="date" required value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha fin *</label>
              <input type="date" required value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Motivo <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Vacaciones de verano, obras, festivo..."
              className={inputCls} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            <IconPlus /> Añadir cierre
          </button>
        </form>
      </div>

      {/* Upcoming closures */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Próximos cierres</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {upcoming.map(v => (
              <div key={v._id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-500">
                      <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fmtRange(v.startDate, v.endDate)}</p>
                    {v.reason && <p className="text-xs text-gray-400 mt-0.5">{v.reason}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(v._id)}
                  className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                >
                  <IconTrash /> Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past closures */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Cierres pasados</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden opacity-60">
            {past.map(v => (
              <div key={v._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm text-gray-600">{fmtRange(v.startDate, v.endDate)}</p>
                  {v.reason && <p className="text-xs text-gray-400 mt-0.5">{v.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(v._id)}
                  className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors"
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {vacations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Sin períodos de cierre configurados</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO SECTION
// ═══════════════════════════════════════════════════════════════════════════
function PublicoSection() {
  const { business, refreshBusiness } = useAuth();
  const [brandColor, setBrandColor] = useState(business?.brandColor || '#3B82F6');
  const [maxReservationPeople, setMaxReservationPeople] = useState(business?.maxReservationPeople || 20);
  const [maxPeoplePerSlot, setMaxPeoplePerSlot] = useState(business?.maxPeoplePerSlot || '');
  const [saving, setSaving] = useState(false);
  const publicUrl = `${window.location.origin}/public/${business?.id}/reserve`;

  useEffect(() => {
    if (business?.brandColor) setBrandColor(business.brandColor);
    if (business?.maxReservationPeople) setMaxReservationPeople(business.maxReservationPeople);
    setMaxPeoplePerSlot(business?.maxPeoplePerSlot || '');
  }, [business]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    // Podrías añadir un toast aquí
  };

  const handleColorChange = async (newColor) => {
    setBrandColor(newColor);
    setSaving(true);
    try {
      await api.put('/auth/settings', { brandColor: newColor });
      await refreshBusiness(); // Refresh business data after successful update
    } catch (err) {
      console.error('Error updating brand color:', err);
      // Revert on error
      setBrandColor(business?.brandColor || '#3B82F6');
    } finally {
      setSaving(false);
    }
  };

  const handleMaxPeopleChange = async (newMax) => {
    const numValue = Number(newMax);
    if (numValue < 1) return;
    setMaxReservationPeople(numValue);
    setSaving(true);
    try {
      await api.put('/auth/settings', { maxReservationPeople: numValue });
      await refreshBusiness();
    } catch (err) {
      console.error('Error updating max reservation people:', err);
      setMaxReservationPeople(business?.maxReservationPeople || 20);
    } finally {
      setSaving(false);
    }
  };

  const handleMaxPeoplePerSlotChange = async (newMax) => {
    const val = newMax === '' ? null : Number(newMax);
    if (val !== null && val < 1) return;
    setMaxPeoplePerSlot(newMax);
    setSaving(true);
    try {
      await api.put('/auth/settings', { maxPeoplePerSlot: val });
      await refreshBusiness();
    } catch (err) {
      console.error('Error updating max people per slot:', err);
      setMaxPeoplePerSlot(business?.maxPeoplePerSlot || '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Color Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Color Corporativo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Personaliza el color principal que se mostrará en la página de reservas públicas.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Color seleccionado</p>
              <p className="text-xs text-gray-500 uppercase font-mono">{brandColor}</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              Guardando...
            </div>
          )}
        </div>
        <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <button
            className="px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: brandColor }}
          >
            Reservar Mesa
          </button>
        </div>
      </div>

      {/* Maximum Reservation People Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Máximo de Personas por Reserva</h3>
        <p className="text-sm text-gray-600 mb-4">
          Establece el número máximo de personas que pueden hacer una reserva en una sola solicitud.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={maxReservationPeople}
              onChange={(e) => handleMaxPeopleChange(e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">personas máximo</p>
              <p className="text-xs text-gray-500">Por reserva individual</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              Guardando...
            </div>
          )}
        </div>
      </div>

      {/* Max People Per Slot */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Máximo de Personas por Turno</h3>
          <div className="relative group">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center cursor-default select-none font-bold">i</span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
              Número máximo de personas que pueden tener reserva en el mismo horario. Si se alcanza este límite, ese turno no aparecerá en la reserva pública.
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Deja vacío para no establecer límite por turno.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              placeholder="Sin límite"
              value={maxPeoplePerSlot}
              onChange={(e) => handleMaxPeoplePerSlotChange(e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">personas máximo</p>
              <p className="text-xs text-gray-500">Por franja horaria simultánea</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              Guardando...
            </div>
          )}
        </div>
      </div>

      {/* Public URL */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">URL Pública para Reservas</h3>
        <p className="text-sm text-gray-600 mb-4">
          Comparte esta URL con tus clientes para que puedan hacer reservas online directamente.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Los clientes podrán seleccionar fecha, hora, número de personas y proporcionar sus datos de contacto.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'salas',      label: 'Salas'      },
  { key: 'mesas',      label: 'Mesas'      },
  { key: 'turnos',     label: 'Turnos'     },
  { key: 'vacaciones', label: 'Vacaciones' },
  { key: 'publico',    label: 'Público'    },
];

export default function Settings() {
  const [tab, setTab] = useState('salas');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configuración</h2>
        <p className="text-sm text-gray-400 mt-0.5">Gestiona las salas, mesas, turnos y cierres de tu restaurante</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-max sm:w-fit min-w-full sm:min-w-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-100 whitespace-nowrap ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'salas'      && <SalasSection />}
      {tab === 'mesas'      && <MesasSection />}
      {tab === 'turnos'     && <TurnosSection />}
      {tab === 'vacaciones' && <VacacionesSection />}
      {tab === 'publico'    && <PublicoSection />}
    </div>
  );
}
