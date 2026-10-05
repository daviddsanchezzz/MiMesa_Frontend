import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import Icon from '../ui/Icon';
import { Section, SectionLink, FigureLine, Empty } from '../ui/kit';

const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
const labelCls = 'block text-[13px] font-medium text-gray-700 mb-1.5';
const SUBS_PREVIEW = 8;
const MONTHLY_LIMIT = 6; // campaigns per 30 days (the server enforces it)

// Who a campaign is for (appointment businesses). `param` is the extra choice the group needs.
const AUDIENCES = [
  ['all', 'Todos los suscriptores'],
  ['service', 'Han hecho un servicio'],
  ['lapsed', 'Hace tiempo que no vienen'],
  ['new', 'Clientes nuevos'],
  ['frequent', 'Clientes habituales'],
];
const LAPSED_OPTIONS = [[60, '2 meses'], [90, '3 meses'], [120, '4 meses'], [180, '6 meses']];
const NEW_OPTIONS = [[30, 'el último mes'], [60, 'los últimos 2 meses'], [90, 'los últimos 3 meses']];
const FREQUENT_OPTIONS = [[3, '3 visitas o más'], [5, '5 visitas o más'], [10, '10 visitas o más']];

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
  const { isAppointments } = useAuth();
  const [services,  setServices]  = useState([]);
  const [audience,  setAudience]  = useState({ type: 'all', serviceId: '', days: 90, visits: 5 });
  const [segment,   setSegment]   = useState(null); // preview of the chosen group

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get('/marketing/subscribers'),
      api.get('/marketing/campaigns'),
    ]);
    setSubscribers(s.data);
    setCampaigns(c.data);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!isAppointments) return;
    api.get('/bookings/services').then((r) => setServices(r.data || [])).catch(() => {});
  }, [isAppointments]);

  // Who would get it: asked to the server every time the group changes
  const segmentQuery = (() => {
    if (!isAppointments || audience.type === 'all') return null;
    const q = new URLSearchParams({ type: audience.type });
    if (audience.type === 'service') { if (!audience.serviceId) return null; q.set('serviceId', audience.serviceId); }
    if (audience.type === 'lapsed' || audience.type === 'new') q.set('days', String(audience.type === 'new' && audience.days > 90 ? 30 : audience.days));
    if (audience.type === 'frequent') q.set('visits', String(audience.visits));
    return q.toString();
  })();
  useEffect(() => {
    setSegment(null);
    if (!segmentQuery) return undefined;
    let live = true;
    api.get(`/bookings/segments?${segmentQuery}`).then((r) => { if (live) setSegment(r.data); }).catch(() => {});
    return () => { live = false; };
  }, [segmentQuery]);

  const audienceLabel = (() => {
    const base = AUDIENCES.find(([key]) => key === audience.type)?.[1] || '';
    if (audience.type === 'service') return `${base}: ${services.find((x) => x._id === audience.serviceId)?.name || ''}`.trim();
    if (audience.type === 'lapsed') return `${base} (${LAPSED_OPTIONS.find(([d]) => d === audience.days)?.[1] || ''})`;
    return base;
  })();
  const segmented = isAppointments && audience.type !== 'all';
  const recipients = segmented ? (segment?.reachable ?? 0) : subscribers.length;

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!subject.trim() || !body.trim()) { setError('El asunto y el cuerpo son obligatorios'); return; }
    if (segmented && !segment) { setError('Elige a quién va dirigida la campaña'); return; }
    if (!confirm(`¿Enviar esta campaña a ${recipients} ${recipients === 1 ? 'persona' : 'personas'}?`)) return;
    try {
      setSending(true);
      const r = await api.post('/marketing/send', {
        subject, body,
        ...(segmented ? { customerIds: segment.customerIds, audience: audienceLabel } : {}),
      });
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
  const remaining = Math.max(0, MONTHLY_LIMIT - recentCampaigns);

  const plural = subscribers.length !== 1;
  const shownSubs = showAllSubs ? subscribers : subscribers.slice(0, SUBS_PREVIEW);

  return (
    <div className="space-y-8">
      <FigureLine items={[
        { label: `suscriptor${plural ? 'es' : ''} activo${plural ? 's' : ''}`, value: subscribers.length },
        { label: `de ${MONTHLY_LIMIT} envíos disponibles este mes`, value: remaining, tone: remaining === 0 ? 'warn' : undefined },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-9 items-start">
        {/* Composer */}
        <Section title="Nueva campaña" className="lg:col-span-7">
          <div className="space-y-4 pt-1">
            {result && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Icon name="check" className="w-4 h-4" strokeWidth={2} />
                Enviado a {result.sent} {result.sent === 1 ? 'persona' : 'personas'}{result.errors?.length > 0 ? ` (${result.errors.length} fallidos)` : ''}.
              </p>
            )}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            {subscribers.length === 0 ? (
              <Empty>Aún no tienes suscriptores. Aparecerán aquí cuando los clientes acepten recibir comunicaciones al reservar.</Empty>
            ) : (
              <>
                {isAppointments && (
                  <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
                    <div>
                      <label className={labelCls} htmlFor="mk-audience">¿A quién va dirigida?</label>
                      <select id="mk-audience" className={inputCls} value={audience.type}
                        onChange={(e) => setAudience((a) => ({ ...a, type: e.target.value, days: e.target.value === 'new' ? 30 : 90 }))}>
                        {AUDIENCES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </div>
                    {audience.type === 'service' && (
                      <select aria-label="Servicio" className={inputCls} value={audience.serviceId} onChange={(e) => setAudience((a) => ({ ...a, serviceId: e.target.value }))}>
                        <option value="">Elige un servicio…</option>
                        {services.filter((x) => x.active !== false).map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
                      </select>
                    )}
                    {audience.type === 'lapsed' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>No vienen desde hace</span>
                        <select aria-label="Tiempo sin venir" className={`${inputCls} !w-auto`} value={audience.days} onChange={(e) => setAudience((a) => ({ ...a, days: Number(e.target.value) }))}>
                          {LAPSED_OPTIONS.map(([d, label]) => <option key={d} value={d}>{label}</option>)}
                        </select>
                        <span>o más</span>
                      </div>
                    )}
                    {audience.type === 'new' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Primera visita en</span>
                        <select aria-label="Periodo" className={`${inputCls} !w-auto`} value={audience.days} onChange={(e) => setAudience((a) => ({ ...a, days: Number(e.target.value) }))}>
                          {NEW_OPTIONS.map(([d, label]) => <option key={d} value={d}>{label}</option>)}
                        </select>
                      </div>
                    )}
                    {audience.type === 'frequent' && (
                      <select aria-label="Visitas" className={inputCls} value={audience.visits} onChange={(e) => setAudience((a) => ({ ...a, visits: Number(e.target.value) }))}>
                        {FREQUENT_OPTIONS.map(([n, label]) => <option key={n} value={n}>{label}</option>)}
                      </select>
                    )}
                    {segmented && segment && (
                      <p className="text-[13px] text-gray-600">
                        <b className="tabular-nums text-gray-900">{segment.reachable}</b> {segment.reachable === 1 ? 'persona lo recibirá' : 'personas lo recibirán'}
                        {segment.total > segment.reachable && <span className="text-gray-400"> · {segment.total - segment.reachable} más están en este grupo pero no aceptaron recibir emails</span>}
                        {segment.sample.length > 0 && <span className="block text-xs text-gray-400 mt-0.5 truncate">{segment.sample.join(', ')}{segment.reachable > segment.sample.length ? '…' : ''}</span>}
                      </p>
                    )}
                  </div>
                )}
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
                      ? `Has alcanzado el límite de ${MONTHLY_LIMIT} campañas este mes.`
                      : segmented
                        ? (segment ? `Se enviará a ${recipients} ${recipients === 1 ? 'persona' : 'personas'}.` : 'Elige un grupo para ver cuántas personas lo recibirán.')
                        : `Se enviará a ${subscribers.length} suscriptor${plural ? 'es' : ''}.`}
                  </p>
                  <button type="button" onClick={handleSend} disabled={sending || remaining === 0 || (segmented && recipients === 0)}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
                    {sending ? 'Enviando…' : 'Enviar campaña'}
                  </button>
                </div>
              </>
            )}

            <p className="text-xs text-gray-400 leading-relaxed pt-2">
              Solo se envía a clientes que aceptaron explícitamente recibir comunicaciones. Cada email incluye un enlace
              de baja automático y el límite es de {MONTHLY_LIMIT} campañas al mes. Tú eres el responsable del tratamiento de estos datos según el RGPD.
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
                      <p className="text-[13px] text-gray-500 truncate">
                        {new Date(c.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}{c.audience ? ` · ${c.audience}` : ''}
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
