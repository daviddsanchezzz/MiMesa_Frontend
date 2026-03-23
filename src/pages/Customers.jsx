import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import CustomerForm from '../components/CustomerForm';
import Modal from '../components/Modal';

function Avatar({ name, size = 'md' }) {
  const colors = ['bg-violet-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const sz = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full ${colors[idx]} flex items-center justify-center text-white font-semibold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function CustomerCard({ c, onEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-start gap-3">
      <Avatar name={c.name} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate">{c.name}</p>
          {c.visits > 5 && <span className="text-amber-400 text-sm shrink-0">★</span>}
        </div>
        <div className="mt-1 space-y-0.5">
          {c.phone && <p className="text-sm text-gray-600">{c.phone}</p>}
          {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
          {!c.phone && !c.email && <p className="text-xs text-gray-300">Sin contacto</p>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            c.visits > 5 ? 'bg-violet-100 text-violet-700' :
            c.visits > 0 ? 'bg-gray-100 text-gray-700' :
            'bg-gray-50 text-gray-400'
          }`}>
            {c.visits} {c.visits === 1 ? 'visita' : 'visitas'}
          </span>
          {c.noShowCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700">
              {c.noShowCount} no-show
            </span>
          )}
          {c.notes && <p className="text-xs text-gray-400 truncate flex-1">{c.notes}</p>}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-violet-600 hover:bg-violet-50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
        </svg>
      </button>
    </div>
  );
}

function MobileCustomerRow({ c, onEdit }) {
  const [open, setOpen] = useState(false);
  const hasContact = Boolean(c.phone || c.email);
  const badgeCls =
    c.visits > 5
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : c.visits > 0
      ? 'bg-gray-50 text-gray-700 border-gray-200'
      : 'bg-gray-50 text-gray-400 border-gray-200';

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={c.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
            {c.visits > 5 && <span className="text-amber-400 text-sm shrink-0">★</span>}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {c.phone || c.email || 'Sin contacto'}
          </p>
        </div>
        
        {c.noShowCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-700">
            {c.noShowCount} no-show
          </span>
        )}
        <span className={`text-[11px] border px-2 py-0.5 rounded-full font-semibold ${badgeCls}`}>
          {c.visits}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 bg-gray-50/80 border-t border-gray-100 space-y-2">
          {c.notes && (
            <p className="text-xs text-gray-500 italic bg-white border border-gray-200 rounded-lg px-2.5 py-2">
              "{c.notes}"
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-emerald-600 text-white active:bg-emerald-700 transition-colors"
              >
                Llamar
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-violet-600 text-white active:bg-violet-700 transition-colors"
              >
                Email
              </a>
            )}
            <button
              onClick={onEdit}
              className={`${hasContact ? 'px-3' : 'flex-1'} py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors`}
            >
              Editar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [mobileFilter, setMobileFilter] = useState('all'); // all | frequent | contactless

  const load = () => api.get('/customers').then(r => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const filteredBase = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = useMemo(() => {
    if (mobileFilter === 'frequent') return filteredBase.filter((c) => c.visits > 5);
    if (mobileFilter === 'contactless') return filteredBase.filter((c) => !c.phone && !c.email);
    return filteredBase;
  }, [filteredBase, mobileFilter]);

  const mobileStats = useMemo(() => ({
    total: customers.length,
    frequent: customers.filter((c) => c.visits > 5).length,
    risky: customers.filter((c) => (c.noShowCount || 0) > 0).length,
    contactless: customers.filter((c) => !c.phone && !c.email).length,
  }), [customers]);

  return (
    <div className="space-y-4">
      <div className="sm:hidden space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
            <p className="text-sm text-gray-400 mt-0.5">{customers.length} registrados</p>
          </div>
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white active:bg-violet-700 shrink-0 shadow-sm"
            aria-label="Nuevo cliente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setMobileFilter('all')}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold ${mobileFilter === 'all' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            {mobileStats.total} total
          </button>
          <button
            onClick={() => setMobileFilter('frequent')}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold ${mobileFilter === 'frequent' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            {mobileStats.frequent} frecuentes
          </button>
          <div className="rounded-xl border px-2 py-2 text-xs font-semibold bg-rose-50 border-rose-200 text-rose-700 text-center">
            {mobileStats.risky} no-show
          </div>
          <button
            onClick={() => setMobileFilter('contactless')}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold ${mobileFilter === 'contactless' ? 'bg-gray-100 border-gray-200 text-gray-700' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            {mobileStats.contactless} sin contacto
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="hidden sm:flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-400 mt-0.5">{customers.length} cliente{customers.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
          className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-6 h-6 text-gray-300">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">
            {search ? 'No hay resultados para tu búsqueda' : 'Sin clientes todavía'}
          </p>
          {!search && (
            <button onClick={() => setModal({ mode: 'create' })} className="mt-4 text-sm text-violet-600 hover:underline font-medium">
              Registrar el primer cliente →
            </button>
          )}
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="space-y-3 sm:hidden">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            {filtered.map((c) => (
              <MobileCustomerRow key={c._id} c={c} onEdit={() => setModal({ mode: 'edit', customer: c })} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contacto</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Visitas</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Notas</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c._id}
                    className={`hover:bg-gray-50/60 transition-colors ${i < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Desde {new Date(c.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {c.phone ? <p className="text-gray-700 text-sm">{c.phone}</p> : null}
                        {c.email ? <p className="text-gray-400 text-xs">{c.email}</p> : null}
                        {!c.phone && !c.email && <span className="text-gray-300 text-xs">Sin contacto</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.visits > 5 ? 'bg-violet-100 text-violet-700' :
                          c.visits > 0 ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {c.visits} {c.visits === 1 ? 'visita' : 'visitas'}
                        </span>
                        {c.visits > 5 && <span title="Cliente frecuente" className="text-amber-400 text-sm">★</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      {c.notes ? <p className="text-xs text-gray-500 truncate">{c.notes}</p> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setModal({ mode: 'edit', customer: c })}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
          subtitle={modal.mode === 'create' ? 'Registra los datos del cliente' : modal.customer?.name}
          onClose={() => setModal(null)}
        >
          <CustomerForm
            customer={modal.customer}
            onSave={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

