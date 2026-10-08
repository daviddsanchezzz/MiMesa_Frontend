import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import { useSetMobileHeader } from '../context/MobileHeaderContext';
import { useData } from '../lib/query';
import Icon from '../ui/Icon';
import { Empty, FigureLine, GhostButton, PageHeader, Section, SectionLink, Segmented, Tabs } from '../ui/kit';
import { inputCls } from './carta/labels';
import AlertSettingsModal from './costes/AlertSettingsModal';
import Change from './costes/Change';
import { Sparkline } from './costes/Charts';
import IngredientModal from './costes/IngredientModal';
import LinkModal from './costes/LinkModal';
import { ago, money, perUnit, shortDate } from './costes/format';

/** One ingredient: name and where it was bought on the left, its shape and today's price on the right. */
function IngredientRow({ ing, onOpen }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3 text-left active:bg-gray-50 lg:gap-5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-gray-900">{ing.name}</span>
          <span className="block truncate text-[13px] text-gray-500">
            {ing.count ? `${ing.supplier ? `${ing.supplier} · ` : ''}${ago(ing.lastDate)}` : 'Sin compras todavía'}
          </span>
        </span>
        <span className="hidden sm:block"><Sparkline values={ing.spark} width={88} /></span>
        <span className="w-[104px] shrink-0 text-right lg:w-[120px]">
          <span className="block text-[15px] font-semibold tabular-nums text-gray-900">{ing.lastPrice === null ? '—' : perUnit(ing.lastPrice, ing.unit)}</span>
          <span className="mt-0.5 block h-5">{ing.changePct !== null && <Change value={ing.changePct} />}</span>
        </span>
      </button>
    </li>
  );
}

/** The ones that rose: what it was, what it is, by how much. */
function RiserRow({ ing, onOpen, hideOnPhone }) {
  return (
    <li className={hideOnPhone ? 'hidden lg:block' : ''}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-gray-900">{ing.name}</span>
          <span className="block truncate text-[13px] tabular-nums text-gray-500">{money(ing.prevPrice)} → {perUnit(ing.lastPrice, ing.unit)}</span>
        </span>
        <Change value={ing.changePct} />
      </button>
    </li>
  );
}

function PendingRow({ group, onOpen }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3.5 text-left active:bg-gray-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-gray-900">{group.description}</span>
          <span className="block truncate text-[13px] text-gray-500">
            {group.lines} {group.lines === 1 ? 'línea' : 'líneas'}{group.suppliers.length ? ` · ${group.suppliers[0]}` : ''}{group.lastDate ? ` · ${shortDate(group.lastDate)}` : ''}
            {group.lastUnitPrice !== null ? ` · ${money(group.lastUnitPrice)}` : ''}
          </span>
        </span>
        <span className="hidden shrink-0 text-[13px] text-gray-400 sm:block">Parece <b className="font-medium text-gray-600">{group.suggestion.name}</b> · {group.suggestion.unit}</span>
        <span className="shrink-0 text-[13px] font-semibold text-violet-700">Vincular</span>
      </button>
    </li>
  );
}

/**
 * Costes: what each ingredient costs you, read from your invoices. A line of an invoice is linked to an
 * ingredient once; from then on every invoice updates its price, its history and the warnings.
 */
