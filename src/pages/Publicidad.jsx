import { useState } from 'react';
import Marketing from './Marketing';
import PromoCodes from './PromoCodes';
import { useAuth } from '../context/AuthContext';
import Page from '../ui/Page';

const TABS = [
  { key: 'marketing', label: 'Email' },
  { key: 'promos', label: 'Códigos' },
];

export default function Publicidad() {
  const { isAppointments } = useAuth();
  // Discount codes are applied by the restaurant booking page only
  const tabs = isAppointments ? TABS.filter((t) => t.key !== 'promos') : TABS;
  const searchParams = new URLSearchParams(window.location.search);
  const initial = tabs.find(t => t.key === searchParams.get('tab'))?.key ?? 'marketing';
  const [tab, setTab] = useState(initial);

  return (
    <Page title="Publicidad" subtitle={isAppointments ? 'Campañas de email a tus clientes que aceptaron recibirlas.' : 'Campañas de email a tus suscriptores y códigos de descuento para reservar online.'}
      tabs={{ value: tab, options: tabs.map((t) => [t.key, t.label]), onChange: setTab }}>

      {tab === 'marketing' && <Marketing />}
      {tab === 'promos'    && <PromoCodes />}
    </Page>
  );
}
