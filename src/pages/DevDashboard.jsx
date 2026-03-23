import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';



function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DevDashboard() {
  const { session, logout } = useAuth();

  const [tab, setTab] = useState('businesses');

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', phone: '', plan: 'free' });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [changingPlan, setChangingPlan] = useState(null);
  const [deleting, setDeleting]         = useState(null);

  const [inviteForm, setInviteForm]     = useState({ name: '', email: '' });
  const [inviting, setInviting]         = useState(false);
  const [inviteError, setInviteError]   = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dev/businesses');
      setBusinesses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = businesses.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
    const matchP = planFilter === 'all' || b.plan === planFilter;
    return matchQ && matchP;
  });

  const totalReservations30d = businesses.reduce((s, b) => s + b.reservationsLast30d, 0);
  const paidCount = businesses.filter(b => b.plan !== 'free').length;

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/dev/businesses', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', plan: 'free' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = async (id, plan) => {
    setChangingPlan(id);
    try {
      await api.patch(`/dev/businesses/${id}/plan`, { plan });
      setBusinesses(bs => bs.map(b => b.id === id ? { ...b, plan } : b));
    } finally {
      setChangingPlan(null);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteResult(null);
    setCopied(false);
    setInviting(true);
    try {
      const { data } = await api.post('/dev/invite-user', inviteForm);
      setInviteResult({ email: data.email, inviteLink: data.inviteLink });
      setInviteForm({ name: '', email: '' });
    } catch (err) {
      setInviteError(err.response?.data?.message || err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/dev/businesses/${id}`);
      setBusinesses(bs => bs.filter(b => b.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded">DEV</span>
          <span className="text-sm font-semibold tracking-tight">Tableo Console</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-xs text-slate-400 hidden sm:block">{session?.user?.email}</span>
          <button onClick={logout} className="text-xs text-slate-400 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {[
            { id: 'businesses', label: 'Negocios' },
            { id: 'users',      label: 'Usuarios' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">

        {tab === 'businesses' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Negocios totales"   value={businesses.length} />
              <StatCard label="Con plan de pago"   value={paidCount} sub={`${businesses.length - paidCount} en free`} />
              <StatCard label="Reservas (30 días)" value={totalReservations30d} />
              <StatCard label="Total reservas"     value={businesses.reduce((s, b) => s + b.totalReservations, 0)} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">Todos los planes</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
                </svg>
                Nuevo negocio
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="py-20 text-center text-sm text-gray-400">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-sm text-gray-400">Sin resultados</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Negocio</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Miembros</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reservas 30d</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alta</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-gray-900 truncate max-w-[180px]">{b.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{b.email}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={b.plan}
                              disabled={changingPlan === b.id}
                              onChange={e => handlePlanChange(b.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                            >
                              <option value="free">Free</option>
                              <option value="basic">Basic</option>
                              <option value="pro">Pro</option>
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-center text-gray-700">{b.memberCount}</td>
                          <td className="px-4 py-3.5 text-center text-gray-700">{b.reservationsLast30d}</td>
                          <td className="px-4 py-3.5 text-center text-gray-500">{b.totalReservations}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(b.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {deleting === b.id ? (
                              <span className="text-xs text-gray-400">Eliminando...</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar "${b.name}"? Esta acción no se puede deshacer.`)) {
                                    handleDelete(b.id);
                                  }
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Eliminar negocio"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd"/>
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-right">{filtered.length} de {businesses.length} negocios</p>
          </>
        )}

        {tab === 'users' && (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invitar usuario</h2>
            <p className="text-sm text-gray-500 mb-5">
              El usuario recibirá un email para activar su cuenta y crear su restaurante.
            </p>

            {inviteError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                {inviteError}
              </div>
            )}
            {inviteResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 mb-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  Invitación creada para {inviteResult.email}
                </p>
                <p className="text-xs text-green-700 mb-2">Copia el enlace y envíalo por WhatsApp o email:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteResult.inviteLink}
                    className="flex-1 text-xs bg-white border border-green-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none truncate"
                    onClick={e => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult.inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleInviteUser} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input
                  required value={inviteForm.name}
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Juan García"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  required type="email" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="juan@restaurante.com"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="submit" disabled={inviting}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-900 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {inviting ? 'Enviando invitación...' : 'Enviar invitación'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* ── New business modal ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Nuevo negocio</h2>

            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input
                  required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Restaurante El Patio"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  required type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="info@restaurante.com"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <select
                  value={form.plan}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(''); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-900 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? 'Creando...' : 'Crear negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
