import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useNav } from '../lib/nav';
import Icon from '../ui/Icon';

function Group({ title, children }) {
  return (
    <section>
      {title && <h3 className="px-1 mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-gray-400">{title}</h3>}
      <ul className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">{children}</ul>
    </section>
  );
}

function Row({ to, onClick, icon, label, hint, danger }) {
  const inner = (
    <>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${danger ? 'text-rose-600' : 'text-gray-900'}`}>{label}</span>
        {hint && <span className="block text-xs text-gray-500 truncate">{hint}</span>}
      </span>
      {!danger && <Icon name="right" className="w-4 h-4 text-gray-300" strokeWidth={2} />}
    </>
  );
  const cls = 'flex items-center gap-3 px-4 py-3 active:bg-gray-50 hover:bg-gray-50 transition-colors w-full text-left';
  return <li>{to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>}</li>;
}

/** «Más» on the phone: everything that is not used every day, grouped like a phone's settings. */
export default function More() {
  const { business, memberships, switchBusiness, logout, session } = useAuth();
  const { manage, account } = useNav();
  const navigate = useNavigate();
  useSetMobileHeader({ title: 'Más', action: false });

  const userName = session?.user?.name || business?.userName || 'Usuario';
  const userEmail = session?.user?.email || business?.userEmail || '';

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 px-1">
        {business?.logoUrl
          ? <img src={business.logoUrl} alt="" className="w-12 h-12 rounded-2xl object-contain bg-white border border-gray-200 p-1" />
          : <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-lg font-bold">{(business?.name || 'V')[0]}</div>}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{business?.name}</p>
          <p className="text-sm text-gray-500 truncate">{userName}{userEmail && ` · ${userEmail}`}</p>
        </div>
      </div>

      {manage.length > 0 && (
        <Group title="Negocio">
          {manage.map((l) => <Row key={l.to} {...l} />)}
        </Group>
      )}

      <Group title="Cuenta">
        {account.map((l) => <Row key={l.to} {...l} />)}
      </Group>

      {memberships.length > 1 && (
        <Group title="Cambiar de negocio">
          {memberships.filter((m) => m.businessId !== business?.id).map((m) => (
            <Row key={m.businessId} icon="building" label={m.businessName}
              onClick={async () => { await switchBusiness(m.businessId); navigate('/'); }} />
          ))}
        </Group>
      )}

      <Group>
        <Row icon="logout" label="Cerrar sesión" danger onClick={() => logout()} />
      </Group>
    </div>
  );
}
