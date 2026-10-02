import { useEffect, useState } from 'react';
import { publicBookingUrl } from '../../lib/publicUrl';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';

export function bookingUrl(business) {
  return publicBookingUrl(business);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A printable A5 poster with the QR code, for the mirror or the counter.
function printPoster({ business, qr, url, restaurant }) {
  const color = business?.brandColor || '#7c3aed';
  const w = window.open('', '_blank', 'width=720,height=960');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cartel de reservas · ${esc(business?.name)}</title>
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; }
  .page { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 16mm 12mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .logo { max-height: 22mm; max-width: 60mm; object-fit: contain; margin-bottom: 6mm; }
  .name { font-size: 20pt; font-weight: 700; margin: 0 0 8mm; }
  .title { font-size: 28pt; font-weight: 800; margin: 0; color: ${color}; line-height: 1.1; }
  .sub { font-size: 13pt; color: #4b5563; margin: 4mm 0 8mm; }
  .qr { width: 78mm; height: 78mm; padding: 4mm; border: 2px solid ${color}; border-radius: 6mm; }
  .steps { margin-top: 8mm; font-size: 11pt; color: #374151; line-height: 1.7; }
  .url { margin-top: 6mm; font-size: 9pt; color: #6b7280; word-break: break-all; }
</style></head><body><div class="page">
  ${business?.logoUrl ? `<img class="logo" src="${esc(business.logoUrl)}" alt="">` : ''}
  <p class="name">${esc(business?.name)}</p>
  <p class="title">${restaurant ? 'Reserva tu mesa' : 'Reserva tu próxima cita'}</p>
  <p class="sub">Escanea el código con la cámara del móvil</p>
  <img class="qr" src="${qr}" alt="Código QR">
  <div class="steps">${restaurant ? 'Elige día, hora y cuántos sois.' : 'Elige servicio, profesional y hora.'}<br>Te llega la confirmación al momento.</div>
  <div class="url">${esc(url)}</div>
</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  w.document.close();
}

/**
 * The booking link with everything needed to spread it: copy, WhatsApp,
 * QR code (download or print as a poster).
 */
export default function ShareLink({ variant = 'full' }) {
  const { business, isAppointments } = useAuth();
  const restaurant = !isAppointments;
  const url = bookingUrl(business);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#111827', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [url]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Ya puedes reservar ${restaurant ? 'mesa' : 'tu cita'} en ${business?.name} desde aquí: ${url}`)}`;
  const compact = variant === 'compact';

  return (
    <div className={`flex ${compact ? 'flex-col sm:flex-row' : 'flex-col md:flex-row'} gap-5 items-center sm:items-start`}>
      <div className="shrink-0 text-center">
        {qr
          ? <img src={qr} alt="Código QR de tu página de reservas" className={`${compact ? 'w-32 h-32' : 'w-44 h-44'} rounded-xl border border-gray-200 p-1.5 bg-white`} />
          : <div className={`${compact ? 'w-32 h-32' : 'w-44 h-44'} rounded-xl bg-gray-100`} />}
      </div>
      <div className="min-w-0 flex-1 w-full space-y-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl pl-3.5 pr-1.5 py-1.5">
          <span className="flex-1 min-w-0 truncate text-sm text-gray-700 font-mono">{url.replace(/^https?:\/\//, '')}</span>
          <button type="button" onClick={copy}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700">
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <a href={whatsapp} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-95">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2z"/></svg>
            WhatsApp
          </a>
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Ver mi página
          </a>
          <button type="button" disabled={!qr} onClick={() => printPoster({ business, qr, url, restaurant })}
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Imprimir cartel
          </button>
          <a href={qr || undefined} download={`qr-reservas-${(business?.name || 'negocio').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Descargar QR
          </a>
        </div>
        {!compact && (
          <p className="text-xs text-gray-500">
            Ponlo en tu bio de Instagram, en Google y en el estado de WhatsApp. El cartel con el QR va genial {restaurant ? 'en la entrada, en las mesas o en la carta' : 'en el espejo o en el mostrador'}.
          </p>
        )}
      </div>
    </div>
  );
}
