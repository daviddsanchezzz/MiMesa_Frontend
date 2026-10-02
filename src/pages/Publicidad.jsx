import { useState } from 'react';
import Marketing from './Marketing';
import PromoCodes from './PromoCodes';
import { PageHeader, Tabs } from '../ui/kit';

const TABS = [
  { key: 'marketing', label: 'Email' },
  { key: 'promos', label: 'Códigos' },
];

export default function Publicidad() {
  const searchParams = new URLSearchParams(window.location.search);
  const initial = TABS.find(t => t.key === searchParams.get('tab'))?.key ?? 'marketing';
  const [tab, setTab] = useState(initial);

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Publicidad" subtitle="Campañas de email a tus suscriptores y códigos de descuento para reservar online." />

      <Tabs value={tab} options={TABS.map(t => [t.key, t.label])} onChange={setTab} />

      {tab === 'marketing' && <Marketing />}
      {tab === 'promos'    && <PromoCodes />}
    </div>
  );
}
