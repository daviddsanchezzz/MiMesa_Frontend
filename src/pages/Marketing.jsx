import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Icon from '../ui/Icon';
import { Section, SectionLink, FigureLine, Empty } from '../ui/kit';

const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
const labelCls = 'block text-[13px] font-medium text-gray-700 mb-1.5';
const SUBS_PREVIEW = 8;

export default function Marketing() {
  useSetMobileHeader({ title: 'Publicidad', action: false });
  const [subscribers,  setSubscribers]  = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [sending,      setSending]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');
  const [showAllSubs,  setShowAllSubs]  = useState(false);

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

  const plural = subscribers.length !== 1;
  const shownSubs = showAllSubs ? subscribers : subscribers.slice(0, SUBS_PREVIEW);

  return (
    <div className="space-y-8">
      <FigureLine items={[
        { label: `suscriptor${plural ? 'es' : ''} activo${plural ? 's' : ''}`, value: subscribers.length },
        { label: 'de 3 envíos disponibles este mes', value: remaining, tone: remaining === 0 ? 'warn' : undefined },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-9 items-start">
        {/* Composer */}
        <Section title="Nueva campaña" className="lg:col-span-7">
          <div className="space-y-4 pt-1">
            {result && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Icon name="check" className="w-4 h-4" strokeWidth={2} />
                Enviado a {result.sent} suscriptores{result.errors?.length > 0 ? ` (${result.errors.length} fallidos)` : ''}.
              </p>
            )}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            {subscribers.length === 0 ? (
              <Empty>Aún no tienes suscriptores. Aparecerán aquí cuando los clientes acepten recibir comunicaciones al reservar.</Empty>
            ) : (
              <>
                <div>
                  <label className={labelCls} htmlFor="mk-subject">Asunto</label>
                  <input id="mk-subject" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Ej: ¡Menú especial este fin de semana!"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mk-body">Mensaje</label>
                  <textarea id="mk-body" value={body} onChange={e => setBody(e.target.value)}
                    rows={8} placeholder="Escribe tu mensaje aquí. El saludo personalizado y el pie con enlace de baja se añaden automáticamente."
                    className={`${inputCls} resize-y min-h-[160px]`} />
                  <p className="text-xs text-gray-400 mt-1.5">El pie con «Darse de baja» se añade automáticamente en cada email.</p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                  <p className={`text-[13px] flex-1 ${remaining === 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {remaining === 0
                      ? 'Has alcanzado el límite de 3 campañas este mes.'
                      : `Se enviará a ${subscribers.length} suscriptor${plural ? 'es' : ''}.`}
                  </p>
                  <button type="button" onClick={handleSend} disabled={sending || remaining === 0}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
                    {sending ? 'Enviando…' : 'Enviar campaña'}
                  </button>
                </div>
              </>
            )}

            <p className="text-xs text-gray-400 leading-relaxed pt-2">
              Solo se envía a clientes que aceptaron explícitamente recibir comunicaciones. Cada email incluye un enlace
              de baja automático y el límite es de 3 campañas al mes. Tú eres el responsable del tratamiento de estos datos según el RGPD.
            </p>
          </div>
        </Section>

        <div className="lg:col-span-5 space-y-9">
          {/* History */}
          <Section title="Enviadas">
            {campaigns.length === 0 ? (
              <p className="py-3 text-sm text-gray-500">Sin campañas enviadas todavía.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <li key={c._id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-gray-900 truncate">{c.subject}</p>
                      <p className="text-[13px] text-gray-500">
                        {new Date(c.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-900 tabular-nums">
                      {c.recipientCount} <span className="text-[13px] text-gray-500">envíos</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Subscribers */}
          <Section title="Suscriptores"
            aside={subscribers.length > SUBS_PREVIEW && (
              <SectionLink onClick={() => setShowAllSubs(v => !v)}>
                {showAllSubs ? 'Ver menos' : `Ver los ${subscribers.length}`}
              </SectionLink>
            )}>
            {subscribers.length === 0 ? (
              <p className="py-3 text-sm text-gray-500">Sin suscriptores todavía.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {shownSubs.map(s => (
                  <li key={s._id} className="flex items-center gap-3 py-3">
                    <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0">
                      {(s.name || s.email || '?')[0].toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-[13px] text-gray-500 truncate">{s.email}</p>
                    </div>
                    <p className="shrink-0 text-[13px] text-gray-400 whitespace-nowrap">
                      {s.marketingSubscribedAt
                        ? `desde ${new Date(s.marketingSubscribedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                        : '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
