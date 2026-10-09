import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/query';
import { Empty, GhostButton, MenuButton, PrimaryButton, RowAction, Section, SectionLink } from '../ui/kit';
import Page from '../ui/Page';
import CategoryModal from './carta/CategoryModal';
import DailyMenuModal from './carta/DailyMenuModal';
import ImportMenuModal from './carta/ImportMenuModal';
import ItemModal from './carta/ItemModal';
import LanguagesModal from './carta/LanguagesModal';
import ClearMenuModal from './carta/ClearMenuModal';
import { ALLERGENS, TAGS, eur, languageName, textOf } from './carta/labels';

const ICONS = Object.fromEntries([...ALLERGENS, ...TAGS].map((x) => [x.key, x.icon]));

function ItemRow({ item, language, manager, onOpen, onSoldOut, drag }) {
  const flags = [...item.tags, ...item.allergens].map((k) => ICONS[k]).filter(Boolean).join(' ');
  return (
    <li className={`flex items-center gap-3 py-2.5 ${item.hidden || item.retired ? 'opacity-60' : ''} ${drag?.dragging ? 'opacity-40' : ''} ${drag?.over ? 'border-t-2 border-violet-400 -mt-px' : ''} ${manager ? 'lg:cursor-grab' : ''}`}
      draggable={manager && !!drag} onDragStart={drag?.onDragStart} onDragEnd={drag?.onDragEnd} onDragOver={drag?.onDragOver} onDragLeave={drag?.onDragLeave} onDrop={drag?.onDrop}>
      {item.photo?.url && <img src={item.photo.url} alt="" loading="lazy" className="w-12 h-12 shrink-0 rounded-xl object-cover bg-gray-100" />}
      <button type="button" disabled={!manager} onClick={onOpen} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className={`block text-[15px] font-medium truncate ${item.soldOut ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{textOf(item.name, language)}</span>
        <span className="block text-[13px] text-gray-500 truncate">
          {flags}
          {item.extras?.length > 0 && <span className="ml-1.5">· {item.extras.length} {item.extras.length === 1 ? 'extra' : 'extras'}</span>}
          {item.hidden && <span className="ml-1.5">· Oculto de la web</span>}
          {item.retired && <span className="ml-1.5 text-amber-700">· Ya no está en el TPV</span>}
          {!flags && !item.extras?.length && !item.hidden && !item.retired && (textOf(item.description, language) || ' ')}
        </span>
      </button>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold tabular-nums text-gray-900">{eur(item.price)}</span>
        {item.priceSource === 'tpv' && <span className="block text-[11px] text-gray-400 leading-3">🔒 TPV</span>}
      </span>
      <RowAction tone={item.soldOut ? 'warn' : 'neutral'} onClick={onSoldOut}>{item.soldOut ? 'Agotado' : 'Hay'}</RowAction>
    </li>
  );
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');

/** When the menú del día is on, in words: "Lun–Vie · del 5 oct al 9 oct". */
function dailyWhen(d) {
  const days = [...(d.days || [])];
  const text = !days.length || days.length === 7 ? 'Todos los días'
    : days.length > 2 && days.every((x, i) => i === 0 || x === days[i - 1] + 1) ? `${DAY_NAMES[days[0]]}–${DAY_NAMES[days[days.length - 1]]}`
      : days.map((x) => DAY_NAMES[x]).join(', ');
  const range = d.from && d.to ? ` · del ${shortDate(d.from)} al ${shortDate(d.to)}` : d.from ? ` · desde el ${shortDate(d.from)}` : d.to ? ` · hasta el ${shortDate(d.to)}` : '';
  return text + range;
}

export default function Carta() {
  const { hasRole } = useAuth();
  const manager = hasRole('manager');
  const owner = hasRole('owner');
  const q = useData(['menu'], () => api.get('/menu').then((r) => r.data), { retry: false });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [drag, setDrag] = useState(null);   // { type: 'item'|'cat', id } while something is being dragged
  const [over, setOver] = useState(null);   // what it is over: 'cat:<id>' or 'item:<id>' // { type: 'item'|'category'|'languages'|'import', ... }

  const menu = q.data;
  const languages = menu?.languages || ['es'];
  const language = languages[0];
  const categories = menu?.categories || [];
  const items = menu?.items || [];

  const missingQ = useData(['menu', 'missing'], () => api.get('/menu/translate-missing').then((r) => r.data), { enabled: manager && languages.length > 1, retry: false });
  const missing = languages.length > 1 ? missingQ.data?.texts || 0 : 0;
  const [translating, setTranslating] = useState(false);

  async function translateAll() {
    setTranslating(true);
    let total = 0;
    try {
      // The server translates up to a batch at a time; keep asking while there is more
      for (let i = 0; i < 6; i++) {
        const { data } = await api.post('/menu/translate-missing');
        total += data.translated;
        if (!data.remaining || !data.translated) break;
      }
      toast.success(total ? `${total} textos traducidos` : 'No había nada que traducir');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se ha podido traducir');
    } finally {
      setTranslating(false);
      q.refetch();
      missingQ.refetch();
    }
  }


  const needle = search.trim().toLocaleLowerCase('es');
  // Each category with its own dishes and, one level down, its subcategories with theirs
  const byCategory = useMemo(() => {
    const dishes = (c) => items.filter((i) => i.categoryId === c._id && (!needle || Object.values(i.name || {}).some((n) => n.toLocaleLowerCase('es').includes(needle))));
    return categories.filter((c) => !c.parentId).map((c) => ({
      category: c,
      items: dishes(c),
      subs: categories.filter((s) => s.parentId === c._id).map((s) => ({ category: s, items: dishes(s) })).filter((g) => !needle || g.items.length),
    })).filter((g) => !needle || g.items.length || g.subs.length);
  }, [categories, items, needle]);

  const refresh = () => q.refetch();
  const done = () => { setModal(null); refresh(); };
  const fail = (err) => toast.error(err?.response?.data?.message || 'No se ha podido guardar');

  async function toggleSoldOut(item) {
    try { await api.patch(`/menu/items/${item._id}/sold-out`, { soldOut: !item.soldOut }); refresh(); } catch (err) { fail(err); }
  }
  async function moveCategory(id, dir) {
    // Only among its siblings: top-level categories, or the subcategories of the same category
    const parent = categories.find((c) => c._id === id)?.parentId || null;
    const ids = categories.filter((c) => (c.parentId || null) === parent).map((c) => c._id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.put('/menu/categories/order', { ids }); refresh(); } catch (err) { fail(err); }
  }
  async function moveItem(item, dir) {
    const ids = items.filter((i) => i.categoryId === item.categoryId).map((i) => i._id);
    const i = ids.indexOf(item._id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.put('/menu/items/order', { categoryId: item.categoryId, ids }); refresh(); } catch (err) { fail(err); }
  }
  /** Drop a dish in a category (at the end) or before another dish of it. Also reorders inside the same category. */
  async function dropItem(itemId, categoryId, beforeId = null) {
    const item = items.find((i) => i._id === itemId);
    if (!item || itemId === beforeId) return;
    try {
      if (item.categoryId !== categoryId) await api.put(`/menu/items/${itemId}`, { categoryId });
      const ids = items.filter((i) => i.categoryId === categoryId && i._id !== itemId).map((i) => i._id);
      const at = beforeId ? ids.indexOf(beforeId) : -1;
      ids.splice(at === -1 ? ids.length : at, 0, itemId);
      if (item.categoryId !== categoryId || beforeId) await api.put('/menu/items/order', { categoryId, ids });
      refresh();
    } catch (err) { fail(err); }
  }
  /** Drop a category before another one of the same level (top-level among top-level, subcategory among its siblings). */
  async function dropCategory(dragId, beforeId) {
    const a = categories.find((c) => c._id === dragId);
    const b = categories.find((c) => c._id === beforeId);
    if (!a || !b || a._id === b._id || (a.parentId || null) !== (b.parentId || null)) return;
    const ids = categories.filter((c) => (c.parentId || null) === (a.parentId || null) && c._id !== a._id).map((c) => c._id);
    ids.splice(ids.indexOf(b._id), 0, a._id);
    try { await api.put('/menu/categories/order', { ids }); refresh(); } catch (err) { fail(err); }
  }
  const endDrag = () => { setDrag(null); setOver(null); };

  async function toggleCategory(c) {
    try { await api.put(`/menu/categories/${c._id}`, { hidden: !c.hidden }); refresh(); } catch (err) { fail(err); }
  }
  async function removeCategory(c) {
    if (!window.confirm(`¿Borrar la categoría «${textOf(c.name, language)}»?`)) return;
    try { await api.delete(`/menu/categories/${c._id}`); refresh(); } catch (err) { fail(err); }
  }

  const subtitle = menu ? `${items.length} ${items.length === 1 ? 'plato' : 'platos'} · ${languages.map(languageName).join(', ')}` : 'Platos, precios y alérgenos';

  return (
    <Page title="Carta" subtitle={subtitle}
      primary={manager && categories.length > 0 ? { label: 'Nuevo plato', short: 'Plato', onClick: () => setModal({ type: 'item' }) } : undefined}
      menu={manager ? [
        { label: 'Nueva categoría', onClick: () => setModal({ type: 'category' }) },
        { label: 'Importar platos', onClick: () => setModal({ type: 'import' }) },
        { label: 'Idiomas', onClick: () => setModal({ type: 'languages' }) },
        missing > 0 && { label: translating ? 'Traduciendo…' : `Traducir lo que falta (${missing})`, onClick: () => { if (!translating) translateAll(); } },
      ] : undefined}>

      {menu && (menu.daily || manager) && (
        <Section title="Menú del día" aside={manager ? <SectionLink onClick={() => setModal({ type: 'daily' })}>{menu.daily ? 'Editar' : 'Configurar'}</SectionLink> : null}>
          {menu.daily ? (
            <div className={`py-2 ${menu.daily.active ? '' : 'opacity-60'}`}>
              <p className="flex items-baseline gap-3">
                <span className="text-[15px] font-medium text-gray-900">{textOf(menu.daily.title, language) || 'Menú del día'}</span>
                <span className="text-[15px] font-semibold tabular-nums text-gray-900">{eur(menu.daily.price)}</span>
                {!menu.daily.active && <span className="text-xs font-semibold text-gray-400">Desactivado</span>}
              </p>
              <p className="text-[13px] text-gray-500">{dailyWhen(menu.daily)}</p>
              <ul className="mt-1.5 space-y-0.5 text-[13px] text-gray-600">
                {menu.daily.courses.map((c, i) => (
                  <li key={i}><b className="font-medium text-gray-800">{textOf(c.name, language)}:</b> {c.options.map((o) => textOf(o.name, language)).join(' · ') || '—'}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-2 text-sm text-gray-500">Si ofreces menú del día, ponlo aquí con su precio y sus platos para que salga en la web.</p>
          )}
        </Section>
      )}

      {items.length > 8 && (
        <input className="w-full lg:max-w-sm h-11 rounded-xl border border-gray-200 px-3.5 text-[15px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="Buscar un plato…" value={search} onChange={(e) => setSearch(e.target.value)} />
      )}

      {q.isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {menu && categories.length === 0 && (
        <Empty>
          Aún no hay carta.{manager ? ' Importa tus platos o crea la primera categoría.' : ''}
          {manager && (
            <span className="mt-3 flex flex-wrap justify-center gap-2">
              <PrimaryButton icon={null} onClick={() => setModal({ type: 'import' })}>Importar platos</PrimaryButton>
              <GhostButton onClick={() => setModal({ type: 'category' })}>Crear categoría</GhostButton>
            </span>
          )}
        </Empty>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-14 gap-y-9 items-start">
        {byCategory.map(({ category: c, items: list, subs }) => {
          const parentName = textOf(c.name, language);
          // The same block for a category and for a subcategory (a smaller heading and no further subcategories)
          const block = (cat, dishes, sub) => (
            <div key={cat._id} className={`${cat.hidden ? 'opacity-70' : ''} ${sub ? 'mt-5 pl-3.5 border-l-2 border-gray-100' : ''} ${drag?.type === 'item' && over === `cat:${cat._id}` ? 'rounded-xl bg-violet-50/60 ring-2 ring-violet-300 ring-offset-4 ring-offset-white' : ''}`}
              onDragOver={(e) => { if (manager && drag?.type === 'item') { e.preventDefault(); setOver(`cat:${cat._id}`); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === `cat:${cat._id}` ? null : o)); }}
              onDrop={(e) => { if (!manager || drag?.type !== 'item') return; e.preventDefault(); const id = drag.id; endDrag(); dropItem(id, cat._id); }}>
              <div className={`flex items-center justify-between gap-3 border-b pb-1.5 ${sub ? 'border-gray-100' : 'border-gray-200'} ${drag?.type === 'cat' && drag.id === cat._id ? 'opacity-40' : ''} ${drag?.type === 'cat' && over === `hdr:${cat._id}` && drag.id !== cat._id ? 'border-b-2 !border-violet-400' : ''} ${manager ? 'lg:cursor-grab' : ''}`}
                draggable={manager} onDragStart={(e) => { e.dataTransfer.setData('text/plain', cat._id); e.dataTransfer.effectAllowed = 'move'; setDrag({ type: 'cat', id: cat._id }); }} onDragEnd={endDrag}
                onDragOver={(e) => { if (manager && drag?.type === 'cat' && (categories.find((c) => c._id === drag.id)?.parentId || null) === (cat.parentId || null)) { e.preventDefault(); setOver(`hdr:${cat._id}`); } }}
                onDrop={(e) => { if (drag?.type !== 'cat') return; e.preventDefault(); const id = drag.id; endDrag(); dropCategory(id, cat._id); }}>
                <h2 className={`min-w-0 truncate font-semibold ${sub ? 'text-[13px] text-gray-700' : 'text-[13px] uppercase tracking-wide text-gray-500'}`}>
                  {textOf(cat.name, language)}{cat.hidden && <span className="ml-2 normal-case font-medium text-gray-400">· Oculta de la web</span>}
                </h2>
                {manager && (
                  <MenuButton ariaLabel={sub ? 'Opciones de la subcategoría' : 'Opciones de la categoría'} className="w-8 h-8 justify-center text-gray-400" items={[
                    { label: 'Añadir plato', onClick: () => setModal({ type: 'item', categoryId: cat._id }) },
                    ...(sub ? [] : [{ label: 'Añadir subcategoría', onClick: () => setModal({ type: 'category', parentId: cat._id, parentName }) }]),
                    { label: 'Editar nombre', onClick: () => setModal({ type: 'category', category: cat, parentName: sub ? parentName : '' }) },
                    { label: cat.hidden ? 'Mostrar en la web' : 'Ocultar de la web', onClick: () => toggleCategory(cat) },
                    { label: 'Subir', onClick: () => moveCategory(cat._id, -1) },
                    { label: 'Bajar', onClick: () => moveCategory(cat._id, 1) },
                    { label: sub ? 'Borrar subcategoría' : 'Borrar categoría', onClick: () => removeCategory(cat) },
                  ]}>
                    <span aria-hidden="true" className="text-xl leading-none pb-1">⋯</span>
                  </MenuButton>
                )}
              </div>
              {textOf(cat.description, language) && <p className="pt-1.5 text-[13px] text-gray-500">{textOf(cat.description, language)}</p>}
              {cat.extras?.length > 0 && (
                <p className="pt-1.5 text-[13px] text-gray-500">
                  Extras en todos los platos: {cat.extras.map((x) => `${textOf(x.name, language)}${x.price !== null && x.price !== undefined ? ` +${eur(x.price)}` : ''}`).join(' · ')}
                </p>
              )}
              {dishes.length === 0 ? (
                !(!sub && subs.length) && <p className="py-3 text-sm text-gray-400">Sin platos.{manager && <button type="button" className="ml-2 font-semibold text-violet-700" onClick={() => setModal({ type: 'item', categoryId: cat._id })}>+ Añadir</button>}</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {dishes.map((item) => (
                    <ItemRow key={item._id} item={item} language={language} manager={manager}
                      onOpen={() => setModal({ type: 'item', item })} onSoldOut={() => toggleSoldOut(item)}
                      drag={manager ? {
                        dragging: drag?.type === 'item' && drag.id === item._id,
                        over: drag?.type === 'item' && over === `item:${item._id}` && drag.id !== item._id,
                        onDragStart: (e) => { e.dataTransfer.setData('text/plain', item._id); e.dataTransfer.effectAllowed = 'move'; setDrag({ type: 'item', id: item._id }); },
                        onDragEnd: endDrag,
                        onDragOver: (e) => { if (drag?.type === 'item') { e.preventDefault(); e.stopPropagation(); setOver(`item:${item._id}`); } },
                        onDragLeave: () => setOver((o) => (o === `item:${item._id}` ? null : o)),
                        onDrop: (e) => { if (drag?.type !== 'item') return; e.preventDefault(); e.stopPropagation(); const id = drag.id; endDrag(); dropItem(id, cat._id, item._id); },
                      } : undefined} />
                  ))}
                </ul>
              )}
            </div>
          );
          return (
            <section key={c._id}>
              {block(c, list, false)}
              {subs.map((g) => block(g.category, g.items, true))}
            </section>
          );
        })}
      </div>

      {owner && categories.length > 0 && (
        <div className="pt-6 border-t border-gray-100">
          <button type="button" onClick={() => setModal({ type: 'clear' })} className="text-[13px] font-semibold text-rose-600 hover:text-rose-700">Eliminar toda la carta</button>
          <p className="text-xs text-gray-400 mt-0.5">Borra todos los platos, categorías, fotos y el menú del día para empezar de cero.</p>
        </div>
      )}

      {modal?.type === 'item' && (
        <ItemModal item={modal.item} categoryId={modal.categoryId} categories={categories} languages={languages} canMove={!!modal.item}
          onMove={(dir) => { moveItem(modal.item, dir); }} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.type === 'category' && <CategoryModal category={modal.category} parentId={modal.parentId} parentName={modal.parentName} languages={languages} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.type === 'clear' && <ClearMenuModal items={items.length} categories={categories.length} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'daily' && <DailyMenuModal daily={menu.daily} languages={languages} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.type === 'languages' && <LanguagesModal languages={languages} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.type === 'import' && <ImportMenuModal onClose={() => setModal(null)} onDone={done} />}
    </Page>
  );
}