export default function Costes() {
  useSetMobileHeader({ title: 'Costes' });
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'vincular' ? 'vincular' : 'ingredientes';
  const list = useData(['ingredients', 'list'], () => api.get('/ingredients').then((r) => r.data), { retry: false });
  const inbox = useData(['ingredients', 'inbox'], () => api.get('/ingredients/inbox').then((r) => r.data), { retry: false });
  const [search, setSearch] = useState('');
  const [view, setView] = useState('todos');
  const [open, setOpen] = useState(null);       // ingredient id
  const [linking, setLinking] = useState(null); // a group of the inbox
  const [settings, setSettings] = useState(false);

  const ingredients = list.data?.ingredients || [];
  const alertPct = list.data?.alertPct || 5;
  const groups = inbox.data?.groups || [];
  const pending = list.data?.pending ?? groups.length;

  const recent = (d) => d && (Date.now() - new Date(`${d}T12:00:00`).getTime()) / 86400000 <= 30;
  const risers = useMemo(() => ingredients.filter((i) => i.changePct !== null && i.changePct >= alertPct && recent(i.lastDate)).sort((a, b) => b.changePct - a.changePct), [ingredients, alertPct]);
  const fallers = useMemo(() => ingredients.filter((i) => i.changePct !== null && i.changePct <= -alertPct), [ingredients, alertPct]);

  const needle = search.trim().toLocaleLowerCase('es');
  const shown = useMemo(() => ingredients
    .filter((i) => (view === 'suben' ? i.changePct > 0 : view === 'bajan' ? i.changePct < 0 : true))
    .filter((i) => !needle || i.name.toLocaleLowerCase('es').includes(needle)), [ingredients, view, needle]);

  const setTab = (t) => setParams(t === 'vincular' ? { tab: 'vincular' } : {}, { replace: true });
  const refresh = () => { list.refetch(); inbox.refetch(); };
  const linked = ({ ingredient, linked: n }) => {
    setLinking(null);
    toast.success(`${n} ${n === 1 ? 'línea vinculada' : 'líneas vinculadas'} a ${ingredient.name}`);
    refresh();
  };

  const empty = list.isSuccess && ingredients.length === 0 && groups.length === 0;

  return (
    <div className="w-full space-y-7 pb-16">
      <PageHeader title="Costes" subtitle="Cuánto te cuesta cada ingrediente, según tus facturas"
        actions={<Link to="/compras/facturas/nueva" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"><Icon name="plus" className="h-4 w-4" strokeWidth={2} />Subir una factura</Link>} />

      {!empty && (
        <FigureLine items={[
          { label: ingredients.length === 1 ? 'ingrediente' : 'ingredientes', value: ingredients.length },
          risers.length > 0 && { label: risers.length === 1 ? 'ha subido' : 'han subido', value: risers.length, tone: 'warn' },
          fallers.length > 0 && { label: fallers.length === 1 ? 'ha bajado' : 'han bajado', value: fallers.length, tone: 'good' },
          pending > 0 && { label: 'por vincular', value: pending },
        ]} />
      )}

      {empty ? (
        <section className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Empieza con una factura</h2>
          <p className="mt-1 text-sm text-gray-500">Sube la factura de un proveedor: la leemos línea a línea y, cuando la confirmes, sabrás a cuánto compras cada ingrediente y cuándo te suben el precio.</p>
          <ol className="mt-5 space-y-4">
            {[['Sube una factura', 'Con una foto o un PDF, en Compras.'], ['Vincula sus líneas a ingredientes', 'Solo una vez por producto: la próxima factura se reconoce sola.'], ['Mira cómo evolucionan tus precios', 'Con avisos cuando un ingrediente sube.']].map(([title, text], i) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">{i + 1}</span>
                <span><span className="block text-[15px] font-medium text-gray-900">{title}</span><span className="block text-sm text-gray-500">{text}</span></span>
              </li>
            ))}
          </ol>
          <div className="mt-6"><Link to="/compras/facturas/nueva" className="inline-flex h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">Subir mi primera factura</Link></div>
        </section>
      ) : (
        <>
          <Tabs value={tab} onChange={setTab} options={[['ingredientes', 'Ingredientes'], ['vincular', `Por vincular${pending ? ` · ${pending}` : ''}`]]} />

          {tab === 'ingredientes' ? (
            <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 lg:order-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <input className={`${inputCls} !h-10 w-full sm:max-w-xs`} placeholder="Buscar un ingrediente…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Segmented size="sm" value={view} onChange={setView} options={[['todos', 'Todos'], ['suben', 'Suben'], ['bajan', 'Bajan']]} />
                </div>
                {shown.length === 0 ? <Empty>{ingredients.length === 0 ? 'Aún no hay ingredientes. Vincula las líneas de tus facturas para crearlos.' : 'Ningún ingrediente coincide.'}</Empty> : (
                  <ul className="divide-y divide-gray-100">{shown.map((i) => <IngredientRow key={i.id} ing={i} onOpen={() => setOpen(i.id)} />)}</ul>
                )}
              </div>

              <aside className="space-y-8 order-first lg:order-2">
                <Section title="Han subido" aside={<SectionLink onClick={() => setSettings(true)}>Avisar desde {alertPct} %</SectionLink>}>
                  {risers.length === 0 ? <p className="py-2 text-sm text-gray-500">Ningún ingrediente ha subido un {alertPct} % o más en el último mes.</p> : (
                    <ul className="divide-y divide-gray-100">{risers.slice(0, 6).map((i, n) => <RiserRow key={i.id} ing={i} hideOnPhone={n >= 3} onOpen={() => setOpen(i.id)} />)}</ul>
                  )}
                </Section>
                {pending > 0 && (
                  <Section title="Por vincular" className="hidden lg:block">
                    <p className="text-sm text-gray-600">{pending} {pending === 1 ? 'producto de tus facturas' : 'productos de tus facturas'} aún no {pending === 1 ? 'es' : 'son'} un ingrediente, así que no cuentan en los precios.</p>
                    <div className="mt-2.5"><SectionLink onClick={() => setTab('vincular')}>Vincularlos →</SectionLink></div>
                  </Section>
                )}
              </aside>
            </div>
          ) : (
            <section>
              <p className="mb-2 max-w-2xl text-sm text-gray-500">Productos de tus facturas que aún no son un ingrediente. Dime qué son una vez y las próximas facturas se reconocen solas.</p>
              {groups.length === 0 ? <Empty action={<GhostButton onClick={() => setTab('ingredientes')}>Ver ingredientes</GhostButton>}>Todo está vinculado.</Empty> : (
                <ul className="divide-y divide-gray-100">{groups.map((g) => <PendingRow key={g.key} group={g} onOpen={() => setLinking(g)} />)}</ul>
              )}
            </section>
          )}
        </>
      )}

      {open && <IngredientModal id={open} onClose={() => setOpen(null)} onChanged={refresh} />}
      {linking && <LinkModal group={linking} ingredients={ingredients} onClose={() => setLinking(null)} onDone={linked} />}
      {settings && <AlertSettingsModal value={alertPct} onClose={() => setSettings(false)} onSaved={() => { setSettings(false); refresh(); }} />}
    </div>
  );
}
