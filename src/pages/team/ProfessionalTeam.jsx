import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { PageHeader } from '../../ui/kit';
import { ProfessionalsSettings } from '../agenda/AgendaSettings';

/** Main entry point for appointment staff; keeps the existing real resource editor. */
export default function ProfessionalTeam() {
  useSetMobileHeader({ title: 'Equipo' });
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Equipo" subtitle="Profesionales, servicios, horarios, fotos y acceso a Vetra." />
      <ProfessionalsSettings />
    </div>
  );
}
