import { useState } from 'react';
import Marketing from './Marketing';
import PromoCodes from './PromoCodes';

const TABS = [
  {
    key: 'marketing',
    label: 'Email marketing',
    desc: 'Campañas de email a suscriptores',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v.875c0 .234-.1.454-.27.612l-5.523 4.917a1.75 1.75 0 0 1-2.414 0L1.27 4.987A.874.874 0 0 1 1 4.375V3.5Z"/>
        <path d="M1 6.925V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.925l-5.023 4.47a3.25 3.25 0 0 1-4.454 0L1 6.925Z"/>
      </svg>
    ),
  },
  {
    key: 'promos',
    label: 'Códigos promocionales',
    desc: 'Descuentos y códigos para reservas online',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path fillRule="evenodd" d="M1 8.74a1 1 0 0 1 .52-.877l2.914-1.628A1 1 0 0 1 5.48 6.13l.023.044a1.998 1.998 0 0 0 3.498.044l.023-.044a1 1 0 0 1 1.048.105l2.914 1.628A1 1 0 0 1 13.52 8.74V11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V8.74ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd"/>
        <path d="M5.5 11a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5Z"/>
      </svg>
    ),
  },
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
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 items-start">
        <nav className="hidden lg:flex flex-col lg:sticky lg:top-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                tab === t.key
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
              }`}
            >
              <span className={`transition-colors ${tab === t.key ? 'text-violet-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'marketing' && <Marketing />}
          {tab === 'promos'    && <PromoCodes />}
        </div>
      </div>
    </div>
  );
}
