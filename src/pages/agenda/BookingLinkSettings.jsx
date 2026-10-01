import { useState } from 'react';
import { publicBookingUrl } from '../../lib/publicUrl';
import PublicAddressEditor from '../../components/PublicAddressEditor';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PlanGate from '../../components/PlanGate';
import ShareLink from './ShareLink';

// Configuración → Enlace de reservas (appointment businesses): the public
// booking link to share (copy, WhatsApp, QR poster) and the embed code for
// the business website.
export function BookingLinkSettings() {
  const { business, isAppointments } = useAuth();
  const [copied, setCopied] = useState('');

  const url = publicBookingUrl(business);
  const frameId = isAppointments ? 'vetra-citas' : 'vetra-reservas';
  const embed = `<iframe id="${frameId}" src="${url}?embed=1" style="width:100%;border:none;min-height:560px"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "VETRA_HEIGHT")
      document.getElementById("${frameId}").style.height = e.data.height + "px";
  });
</script>`;

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const embedBlock = (
    <section className="space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">Insertar en tu web</h3>
        <p className="text-sm text-gray-500 mt-0.5">Pega este código en tu web para que reserven sin salir de ella.</p>
      </div>
      <pre className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">{embed}</pre>
      <button type="button" className="h-9 px-4 rounded-full bg-gray-900 text-white text-[13px] font-semibold hover:bg-black" onClick={() => copy(embed, 'embed')}>
        {copied === 'embed' ? 'Copiado ✓' : 'Copiar código'}
      </button>
    </section>
  );

  // The same screen for citas and restaurante: the link (copy, WhatsApp,
  // QR poster), its address, and the code for the business website.
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Tu enlace</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Compártelo en WhatsApp, Instagram y Google para que {isAppointments ? 'pidan cita' : 'reserven mesa'} solos.
            {isAppointments && ' Solo verán los servicios marcados como «se puede reservar online».'}
          </p>
        </div>
        <ShareLink />
        <div className="pt-4 border-t border-gray-100"><PublicAddressEditor /></div>
        <p className="text-xs text-gray-500">
          El logo y el color de tu página se cambian en <Link to="/configuracion?tab=negocio" className="font-semibold text-violet-700">Datos del negocio</Link>.
        </p>
      </section>
      {isAppointments ? embedBlock : <PlanGate paid>{embedBlock}</PlanGate>}
    </div>
  );
}
