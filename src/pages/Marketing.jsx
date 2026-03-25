import { useState, useEffect } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

export default function Marketing() {
  const [subscribers,  setSubscribers]  = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [sending,      setSending]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');
  const [view,         setView]         = useState('compose');

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get('/marketing/subscribers'),
      api.get('/marketing/campaigns'),
    ]);
    setSubscribers(s.data);
    setCampaigns(c.data);
  };
  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!subject.trim() || !body.trim()) { setError('El asunto y el cuerpo son obligatorios'); return; }
    if (!confirm(`¿Enviar esta campaña a ${subscribers.length} suscriptores?`)) return;
    try {
      setSending(true);
      const r = await api.post('/marketing/send', { subject, body });
      setResult(r.data);
      setSubject(''); setBody('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const recentCampaigns = campaigns.filter(c => {
    const ago = Date.now() - new Date(c.sentAt).getTime();
    return ago < 30 * 24 * 60 * 60 * 1000;
  }).length;
  const remaining = Math.max(0, 3 - recentCampaigns);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Email marketing</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {subscribers.length} suscriptor{subscribers.length !== 1 ? 'es' : ''} activo{subscribers.length !== 1 ? 's' : ''} · {remaining}/3 envíos disponibles este mes
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {['compose', 'history', 'subscribers'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${view === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {v === 'compose' ? 'Redactar' : v === 'history' ? 'Historial' : 'Suscriptores'}
          </button>
        ))}
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-xs text-violet-700 leading-relaxed">
        <strong>Aviso legal:</strong> Solo puedes enviar emails a clientes que aceptaron explícitamente recibir comunicaciones.
        Cada email incluye un enlace de baja automático. El límite es de 3 campañas por mes.
        Tú eres el responsable del tratamiento de estos datos según el RGPD.
      </div>

      {view === 'compose' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
              ✓ Enviado a {result.sent} suscriptores{result.errors?.length > 0 ? ` (${result.errors.length} fallidos)` : ''}.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          {subscribers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aún no tienes suscriptores. Aparecerán aquí cuando los clientes acepten recibir comunicaciones al reservar.
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Asunto *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: ¡Menú especial este fin de semana!"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mensaje *</label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  rows={8} placeholder="Escribe tu mensaje aquí. El saludo personalizado y el pie con enlace de baja se añaden automáticamente."
                  className={`${inputCls} resize-y min-h-[160px]`} />
                <p className="text-xs text-gray-400 mt-1">El pie con «Darse de baja» se añade automáticamente en cada email.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <p className="text-xs text-gray-400 flex-1">
                  {remaining === 0
                    ? 'Has alcanzado el límite de 3 campañas este mes.'
                    : `Se enviará a ${subscribers.length} suscriptor${subscribers.length !== 1 ? 'es' : ''}.`}
                </p>
                <button onClick={handleSend} disabled={sending || remaining === 0}
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors">
                  {sending ? 'Enviando...' : 'Enviar campaña'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin campañas enviadas todavía.</div>
          ) : campaigns.map(c => (
            <div key={c._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-800 font-medium leading-snug flex-1 min-w-0 truncate">{c.subject}</p>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500 font-medium">{c.recipientCount} env.</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(c.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'subscribers' && (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {subscribers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin suscriptores todavía.</div>
          ) : subscribers.map(s => (
            <div key={s._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">{s.email}</p>
              </div>
              <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap pt-0.5">
                {s.marketingSubscribedAt
                  ? new Date(s.marketingSubscribedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
