import { useEffect, useState } from 'react';

let show = null;

/**
 * Ask before something that cannot be undone, with the look of the app instead of the browser's box.
 *   if (!(await confirmDialog('¿Eliminar este pedido?'))) return;
 *   await confirmDialog({ title: '¿Cerrar la caja?', message: 'Quedan 2 citas sin cobrar.', confirmLabel: 'Cerrar' });
 * Resolves true when confirmed, false otherwise. Destructive wording (eliminar, borrar, quitar…) turns the button red.
 */
export function confirmDialog(input) {
  const options = typeof input === 'string' ? { title: input } : { ...input };
  if (!show) return Promise.resolve(window.confirm(options.title || options.message));   // before the app is mounted
  return new Promise((resolve) => show({ ...options, resolve }));
}

const DESTRUCTIVE = /elimin|borr|quit|cancel|rechaz|desactiv|desvincul|vaciar|devolver|anular|deshacer/i;
/** «¿Eliminar este pedido?» → Eliminar */
const verbOf = (text) => (/^¿?(\p{L}{4,})/u.exec(String(text || '').trim()) || [])[1];

/** Mounted once at the root of the app. */
export function ConfirmHost() {
  const [ask, setAsk] = useState(null);
  useEffect(() => { show = setAsk; return () => { show = null; }; }, []);
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!ask) return null;
  const answer = (value) => { ask.resolve(value); setAsk(null); };
  const verb = /^¿/.test(ask.title || '') ? verbOf(ask.title)?.replace(/^./, (c) => c.toUpperCase()) : null;
  const clash = verb === 'Cancelar';   // «¿Cancelar esta cita?» → Volver / Sí, cancelar
  const danger = ask.danger ?? DESTRUCTIVE.test(`${ask.title || ''} ${ask.confirmLabel || ''}`);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-gray-900/40 p-4 sm:items-center" onClick={() => answer(false)} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="confirm-title" className="text-[17px] font-semibold leading-snug text-gray-900">{ask.title}</h2>
        {ask.message && <p className="mt-1.5 text-sm text-gray-500">{ask.message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" autoFocus onClick={() => answer(false)} className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">{ask.cancelLabel || (clash ? 'Volver' : 'Cancelar')}</button>
          <button type="button" onClick={() => answer(true)} className={`h-11 rounded-xl text-sm font-semibold text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-violet-600 hover:bg-violet-700'}`}>{ask.confirmLabel || (clash ? 'Sí, cancelar' : verb || 'Confirmar')}</button>
        </div>
      </div>
    </div>
  );
}
