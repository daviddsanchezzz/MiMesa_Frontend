import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
        active
          ? 'bg-violet-600 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function planPillClass(plan) {
  if (plan === 'pro') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (plan === 'basic') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function MobileBusinessCard({ b, changingPlan, deleting, onPlanChange, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div>
        <p className="font-semibold text-gray-900">{b.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{b.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${planPillClass(b.plan)}`}>
          {b.plan}
        </span>
        <select
          value={b.plan}
          disabled={changingPlan === b.id}
          onChange={(e) => onPlanChange(b.id, e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        >
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 border border-gray-100 py-2">
          <p className="text-[11px] text-gray-500">Miembros</p>
          <p className="text-sm font-semibold text-gray-900">{b.memberCount}</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 py-2">
          <p className="text-[11px] text-gray-500">30d</p>
          <p className="text-sm font-semibold text-gray-900">{b.reservationsLast30d}</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 py-2">
          <p className="text-[11px] text-gray-500">Total</p>
          <p className="text-sm font-semibold text-gray-900">{b.totalReservations}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Alta: {new Date(b.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        {deleting === b.id ? (
          <span className="text-xs text-gray-400">Eliminando...</span>
        ) : (
          <button
            onClick={() => onDelete(b.id, b.name)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export default function DevDashboard() {
  const { session, logout } = useAuth();

  const [tab, setTab] = useState('businesses');

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', plan: 'free' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [changingPlan, setChangingPlan] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dev/businesses');
      setBusinesses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    const matchQ = !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
    const matchP = planFilter === 'all' || b.plan === planFilter;
    return matchQ && matchP;
  });

  const totalReservations30d = businesses.reduce((s, b) => s + b.reservationsLast30d, 0);
  const paidCount = businesses.filter((b) => b.plan !== 'free').length;

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
      setBusinesses((bs) => bs.map((b) => (b.id === id ? { ...b, plan } : b)));
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Eliminar "${name}"? Esta accion no se puede deshacer.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/dev/businesses/${id}`);
      setBusinesses((bs) => bs.filter((b) => b.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">DEV</span>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Panel de desarrollo</h2>
            </div>
            <p className="text-sm text-gray-500">Administración interna de negocios y usuarios.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-gray-500">{session?.user?.email}</span>
            <button
              onClick={logout}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <TabButton active={tab === 'businesses'} onClick={() => setTab('businesses')}>Negocios</TabButton>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Usuarios</TabButton>
        </div>
      </div>

      {tab === 'businesses' && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard label="Negocios" value={businesses.length} />
            <StatCard label="De pago" value={paidCount} sub={`${businesses.length - paidCount} en free`} />
            <StatCard label="Reservas 30d" value={totalReservations30d} />
            <StatCard label="Reservas totales" value={businesses.reduce((s, b) => s + b.totalReservations, 0)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Todos los planes</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Nuevo negocio
            </button>
          </div>

          <div className="sm:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center text-sm text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center text-sm text-gray-400">Sin resultados</div>
            ) : (
              filtered.map((b) => (
                <MobileBusinessCard
                  key={b.id}
                  b={b}
                  changingPlan={changingPlan}
                  deleting={deleting}
                  onPlanChange={handlePlanChange}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-14 text-center text-sm text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">Sin resultados</div>
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
                    {filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 truncate max-w-[200px]">{b.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{b.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${planPillClass(b.plan)}`}>
                              {b.plan}
                            </span>
                            <select
                              value={b.plan}
                              disabled={changingPlan === b.id}
                              onChange={(e) => handlePlanChange(b.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                            >
                              <option value="free">Free</option>
                              <option value="basic">Basic</option>
                              <option value="pro">Pro</option>
                            </select>
                          </div>
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
                              onClick={() => handleDelete(b.id, b.name)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              Eliminar
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
          <p className="text-xs text-gray-400 text-right">{filtered.length} de {businesses.length} negocios</p>
        </>
      )}

      {tab === 'users' && (
        <div className="max-w-xl">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Invitar usuario</h3>
              <p className="text-sm text-gray-500 mt-0.5">Se envia un email con enlace de activacion.</p>
            </div>

            {inviteError && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                {inviteError}
              </div>
            )}

            {inviteResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Invitacion creada para {inviteResult.email}</p>
                <p className="text-xs text-emerald-700 mb-2">Copia el enlace para compartirlo:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteResult.inviteLink}
                    className="flex-1 text-xs bg-white border border-emerald-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none truncate"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult.inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Juan Garcia"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="juan@restaurante.com"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {inviting ? 'Enviando invitacion...' : 'Enviar invitacion'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <Modal
          title="Nuevo negocio"
          subtitle="Crea un negocio de prueba para desarrollo"
          onClose={() => {
            if (saving) return;
            setShowModal(false);
            setFormError('');
          }}
          size="md"
        >
          {formError && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Restaurante El Patio"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@restaurante.com"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+34 600 000 000"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFormError('');
                }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Creando...' : 'Crear negocio'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
