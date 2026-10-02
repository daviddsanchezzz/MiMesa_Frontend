import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { TablePreview } from '../../floor/Glyphs';
import { roomIdOf, shapeOf } from '../../floor/geometry';

/**
 * Configuración → Mesas y salas: what you have, room by room, and the way into
 * the plan, where tables and rooms are created and drawn.
 */
export default function TablesSummary() {
  const tablesQ = useData(['tables'], () => api.get('/tables').then((r) => r.data || []));
  const roomsQ = useData(['rooms'], () => api.get('/rooms').then((r) => r.data || []));
  const tables = (tablesQ.data || []).filter((t) => !t.isLocked);
  const rooms = roomsQ.data || [];
  const groups = [
    ...rooms.map((r) => ({ id: r._id, name: r.name, list: tables.filter((t) => roomIdOf(t) === r._id) })),
    { id: 'none', name: 'Sin sala', list: tables.filter((t) => !roomIdOf(t)) },
  ].filter((g) => g.id !== 'none' || g.list.length);
  const seats = tables.reduce((s, t) => s + (Number(t.capacity) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <b className="text-gray-900">{tables.length}</b> mesas · <b className="text-gray-900">{seats}</b> plazas · <b className="text-gray-900">{rooms.length}</b> {rooms.length === 1 ? 'sala' : 'salas'}
        </p>
        <Link to="/tables" className="inline-flex items-center h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">
          {tables.length ? 'Abrir el plano' : 'Dibujar el plano'}
        </Link>
      </div>
      {tablesQ.isPending ? <p className="text-sm text-gray-400">Cargando…</p> : groups.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay mesas. En el plano creas las salas, colocas las mesas y dibujas la barra, la entrada…</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {groups.map((g) => (
            <li key={g.id} className="py-3 flex items-center gap-4">
              <div className="min-w-0 w-40 shrink-0">
                <p className="text-[15px] font-medium text-gray-900 truncate">{g.name}</p>
                <p className="text-[13px] text-gray-500">{g.list.length} mesas · {g.list.reduce((s, t) => s + (Number(t.capacity) || 0), 0)} plazas</p>
              </div>
              <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                {g.list.slice(0, 18).map((t) => (
                  <span key={t._id} className="inline-flex items-center gap-1 h-8 pl-1 pr-2.5 rounded-full bg-gray-50 text-[13px] text-gray-700">
                    <TablePreview shape={shapeOf(t)} capacity={Math.min(Number(t.capacity) || 2, 8)} size={26} />
                    <b className="font-semibold">{t.name}</b><span className="text-gray-400 tabular-nums">{t.capacity}</span>
                  </span>
                ))}
                {g.list.length > 18 && <span className="text-[13px] text-gray-400 self-center">+{g.list.length - 18}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
