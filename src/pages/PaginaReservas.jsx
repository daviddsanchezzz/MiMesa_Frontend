import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { PageHeader } from '../ui/kit';
import { BookingLinkSettings } from './agenda/BookingLinkSettings';

/** Tu página de reservas: the link and the widget customers use to book. */
export default function PaginaReservas() {
  useSetMobileHeader({ title: 'Tu página de reservas' });
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Tu página de reservas" subtitle="El enlace que compartes y lo que ven tus clientes al reservar" />
      <BookingLinkSettings />
    </div>
  );
}
