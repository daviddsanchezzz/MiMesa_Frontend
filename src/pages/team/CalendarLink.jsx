import { useEffect, useState } from 'react';
import { bookingsApi, apiError } from '../../services/bookingsApi';
import { btnSecondary } from '../agenda/utils';

/**
 * The secret link that puts a professional's appointments in Google Calendar,
 * Apple Calendar or Outlook (a subscription: the calendar app keeps it updated).
 */
export default function CalendarLink({ resource }) {
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setLink(null); setError('');
    bookingsApi.calendarLink(resource._id).then((l) => { if (live) setLink(l); }).catch((err) => { if (live) setError(apiError(err)); });
    return () => { live = false; };
  }, [resource._id]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia este enlace:', link.url);
    }
  }

  async function reset() {
    if (!window.confirm('¿Crear un enlace nuevo? El anterior dejará de funcionar y tendrás que volver a añadirlo en tus calendarios.')) return;
    setBusy(true);
    try { setLink(await bookingsApi.resetCalendarLink(resource._id)); } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">Calendario del móvil</h3>
        <p className="mt-0.5 text-sm text-gray-500">Ve las citas de {resource.name} en Google Calendar, Apple Calendar o Outlook, junto al resto de tu vida.</p>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!link && !error && <p className="text-sm text-gray-400">Cargando…</p>}
      {link && (
        <>
          <div className="flex flex-wrap gap-2">
            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(link.webcalUrl)}`} target="_blank" rel="noreferrer" className={btnSecondary}>Añadir a Google Calendar</a>
            <a href={link.webcalUrl} className={btnSecondary}>Apple / Outlook</a>
            <button type="button" onClick={copy} className={btnSecondary}>{copied ? 'Copiado ✓' : 'Copiar enlace'}</button>
          </div>
          <p className="text-xs text-gray-500">
            Es un enlace secreto: quien lo tenga puede ver estas citas, así que no lo compartas. Los calendarios se actualizan solos,
            pero Google puede tardar unas horas en reflejar un cambio; la agenda de Vetra siempre está al día.
          </p>
          <button type="button" onClick={reset} disabled={busy} className="text-xs font-semibold text-gray-500 hover:text-rose-600">Crear un enlace nuevo</button>
        </>
      )}
    </section>
  );
}
