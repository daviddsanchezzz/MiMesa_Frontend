import { useState } from 'react';
import { Segmented } from '../../ui/kit';
import { ALLERGENS, chipCls, inputCls, languageName } from './labels';

const toggle = (list, key) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);

/** Saved extras → what the form edits (price as text). */
export const toEditor = (extras) => (extras || []).map((x) => ({ name: x.name || {}, price: x.price === null || x.price === undefined ? '' : String(x.price).replace('.', ','), allergens: x.allergens || [] }));

/** The form → what the API takes. Rows left without a name are dropped. */
export const fromEditor = (rows) => rows
  .filter((x) => Object.values(x.name || {}).some((t) => t?.trim()))
  .map((x) => ({ name: x.name, price: String(x.price).trim() === '' ? null : Number(String(x.price).replace(',', '.')), allergens: x.allergens || [] }));

/**
 * Extras the customer can add: "Masa sin gluten +5 €", "Extra de queso +1,50 €". On a dish they are for
 * that dish; on a category, for every dish in it. Names per language, price and allergens optional.
 */
export default function ExtrasEditor({ rows, onChange, languages, scope, lang: sharedLang }) {
  // Inside a modal that already has its language tabs, those decide the language and this one shows none
  const [ownLang, setLang] = useState(languages[0]);
  const lang = sharedLang || ownLang;
  const set = (i, patch) => onChange(rows.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const options = languages.map((l) => [l, languageName(l)]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
        <p className="text-xs font-semibold text-gray-500">Extras <span className="font-normal text-gray-400">{scope === 'category' ? '(valen para todos los platos de la categoría)' : '(opcionales)'}</span></p>
        {!sharedLang && languages.length > 1 && rows.length > 0 && <Segmented value={lang} onChange={setLang} options={options} size="sm" />}
      </div>
      {rows.length === 0 && <p className="text-[13px] text-gray-400 mb-2">{scope === 'category' ? 'Por ejemplo: «Masa sin gluten +5 €» en las pizzas.' : 'Por ejemplo: «Extra de queso +1,50 €».'}</p>}
      <ul className="space-y-3">
        {rows.map((x, i) => (
          <li key={i}>
            <div className="flex items-center gap-2">
              <input className={inputCls} value={x.name[lang] || ''} maxLength={80} placeholder={lang === languages[0] ? 'Masa sin gluten, extra de queso…' : 'Traducción'}
                onChange={(e) => set(i, { name: { ...x.name, [lang]: e.target.value } })} />
              <div className="relative shrink-0">
                <input className={`${inputCls} !w-24 text-right tabular-nums pr-7`} inputMode="decimal" value={x.price} placeholder="Gratis" onChange={(e) => set(i, { price: e.target.value })} aria-label="Precio del extra" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">€</span>
              </div>
              <button type="button" aria-label="Quitar extra" className="px-1.5 text-gray-400 hover:text-rose-600" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>✕</button>
            </div>
            <details className="mt-1">
              <summary className="text-xs text-gray-500 cursor-pointer">Alérgenos{x.allergens?.length ? ` (${x.allergens.length})` : ''}</summary>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ALLERGENS.map((a) => (
                  <button key={a.key} type="button" className={chipCls((x.allergens || []).includes(a.key))} onClick={() => set(i, { allergens: toggle(x.allergens || [], a.key) })}>
                    <span aria-hidden="true">{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {rows.length < 12 && (
        <button type="button" className="mt-2 text-[13px] font-semibold text-violet-700" onClick={() => onChange([...rows, { name: {}, price: '', allergens: [] }])}>+ Añadir extra</button>
      )}
    </div>
  );
}
