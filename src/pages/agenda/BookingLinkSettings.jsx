import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { btnPrimary, btnSecondary } from './utils';

// Configuración → Enlace de reservas (appointment businesses): the public
// booking link to share, the embed code for the business website and the
// brand colour used on that page.
export function BookingLinkSettings() {
  const { business, refreshBusiness } = useAuth();
  const [copied, setCopied] = useState('');
  const [color, setColor] = useState(business?.brandColor || '#7c3aed');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (business?.brandColor) setColor(business.brandColor); }, [business?.brandColor]);

  const url = `${window.location.origin}/public/${business?.id}/cita`;
  const embed = `<iframe id="vetra-citas" src="${url}?embed=1" style="width:100%;border:none;min-height:560px"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "VETRA_HEIGHT")
      document.getElementById("vetra-citas").style.height = e.data.height + "px";
  });
</script>`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Reserva tu cita en ${business?.name}: ${url}`)}`;

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const saveColor = async (value) => {
    setColor(value);
    setSaving(true);
    try {
      await api.put('/auth/settings', { brandColor: value });
      await refreshBusiness();
    } finally {
      setSaving(false);
    }
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
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={url} onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 font-mono" />
          <button type="button" className={btnPrimary} onClick={() => copy(url, 'url')}>{copied === 'url' ? 'Copiado ✓' : 'Copiar enlace'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className={btnSecondary}>Ver mi página</a>
          <a href={whatsapp} target="_blank" rel="noreferrer" className={btnSecondary}>Compartir por WhatsApp</a>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Color de tu página</h3>
          <p className="text-xs text-gray-500 mt-0.5">Se usa en botones y detalles de la página de reservas.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={color} disabled={saving} onChange={(e) => saveColor(e.target.value)}
            className="w-11 h-11 rounded-lg border border-gray-200 cursor-pointer" />
          <span className="text-xs font-mono uppercase text-gray-500">{color}</span>
          <span className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: color }}>Confirmar cita</span>
          {saving && <span className="text-xs text-gray-400">Guardando…</span>}
        </div>
      </section>

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
