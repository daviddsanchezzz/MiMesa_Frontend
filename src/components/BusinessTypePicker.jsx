// Lets the owner choose what kind of business they run. The type decides
// menus, settings and which modules are on (see backend Business.businessType).
export const BUSINESS_TYPES = [
  {
    value: 'restaurant',
    title: 'Restaurante',
    desc: 'Reservas de mesa por turnos, salas y comensales.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v8m-2-8v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9" />
      </svg>
    ),
  },
  {
    value: 'appointments',
    title: 'Negocio con citas',
    desc: 'Peluquería, estética, consulta, estudio… Citas por servicio y profesional.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path strokeLinecap="round" d="M3.5 10h17M8 3v4m8-4v4M12 13.5v3l2 1.2" />
      </svg>
    ),
  },
];

export default function BusinessTypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Tipo de negocio">
      {BUSINESS_TYPES.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.value)}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              active ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-gray-200 bg-white hover:border-violet-300'}`}
          >
            <span className={active ? 'text-violet-600' : 'text-gray-400'}>{t.icon}</span>
            <p className="text-sm font-semibold text-gray-900 mt-2">{t.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
