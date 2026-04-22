import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function planPillClass(plan) {
  if (plan === 'pro') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (plan === 'basic') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

const IconBriefcase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
    <path fillRule="evenodd" d="M6 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h2.25A1.75 1.75 0 0 1 18 6.75v8.5A1.75 1.75 0 0 1 16.25 17H3.75A1.75 1.75 0 0 1 2 15.25v-8.5A1.75 1.75 0 0 1 3.75 5H6Zm1.5 0h5V4a.5.5 0 0 0-.5-.5H8a.5.5 0 0 0-.5.5v1Z" clipRule="evenodd" />
  </svg>
);

const IconCurrencyEuro = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
    <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7ZM3.25 8A2.25 2.25 0 0 0 1 10.25v4.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-4.5A2.25 2.25 0 0 0 16.75 8H3.25Z" />
  </svg>
);

function ModuleIcon({ moduleKey }) {
  if (moduleKey === 'staff') return <IconBriefcase />;
  if (moduleKey === 'expenses') return <IconCurrencyEuro />;
  return null;
}

function MobileBusinessCard({ b, moduleCatalog, onEdit }) {
  const activeModules = moduleCatalog.filter((m) => !!b.modules?.[m.key]?.enabled);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div>
        <p className="font-semibold text-gray-900">{b.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{b.email}</p>
      </div>

      <div className="flex items-center">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${planPillClass(b.plan)}`}>
          {b.plan}
        </span>
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

      {moduleCatalog.length > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2 space-y-1">
          <p className="text-[11px] text-gray-500">Modulos</p>
          {activeModules.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeModules.map((m) => (
                <span
                  key={m.key}
                  title={m.name}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700"
                >
                  <ModuleIcon moduleKey={m.key} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Alta: {new Date(b.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <button
          onClick={() => onEdit(b)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

function rolePillClass(role) {
  if (role === 'owner') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (role === 'manager') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function DevDashboard() {
  const [searchParams] = useSearchParams();

  const tab = searchParams.get('tab') === 'users' ? 'users' : 'businesses';

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', plan: 'free' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editPlan, setEditPlan] = useState('free');
  const [editModules, setEditModules] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [users, setUsers] = useState([]);
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, { data: modules }] = await Promise.all([
        api.get('/dev/businesses'),
        api.get('/dev/modules/catalog'),
      ]);
      setBusinesses(data);
      setModuleCatalog(modules || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get('/dev/users');
      setUsers(data || []);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'users') return;
    loadUsers();
  }, [tab, loadUsers]);

  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    const matchQ = !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
    const matchP = planFilter === 'all' || b.plan === planFilter;
    return matchQ && matchP;
  });

  const totalReservations30d = businesses.reduce((s, b) => s + b.reservationsLast30d, 0);
  const paidCount = businesses.filter((b) => b.plan !== 'free').length;
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/dev/businesses', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', plan: 'free' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const openBusinessEditor = (business) => {
    setEditingBusiness(business);
    setEditPlan(business.plan || 'free');
    const modulesState = {};
    moduleCatalog.forEach((m) => {
      modulesState[m.key] = !!business.modules?.[m.key]?.enabled;
    });
    setEditModules(modulesState);
    setEditError('');
  };

  const closeBusinessEditor = () => {
    if (editSaving) return;
    setEditingBusiness(null);
    setEditError('');
  };

  const handleEditModuleToggle = (moduleKey) => {
    setEditModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const saveBusinessChanges = async () => {
    if (!editingBusiness) return;
    setEditSaving(true);
    setEditError('');
    try {
      if (editPlan !== editingBusiness.plan) {
        await api.patch(`/dev/businesses/${editingBusiness.id}/plan`, { plan: editPlan });
      }

      const moduleChanges = moduleCatalog.filter((m) => {
        const currentEnabled = !!editingBusiness.modules?.[m.key]?.enabled;
        const nextEnabled = !!editModules[m.key];
        return currentEnabled !== nextEnabled;
      });

      for (const m of moduleChanges) {
        await api.patch(`/dev/businesses/${editingBusiness.id}/modules/${m.key}`, {
          enabled: !!editModules[m.key],
        });
      }

      setBusinesses((prev) => prev.map((b) => {
        if (b.id !== editingBusiness.id) return b;
        return {
          ...b,
          plan: editPlan,
          modules: {
            ...(b.modules || {}),
            ...Object.fromEntries(moduleCatalog.map((m) => [
              m.key,
              {
                ...(b.modules?.[m.key] || {}),
                enabled: !!editModules[m.key],
              },
            ])),
          },
        };
      }));

      setEditingBusiness(null);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'No se pudo guardar');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
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
                  moduleCatalog={moduleCatalog}
                  onEdit={openBusinessEditor}
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
                <table className="w-full min-w-[1060px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50/80">
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Negocio</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Modulos</th>
                      <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Miembros</th>
                      <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Reservas 30d</th>
                      <th className="text-center px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Alta</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 align-middle">
                          <p className="font-semibold text-gray-900 truncate max-w-[200px]">{b.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{b.email}</p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${planPillClass(b.plan)}`}>
                            {b.plan}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {moduleCatalog
                              .filter((m) => !!b.modules?.[m.key]?.enabled)
                              .map((m) => (
                                <span
                                  key={m.key}
                                  title={m.name}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700"
                                >
                                  <ModuleIcon moduleKey={m.key} />
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-800 font-medium tabular-nums align-middle">{b.memberCount}</td>
                        <td className="px-4 py-4 text-center text-gray-800 font-medium tabular-nums align-middle">{b.reservationsLast30d}</td>
                        <td className="px-4 py-4 text-center text-gray-600 tabular-nums align-middle">{b.totalReservations}</td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap align-middle">
                          {new Date(b.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4 text-right align-middle">
                          <button
                            onClick={() => openBusinessEditor(b)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Editar
                          </button>
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
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Listado de usuarios</h3>
                <p className="text-xs text-gray-500 mt-0.5">{filteredUsers.length} de {users.length} resultados</p>
              </div>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full sm:w-72 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="sm:hidden space-y-2">
            {usersLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center text-sm text-gray-400">Cargando usuarios...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center text-sm text-gray-400">Sin usuarios</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900">{u.name || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${rolePillClass(u.role)}`}>
                      {u.role}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {u.businessCount} negocio{u.businessCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {u.businesses.slice(0, 3).map((biz) => (
                      <p key={`${u.id}-${biz.businessId}`}>{biz.businessName} · {biz.role}</p>
                    ))}
                    {u.businesses.length > 3 && <p>+{u.businesses.length - 3} mas</p>}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="py-14 text-center text-sm text-gray-400">Cargando usuarios...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">Sin usuarios</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50/80">
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Usuario</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Rol global</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Negocios</th>
                      <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Alta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 align-middle">
                          <p className="font-semibold text-gray-900">{u.name || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${rolePillClass(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600 align-middle">
                          {u.businessCount === 0 ? (
                            <span className="text-gray-400">Sin membresia</span>
                          ) : (
                            <div className="space-y-1">
                              {u.businesses.slice(0, 2).map((biz) => (
                                <p key={`${u.id}-${biz.businessId}`} className="text-gray-700">
                                  {biz.businessName} <span className="text-gray-400">·</span> <span className="text-gray-500">{biz.role}</span>
                                </p>
                              ))}
                              {u.businesses.length > 2 && <p className="text-gray-400">+{u.businesses.length - 2} mas</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap align-middle">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {editingBusiness && (
        <Modal
          title={`Editar negocio: ${editingBusiness.name}`}
          subtitle="Ajusta plan y modulos. Fuera de este modal la vista es solo informativa."
          onClose={closeBusinessEditor}
          size="md"
        >
          {editError && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              {editError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                disabled={editSaving}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white disabled:opacity-60"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            {moduleCatalog.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Modulos</p>
                <div className="space-y-2">
                  {moduleCatalog.map((m) => {
                    const enabled = !!editModules[m.key];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={editSaving}
                        onClick={() => handleEditModuleToggle(m.key)}
                        className={`w-full flex items-center justify-between text-sm px-3 py-2.5 rounded-xl border transition-colors disabled:opacity-60 ${
                          enabled
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-xs font-semibold">{enabled ? 'ON' : 'OFF'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeBusinessEditor}
                disabled={editSaving}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveBusinessChanges}
                disabled={editSaving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Direccion</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Calle Mayor 123, Madrid"
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





