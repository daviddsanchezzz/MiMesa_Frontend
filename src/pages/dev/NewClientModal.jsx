import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';

const input = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
const label = 'block text-xs font-medium text-gray-500 mb-1';

function waShare(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** The invitation link, ready to copy or send by WhatsApp. */
export function InviteLink({ link, businessName, ownerName }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  const msg = `Hola${ownerName ? ` ${ownerName.split(' ')[0]}` : ''}, ya tienes ${businessName} preparado en Vetra. Activa tu cuenta aquí: ${link}`;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input readOnly value={link} className={`${input} bg-gray-50 text-xs`} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy} className="shrink-0 px-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <a href={waShare(msg)} target="_blank" rel="noreferrer"
        className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-95">
        Enviar por WhatsApp
      </a>
    </div>
  );
}

/**
 * Vetra creates a client's business (type, plan, starting template) and invites
 * its owner, who activates the account with their own password and accepts
 * the legal documents.
 */
export default function NewClientModal({ onClose, onCreated }) {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    name: '', businessType: 'appointments', template: 'peluqueria', phone: '', address: '', plan: 'basic',
    ownerName: '', ownerEmail: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { api.get('/dev/templates').then(({ data }) => setTemplates(data || [])).catch(() => setTemplates([])); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const forType = templates.filter((t) => t.businessType === form.businessType);

  const chooseType = (businessType) => {
    const first = templates.find((t) => t.businessType === businessType);
    setForm((f) => ({ ...f, businessType, template: first?.key || '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/dev/clients', {
        business: { name: form.name, businessType: form.businessType, template: form.template || undefined, phone: form.phone, address: form.address, plan: form.plan },
        owner: { name: form.ownerName, email: form.ownerEmail },
      });
      setResult(data);
      onCreated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <Modal title="Cliente creado" onClose={onClose} size="md">
        <div className="space-y-4">
          <div className={`rounded-xl px-4 py-3 text-sm ${result.emailed ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
            {result.emailed
              ? <><strong>{result.name}</strong> está listo. Hemos enviado la invitación a <strong>{form.ownerEmail}</strong>.</>
              : <><strong>{result.name}</strong> está listo, pero el email no se ha podido enviar. Mándale el enlace tú.</>}
          </div>
          <div>
            <p className={label}>Enlace de activación (caduca en 14 días)</p>
            <InviteLink link={result.inviteLink} businessName={result.name} ownerName={form.ownerName} />
          </div>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Hecho</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nuevo cliente" subtitle="Creamos su negocio ya preparado y le invitamos a activarlo" onClose={() => !saving && onClose()} size="md">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</div>}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Negocio</p>
        <div>
          <label className={label}>Nombre *</label>
          <input required className={input} value={form.name} onChange={set('name')} placeholder="Peluquería Marta" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['appointments', 'Con citas', 'Peluquería, estética…'], ['restaurant', 'Restaurante', 'Mesas y turnos']].map(([v, t, d]) => (
            <button key={v} type="button" onClick={() => chooseType(v)}
              className={`text-left rounded-xl border px-3 py-2.5 ${form.businessType === v ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200' : 'border-gray-200'}`}>
              <span className="block text-sm font-semibold text-gray-900">{t}</span>
              <span className="block text-xs text-gray-500">{d}</span>
            </button>
          ))}
        </div>
        <div>
          <label className={label}>Empezar con</label>
          <select className={input} value={form.template} onChange={set('template')}>
            {forType.map((t) => <option key={t.key} value={t.key}>{t.label} · {t.description}</option>)}
            <option value="">Vacío (lo configura el cliente)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Teléfono</label><input className={input} value={form.phone} onChange={set('phone')} placeholder="937 00 00 00" /></div>
          <div>
            <label className={label}>Plan</label>
            <select className={input} value={form.plan} onChange={set('plan')}>
              <option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option>
            </select>
          </div>
        </div>
        <div><label className={label}>Dirección</label><input className={input} value={form.address} onChange={set('address')} placeholder="Calle Mayor 12, Mataró" /></div>

        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-2">Dueño</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Nombre *</label><input required className={input} value={form.ownerName} onChange={set('ownerName')} placeholder="Marta Soler" /></div>
          <div><label className={label}>Email *</label><input required type="email" className={input} value={form.ownerEmail} onChange={set('ownerEmail')} placeholder="marta@email.com" /></div>
        </div>
        <p className="text-xs text-gray-500">Le llegará un email para elegir su contraseña y aceptar las condiciones. Entrará directamente como propietario.</p>
        <button type="submit" disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
          {saving ? 'Creando…' : 'Crear e invitar'}
        </button>
      </form>
    </Modal>
  );
}

/** Owner status in the businesses list, with resend / copy link. */
export function OwnerCell({ b, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const [err, setErr] = useState('');
  const pill = {
    active: ['Activo', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    invited: ['Invitación pendiente', 'bg-amber-50 text-amber-800 border-amber-200'],
    expired: ['Invitación caducada', 'bg-rose-50 text-rose-700 border-rose-200'],
    none: ['Sin dueño', 'bg-gray-50 text-gray-500 border-gray-200'],
  }[b.ownerStatus || 'none'];
  async function resend() {
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post(`/dev/businesses/${b.id}/resend-owner-invite`, {});
      setLink(data.inviteLink);
      onChanged?.();
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1.5 min-w-[180px]">
      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${pill[1]}`}>{pill[0]}</span>
      {b.ownerEmail && <p className="text-xs text-gray-500 truncate max-w-[220px]">{b.ownerName ? `${b.ownerName} · ` : ''}{b.ownerEmail}</p>}
      {b.ownerStatus !== 'active' && (
        <div className="flex flex-wrap gap-1.5">
          {b.inviteLink && (
            <button type="button" className="text-[11px] font-semibold text-violet-700 hover:underline"
              onClick={() => navigator.clipboard?.writeText(b.inviteLink)}>Copiar enlace</button>
          )}
          {b.ownerEmail && (
            <button type="button" disabled={busy} onClick={resend} className="text-[11px] font-semibold text-violet-700 hover:underline disabled:opacity-50">
              {busy ? 'Enviando…' : 'Reenviar invitación'}
            </button>
          )}
        </div>
      )}
      {link && <p className="text-[11px] text-emerald-700">Enviada de nuevo.</p>}
      {err && <p className="text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}
