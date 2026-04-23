import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

function StatCard({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone] || tones.gray}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold leading-tight mt-1">{value}</p>
    </div>
  );
}

function statusBadge(status) {
  if (status === 'seated') return 'bg-emerald-100 text-emerald-700';
  if (status === 'confirmed') return 'bg-violet-100 text-violet-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-600';
  if (status === 'no_show') return 'bg-rose-100 text-rose-700';
  return 'bg-gray-100 text-gray-600';
}

function statusLabel(status) {
  if (status === 'seated') return 'Sentada';
  if (status === 'confirmed') return 'Confirmada';
  if (status === 'pending') return 'Pendiente';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'no_show') return 'No-show';
  return status || '-';
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [vipDraft, setVipDraft] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/customers/${id}`);
      setCustomer(data.customer || null);
      setSummary(data.summary || null);
      setReservations(Array.isArray(data.reservations) ? data.reservations : []);
      setNotesDraft(data.customer?.notes || '');
      setVipDraft(Boolean(data.customer?.vip));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la ficha del cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const contactLine = useMemo(() => {
    if (!customer) return '';
    if (customer.phone && customer.email) return `${customer.phone} · ${customer.email}`;
    return customer.phone || customer.email || 'Sin datos de contacto';
  }, [customer]);

  const saveCustomerMeta = async () => {
    if (!customer?._id || saving) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/customers/${customer._id}`, {
        notes: notesDraft,
        vip: vipDraft,
      });
      setCustomer((prev) => ({ ...(prev || {}), ...data }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la ficha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/customers')}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
        <h2 className="text-xl font-bold text-gray-900">Ficha de cliente</h2>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-500">
          Cargando cliente...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && customer && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                  {vipDraft && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{contactLine}</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={vipDraft}
                  onChange={(e) => setVipDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Marcar VIP
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <StatCard label="Total reservas" value={summary?.totalReservations ?? 0} tone="gray" />
              <StatCard label="Sentadas" value={summary?.seated ?? 0} tone="emerald" />
              <StatCard label="Confirmadas" value={summary?.confirmed ?? 0} tone="violet" />
              <StatCard label="Pendientes" value={summary?.pending ?? 0} tone="amber" />
              <StatCard label="Canceladas" value={summary?.cancelled ?? 0} tone="gray" />
              <StatCard label="No-show" value={summary?.noShow ?? 0} tone="rose" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas del cliente</label>
              <textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Añade notas internas sobre este cliente"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveCustomerMeta}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Historial de reservas</h3>
            </div>
            {reservations.length === 0 ? (
              <div className="px-5 py-10 text-sm text-gray-500">Este cliente aún no tiene reservas enlazadas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hora</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pax</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sala/Mesa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r, index) => {
                      const roomName = r?.roomId?.name || r?.tableId?.roomId?.name || '-';
                      const tables = Array.isArray(r?.tableIds) && r.tableIds.length > 0
                        ? r.tableIds.map((t) => t?.name).filter(Boolean).join(', ')
                        : (r?.tableId?.name || '-');
                      return (
                        <tr key={r._id} className={index < reservations.length - 1 ? 'border-b border-gray-50' : ''}>
                          <td className="px-5 py-3.5 text-gray-800">{r.date}</td>
                          <td className="px-4 py-3.5 text-gray-800">{r.time || '-'}</td>
                          <td className="px-4 py-3.5 text-gray-700">{r.people || 0}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>
                              {statusLabel(r.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">
                            <p>{roomName}</p>
                            <p className="text-xs text-gray-400">{tables}</p>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs max-w-[260px]">
                            <p className="truncate">{r.notes || '-'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

