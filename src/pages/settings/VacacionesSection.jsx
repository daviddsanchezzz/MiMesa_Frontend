import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ErrorBanner, IconPlus, IconTrash, inputCls, labelCls } from './shared';

// ═══════════════════════════════════════════════════════════════════════════
// VACACIONES SECTION
// ═══════════════════════════════════════════════════════════════════════════
export function VacacionesSection() {
  const { planLimit } = useAuth();
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
      {upcoming.length >= planLimit('maxVacations') ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
          Has alcanzado el límite de {planLimit('maxVacations')} período{planLimit('maxVacations') !== 1 ? 's' : ''} de cierre del plan Free. Elimina uno existente para añadir otro.
        </div>
      ) : (
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
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              <IconPlus /> Añadir cierre
            </button>
          </form>
        </div>
      )}

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
