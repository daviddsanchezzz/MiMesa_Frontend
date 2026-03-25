import { useState } from 'react';
import Marketing from './Marketing';
import PromoCodes from './PromoCodes';

const TABS = [
  { key: 'marketing', label: 'Email marketing',       desc: 'Campañas de email a suscriptores' },
  { key: 'promos',    label: 'Códigos promocionales', desc: 'Descuentos y códigos para reservas online' },
];

export default function Publicidad() {
  const searchParams = new URLSearchParams(window.location.search);
  const initial = TABS.find(t => t.key === searchParams.get('tab'))?.key ?? 'marketing';
  const [tab, setTab] = useState(initial);
  const current = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Publicidad</h2>
        <p className="text-sm text-gray-400 mt-0.5">Marketing por email y códigos promocionales.</p>
      </div>

      {/* Mobile: select */}
      <div className="lg:hidden">
        <div className="relative">
          <select
            value={tab}
            onChange={e => setTab(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {TABS.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-400">
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">{current?.desc}</p>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
        <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl p-2 lg:sticky lg:top-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'marketing' && <Marketing />}
          {tab === 'promos'    && <PromoCodes />}
        </div>
      </div>
    </div>
  );
}
