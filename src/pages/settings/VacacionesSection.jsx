import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ErrorBanner, IconPlus, IconTrash, inputCls, labelCls } from './shared';
import { dateYear } from '../../lib/format';
import { confirmDialog } from '../../ui/confirm';
import { Avatar, List, ListRow } from '../../ui/list';

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
    if (!await confirmDialog('¿Eliminar este período de cierre?')) return;
    await api.delete(`/vacations/${id}`); load();
  };

  const fmtRange = (startDate, endDate) => {
    const fmt = dateYear;
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
          Has alcanzado el límite de {planLimit('maxVacations')} período{planLimit('maxVacations') !== 1 ? 's' : ''} de cierre de tu plan actual. Elimina uno existente para añadir otro.
        </div>
      ) : (
        <div className="pb-5 border-b border-gray-100">
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
          <List>
            {upcoming.map(v => (
              <ListRow key={v._id}
                leading={<Avatar icon="calendar" size={32} color={{ bg: "#fffbeb", fg: "#f59e0b" }} />}
                title={fmtRange(v.startDate, v.endDate)}
                subtitle={v.reason || undefined}
                trailing={(
                  <button onClick={() => handleDelete(v._id)}
                    className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors">
                    <IconTrash /> Eliminar
                  </button>
                )} />
            ))}
          </List>
        </div>
      )}

      {/* Past closures */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Cierres pasados</h3>
          <List className="opacity-60">
            {past.map(v => (
              <ListRow key={v._id} muted title={fmtRange(v.startDate, v.endDate)} subtitle={v.reason || undefined}
                trailing={(
                  <button onClick={() => handleDelete(v._id)}
                    className="flex items-center gap-1 text-xs py-1.5 px-2.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-medium transition-colors">
                    <IconTrash />
                  </button>
                )} />
            ))}
          </List>
        </div>
      )}

      {vacations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Sin períodos de cierre configurados</p>
        </div>
      )}
    </div>
  );
}
