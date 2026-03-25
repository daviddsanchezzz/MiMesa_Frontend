import { useState, useEffect } from 'react';
import api from '../services/api';

function StatBox({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(r => setData(r.data))
      .catch(err => {
        if (err?.response?.status === 403) {
          setError('upgrade');
        } else {
          setError('generic');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const topPeakHours = data?.peakHours?.slice(0, 5) || [];
  const topDays = data?.busyDays?.slice(0, 5) || [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-400 mt-0.5">Resumen de los últimos 30 días.</p>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
      )}

      {!loading && error === 'upgrade' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-500">
              <path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.061a.75.75 0 0 1 1.06 0ZM3 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 10ZM14.75 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM6.172 13.768a.75.75 0 0 1 0 1.06L5.11 15.89a.75.75 0 0 1-1.06-1.06l1.06-1.062a.75.75 0 0 1 1.061 0ZM13.829 13.768a.75.75 0 0 1 1.06 0l1.062 1.061a.75.75 0 0 1-1.061 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM10 15.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Función no disponible en tu plan</p>
          <p className="text-sm text-gray-400">Actualiza tu suscripción para acceder a analytics avanzados.</p>
        </div>
      )}

      {!loading && error === 'generic' && (
        <div className="py-16 text-center text-sm text-gray-400">Error al cargar los datos.</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatBox label="Reservas" value={data.summary?.totalReservations ?? 0} sub="últimos 30 días" />
            <StatBox label="Cancelaciones" value={data.summary?.cancellations ?? 0} sub={`${data.summary?.cancelRatePct ?? 0}% del total`} />
            <StatBox label="No-show" value={data.summary?.noShows ?? 0} />
            <StatBox label="Cancel ratio" value={`${data.summary?.cancelRatePct ?? 0}%`} />
          </div>

          {topPeakHours.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Horas pico</h3>
              <div className="space-y-2">
                {topPeakHours.map((h) => {
                  const max = topPeakHours[0]?.reservations || 1;
                  const pct = Math.round((h.reservations / max) * 100);
                  return (
                    <div key={h.time} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 shrink-0 font-medium">{h.time}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{h.reservations}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {topDays.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Días más ocupados</h3>
              <div className="space-y-2">
                {topDays.map((d) => {
                  const max = topDays[0]?.reservations || 1;
                  const pct = Math.round((d.reservations / max) * 100);
                  return (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0 font-medium capitalize">{d.day}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{d.reservations}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
