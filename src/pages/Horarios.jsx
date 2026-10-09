import { useSearchParams } from 'react-router-dom';
import Page from '../ui/Page';
import { TurnosSection } from './settings/TurnosSection';
import { VacacionesSection } from './settings/VacacionesSection';
import Exceptions from './Exceptions';

const TABS = [['turnos', 'Turnos'], ['cierres', 'Cierres'], ['vacaciones', 'Vacaciones']];

/**
 * Horarios y cierres (restaurante): when you open and when you do not, in one place —
 * the turnos (comida, cena…), the one-off closures and exceptions, and the holidays.
 */
export default function Horarios() {
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');
  const tab = TABS.some(([k]) => k === asked) ? asked : 'turnos';
  return (
    <Page title="Horarios y cierres" subtitle="Cuándo abres y cuándo no"
      tabs={{ value: tab, options: TABS, onChange: (key) => setParams({ tab: key }, { replace: true }) }}>
      {tab === 'turnos' && <TurnosSection />}
      {tab === 'cierres' && <Exceptions embedded />}
      {tab === 'vacaciones' && <VacacionesSection />}
    </Page>
  );
}
