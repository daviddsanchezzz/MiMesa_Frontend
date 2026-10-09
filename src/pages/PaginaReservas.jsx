import Page from '../ui/Page';
import { BookingLinkSettings } from './agenda/BookingLinkSettings';

/** Tu página de reservas: the link and the widget customers use to book. */
export default function PaginaReservas() {
  return (
    <Page title="Tu página de reservas" subtitle="El enlace que compartes y lo que ven tus clientes al reservar">
      <BookingLinkSettings />
    </Page>
  );
}
