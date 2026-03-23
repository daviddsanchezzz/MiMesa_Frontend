import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ReservationForm from '../components/ReservationForm';

// ─── Status Badges ──────────────────────────────────────────────────────────
const statusBadge = {
  pending:   { label: 'Pendiente',  cls: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm' },
  confirmed: { label: 'Confirmada', cls: 'bg-gradient-to-r from-violet-400 to-violet-500 text-white shadow-sm' },
  seated:    { label: 'Sentada',    cls: 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm' },
  cancelled: { label: 'Cancelada',  cls: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm' },
};

const IcoCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
    <path d="M5.75 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM5 10.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM10.25 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM9.5 10.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM7.25 7.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM6.5 10.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z" />
    <path fillRule="evenodd" d="M4.75 1a.75.75 0 0 1 .75.75V3h5V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 15 5.75v7.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-7.5A2.75 2.75 0 0 1 3.75 3H4V1.75A.75.75 0 0 1 4.75 1ZM3.75 4.5c-.69 0-1.25.56-1.25 1.25V6h11v-.25c0-.69-.56-1.25-1.25-1.25H3.75ZM2.5 7.5v5.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V7.5h-11Z" clipRule="evenodd" />
  </svg>
);
const IcoCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
  </svg>
);
const IcoTable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v5.75A2.75 2.75 0 0 1 9.25 12H4.75A2.75 2.75 0 0 1 2 9.25V3.5h-.25A.75.75 0 0 1 1 2.75ZM3.5 3.5v5.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5h-7ZM6.25 13a.75.75 0 0 0-1.5 0v.25h-.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-.5V13a.75.75 0 0 0-1.5 0v.25h-3.5V13Z" clipRule="evenodd" />
  </svg>
);
const IcoLock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
  </svg>
);

function StatCard({ label, value, icon, color, bg, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-0.5 ${color}`}>{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function Avatar({ name }) {
  const colors = ['bg-violet-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadData = () => {
    api.get(`/reservations?date=${today}`).then(r => setReservations(r.data));
    api.get('/tables').then(r => setTables(r.data));
    setAnalyticsLoading(true);
    api.get('/analytics/overview')
      .then((r) => {
        setAnalytics(r.data);
        setAnalyticsEnabled(true);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setAnalyticsEnabled(false);
          return;
        }
        console.error('Error loading analytics:', err);
      })
      .finally(() => setAnalyticsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNewReservationClick = () => {
    const isSmallScreen = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    if (isSmallScreen) {
      setShowCreateModal(true);
      return;
    }
    navigate('/reservations');
  };

  const free     = tables.filter(t => t.status === 'free').length;
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const reserved = tables.filter(t => t.status === 'reserved').length;
  const upcoming = reservations.filter(r => r.status === 'confirmed');

  const total = tables.length || 1;
  const pctFree     = Math.round((free / total) * 100);
  const pctReserved = Math.round((reserved / total) * 100);
  const pctOccupied = Math.round((occupied / total) * 100);
  const topPeakHours = analytics?.peakHours?.slice(0, 3) || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Hola, <span className="text-violet-600">{business?.name}</span>
          </h2>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <button
          type="button"
          onClick={handleNewReservationClick}
          className="shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span className="hidden sm:inline">Nueva reserva</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Reservas hoy"     value={reservations.length} icon={<IcoCalendar />} color="text-violet-600"  bg="bg-violet-50"  to="/reservations" />
        <StatCard label="Mesas libres"     value={free}                icon={<IcoCheck />}    color="text-emerald-600" bg="bg-emerald-50" to="/tables" />
        <StatCard label="Mesas ocupadas"   value={occupied}            icon={<IcoTable />}    color="text-rose-600"    bg="bg-rose-50"    to="/tables" />
        <StatCard label="Mesas reservadas" value={reserved}            icon={<IcoLock />}     color="text-amber-600"   bg="bg-amber-50"   to="/tables" />
      </div>

      {/* Occupancy bar */}
      {tables.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Ocupación de mesas</h3>
            <span className="text-xs text-gray-400">{tables.length} mesas en total</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 gap-0.5 bg-gray-100">
            {pctOccupied > 0 && <div className="bg-rose-400 transition-all" style={{ width: `${pctOccupied}%` }} />}
            {pctReserved > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${pctReserved}%` }} />}
            {pctFree > 0     && <div className="bg-emerald-400 transition-all" style={{ width: `${pctFree}%` }} />}
          </div>
          <div className="flex items-center gap-5 mt-3">
            {[
              { label: 'Ocupadas',   pct: pctOccupied, dot: 'bg-rose-400' },
              { label: 'Reservadas', pct: pctReserved, dot: 'bg-amber-400' },
              { label: 'Libres',     pct: pctFree,     dot: 'bg-emerald-400' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                <span className="text-xs text-gray-500">{l.label} {l.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analyticsEnabled && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Analytics (30 días)</h3>
            {analyticsLoading && <span className="text-xs text-gray-400">Cargando...</span>}
          </div>
          {!analyticsLoading && analytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Reservas</p>
                  <p className="text-lg font-bold text-gray-900">{analytics.summary?.totalReservations ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Cancelaciones</p>
                  <p className="text-lg font-bold text-gray-900">{analytics.summary?.cancellations ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">No-show</p>
                  <p className="text-lg font-bold text-gray-900">{analytics.summary?.noShows ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Cancel ratio</p>
                  <p className="text-lg font-bold text-gray-900">{analytics.summary?.cancelRatePct ?? 0}%</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Horas pico:</span>
                {topPeakHours.length === 0 ? (
                  <span className="text-xs text-gray-400">Sin datos</span>
                ) : topPeakHours.map((h) => (
                  <span key={h.time} className="text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    {h.time} · {h.reservations}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming reservations */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Próximas reservas de hoy</h3>
          <Link to="/reservations" className="text-xs text-violet-600 hover:text-violet-700 font-medium">Ver todas →</Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-6 h-6 text-gray-300">
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Sin reservas pendientes para hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((r) => {
              const s = statusBadge[r.status];
              return (
                <div key={r._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <Avatar name={r.guestName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.guestName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.time} · {r.people} {r.people === 1 ? 'persona' : 'personas'}
                      {r.tableId && <span className="text-gray-300"> · </span>}
                      {r.tableId && <span className="text-violet-500">{r.tableId.name}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <Modal
          title="Nueva reserva"
          subtitle="Crea una nueva reserva"
          onClose={() => setShowCreateModal(false)}
        >
          <ReservationForm
            onSave={() => {
              setShowCreateModal(false);
              loadData();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
