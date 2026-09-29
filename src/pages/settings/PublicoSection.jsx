import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PlanGate from '../../components/PlanGate';

// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO SECTION
// ═══════════════════════════════════════════════════════════════════════════
export function PublicoSection() {
  const { business, refreshBusiness } = useAuth();
  const [brandColor, setBrandColor] = useState(business?.brandColor || '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null); // 'url' | 'embed'
  const publicUrl = `${window.location.origin}/public/${business?.id}/reserve`;
  const embedCode = `<iframe\n  id="vetra-frame"\n  src="${publicUrl}?embed=1"\n  style="width:100%; border:none; min-height:500px;"\n></iframe>\n<script>\n  window.addEventListener("message", function(e) {\n    if (e.data.type === "VETRA_HEIGHT")\n      document.getElementById("vetra-frame").style.height = e.data.height + "px";\n  });\n<\/script>`;

  useEffect(() => {
    if (business?.brandColor) setBrandColor(business.brandColor);
  }, [business]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleColorChange = async (newColor) => {
    setBrandColor(newColor);
    setSaving(true);
    try {
      await api.put('/auth/settings', { brandColor: newColor });
      await refreshBusiness();
    } catch (err) {
      console.error('Error updating brand color:', err);
      setBrandColor(business?.brandColor || '#3B82F6');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Color Corporativo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Personaliza el color principal que se mostrara en la pagina de reservas publicas.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
              disabled={saving}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Color seleccionado</p>
              <p className="text-xs text-gray-500 uppercase font-mono">{brandColor}</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              Guardando...
            </div>
          )}
        </div>
        <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <button
            className="px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: brandColor }}
          >
            Reservar Mesa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">URL Publica para Reservas</h3>
        <p className="text-sm text-gray-600 mb-4">
          Comparte esta URL con tus clientes para que puedan hacer reservas online directamente.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50"
          />
          <button
            onClick={() => copyToClipboard(publicUrl, 'url')}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            {copied === 'url' ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <PlanGate paid>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Integrar en tu web (iframe)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Copia este codigo y pegalo en la web de tu restaurante para que los clientes puedan reservar sin salir de tu pagina.
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed mb-3">
{embedCode}
          </pre>
          <button
            onClick={() => copyToClipboard(embedCode, 'embed')}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            {copied === 'embed' ? 'Copiado' : 'Copiar codigo'}
          </button>
        </div>
      </PlanGate>
    </div>
  );
}
