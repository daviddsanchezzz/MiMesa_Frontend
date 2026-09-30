import { useState } from 'react';
import { publicBookingUrl } from '../../lib/publicUrl';
import PublicAddressEditor from '../../components/PublicAddressEditor';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { btnSecondary } from './utils';
import ShareLink from './ShareLink';
import PolicySettings from './PolicySettings';

// Configuración → Enlace de reservas (appointment businesses): the public
// booking link to share (copy, WhatsApp, QR poster) and the embed code for
// the business website.
export function BookingLinkSettings() {
  const { business } = useAuth();
  const [copied, setCopied] = useState('');

  const url = publicBookingUrl(business);
  const embed = `<iframe id="vetra-citas" src="${url}?embed=1" style="width:100%;border:none;min-height:560px"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "VETRA_HEIGHT")
      document.getElementById("vetra-citas").style.height = e.data.height + "px";
  });
</script>`;

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Tu enlace de reservas</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Compártelo con tus clientes (WhatsApp, Instagram, Google) para que reserven solos. Solo verán los servicios marcados como "se puede reservar online".
          </p>
        </div>
        <ShareLink />
        <div className="pt-3 border-t border-gray-100"><PublicAddressEditor /></div>
      </section>

      <PolicySettings />

      <p className="text-xs text-gray-500 px-1">
        El logo y el color de tu página se cambian en <Link to="/configuracion?tab=negocio" className="font-semibold text-violet-700">Negocio</Link>.
      </p>

      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Insertar en tu web</h3>
          <p className="text-xs text-gray-500 mt-0.5">Pega este código en tu web para que reserven sin salir de ella.</p>
        </div>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">{embed}</pre>
        <button type="button" className={btnSecondary} onClick={() => copy(embed, 'embed')}>{copied === 'embed' ? 'Copiado ✓' : 'Copiar código'}</button>
      </section>
    </div>
  );
}
