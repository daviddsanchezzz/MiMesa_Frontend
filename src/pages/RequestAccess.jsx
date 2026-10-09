import { useState } from 'react';
import { Link } from 'react-router-dom';
import { inputCls } from '../ui/form';

const TYPES = ['Restaurante', 'Peluquería o barbería', 'Centro de estética', 'Otro negocio con citas'];

/** Invite-only mode: ask Vetra for an account (goes to the contact form). */
export default function RequestAccess() {
  const [form, setForm] = useState({ name: '', business: '', type: TYPES[0], phone: '', email: '', message: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    const BASE = (import.meta.env.VITE_API_URL || 'https://api.vetrareserve.com').replace(/\/api\/?$/, '');
    try {
      const r = await fetch(`${BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `Solicitud de acceso: ${form.business}`,
          message: [`Negocio: ${form.business}`, `Tipo: ${form.type}`, `Teléfono: ${form.phone || '-'}`, '', form.message || '(sin mensaje)'].join('\n'),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'No se pudo enviar');
      setState('sent');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
        <p className="text-lg font-bold text-gray-900">¡Solicitud enviada!</p>
        <p className="text-sm text-gray-600">Te escribiremos a <strong>{form.email}</strong> en menos de 24 horas para preparar tu cuenta.</p>
        <Link to="/login" className="inline-block text-sm font-semibold text-violet-600 pt-2">Volver al inicio de sesión</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Empieza con Vetra</h2>
        <p className="text-gray-500 text-sm mt-1">Te preparamos la cuenta con tus servicios y horarios para que empieces a usarla desde el primer día.</p>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input required className={inputCls} placeholder="Tu nombre" value={form.name} onChange={set('name')} maxLength={100} />
        <input required className={inputCls} placeholder="Nombre del negocio" value={form.business} onChange={set('business')} maxLength={100} />
        <select className={inputCls} value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <div className="grid grid-cols-2 gap-3">
          <input required type="email" className={inputCls} placeholder="Email" value={form.email} onChange={set('email')} maxLength={200} />
          <input className={inputCls} placeholder="Teléfono" value={form.phone} onChange={set('phone')} maxLength={30} />
        </div>
        <textarea rows={3} className={inputCls} placeholder="¿Algo que debamos saber? (opcional)" value={form.message} onChange={set('message')} maxLength={1500} />
        <button type="submit" disabled={state === 'sending'}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
          {state === 'sending' ? 'Enviando…' : 'Solicitar acceso'}
        </button>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Usaremos estos datos solo para contactarte sobre Vetra. Más información en la <Link to="/legal/privacidad" target="_blank" className="underline">política de privacidad</Link>.
        </p>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta? <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Inicia sesión</Link>
      </p>
    </div>
  );
}
