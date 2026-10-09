import { useMemo, useState } from 'react';
import api from '../../services/api';
import { useData } from '../../lib/query';
import { dateShort, money } from '../../lib/format';
import { Empty, FigureLine, FilterChips, GhostButton, MoreMenu } from '../../ui/kit';
import { Loading } from '../../ui/feedback';
import { Chip, DataTable } from '../../ui/list';
import ImportSalesModal from './ImportSalesModal';
import StockModal from './StockModal';
import WasteModal from './WasteModal';
import { qty } from './format';

const iso = (d) => d.toISOString().slice(0, 10);
const PERIODS = [['7', '7 días'], ['30', '30 días'], ['month', 'Este mes']];
function rangeOf(period) {
  const to = new Date();
  if (period === 'month') return { from: iso(new Date(to.getFullYear(), to.getMonth(), 1, 12)), to: iso(to) };
  return { from: iso(new Date(to.getTime() - (Number(period) - 1) * 86400000)), to: iso(to) };
}

/** How far the gap is from what the sales explain: green when it matches, amber and rose as it grows; negative is stock used from before. */
const toneOf = (row) => (row.difference <= 0 || row.differencePct === null ? 'gray' : row.differencePct < 10 ? 'green' : row.differencePct < 25 ? 'amber' : 'rose');
const gap = (row) => (Math.abs(row.difference) < 0.0005 ? 'Cuadra' : `${row.difference > 0 ? 'Faltan' : 'Sobran'} ${qty(Math.abs(row.difference), row.unit)}`);

/**
 * Consumo: what the kitchen should have used according to what was sold and the recipes, against what was bought,
 * thrown away and counted. The gap is stock that left without a sale.
 */
export default function Consumo({ ingredients }) {
  const [period, setPeriod] = useState('30');
  const [modal, setModal] = useState(null);   // 'sales' | 'stock' | 'waste'
  const { from, to } = useMemo(() => rangeOf(period), [period]);
  const q = useData(['consumption', 'report', from, to], () => api.get('/consumption/report', { params: { from, to } }).then((r) => r.data), { retry: false });
  const d = q.data;
  const noSales = d && d.sales.units === 0;
  const coverage = d && d.sales.units > 0 ? Math.round((d.sales.covered / d.sales.units) * 100) : null;
  const refresh = () => q.refetch();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips value={period} onChange={setPeriod} options={PERIODS} />
        <div className="hidden flex-wrap gap-2 sm:ml-auto sm:flex">
          <GhostButton onClick={() => setModal('sales')}>Importar ventas</GhostButton>
          <GhostButton onClick={() => setModal('stock')}>Contar stock</GhostButton>
          <GhostButton onClick={() => setModal('waste')}>Registrar merma</GhostButton>
        </div>
        <div className="ml-auto sm:hidden">
          <MoreMenu items={[{ label: 'Importar ventas', onClick: () => setModal('sales') }, { label: 'Contar stock', onClick: () => setModal('stock') }, { label: 'Registrar merma', onClick: () => setModal('waste') }]} />
        </div>
      </div>

      {q.isLoading && <Loading />}
      {q.isError && <Empty>No se ha podido cargar el consumo.</Empty>}

      {noSales && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Cruza lo que vendes con lo que compras</h2>
          <p className="mt-1 text-sm text-gray-500">Sube el informe de ventas por artículo de tu TPV: con los escandallos de tus platos sabremos cuánto de cada ingrediente deberías haber gastado y lo compararemos con tus facturas.</p>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            <li><b>1.</b> Importa las ventas por plato de los últimos días.</li>
            <li><b>2.</b> Ten hechos los escandallos de tus platos más vendidos.</li>
            <li><b>3.</b> Cuenta el stock de vez en cuando para saber qué se pierde de verdad.</li>
          </ol>
        </div>
      )}

      {d && !noSales && (
        <>
          <FigureLine items={[
            { label: `uds vendidas en ${d.sales.days} ${d.sales.days === 1 ? 'día' : 'días'}`, value: d.sales.units.toLocaleString('es-ES') },
            { label: 'con escandallo', value: `${coverage} %`, tone: coverage < 60 ? 'warn' : undefined },
            { label: 'de diferencia', value: money(d.totals.lost), tone: d.totals.lost > 0 ? 'warn' : undefined },
            d.totals.wasted > 0 && { label: 'en mermas', value: money(d.totals.wasted) },
          ]} />
          <p className="-mt-3 text-[13px] text-gray-500">
            {dateShort(d.from)} – {dateShort(d.to)} · {d.counts ? `con los conteos del ${dateShort(d.counts.opening)} y el ${dateShort(d.counts.closing)}` : 'sin dos conteos de stock: solo se compara lo comprado con lo vendido'}
          </p>

          {coverage < 100 && d.sales.uncovered.length > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {d.sales.uncovered.length} {d.sales.uncovered.length === 1 ? 'plato vendido no cuenta' : 'platos vendidos no cuentan'} (sin escandallo o sin reconocer): {d.sales.uncovered.slice(0, 3).map((u) => `${u.name} (${u.units})`).join(', ')}{d.sales.uncovered.length > 3 ? '…' : ''}.
            </p>
          )}

          {d.rows.length === 0 ? <Empty>Todavía no hay compras ni consumo de ingredientes en este periodo.</Empty> : (
            <DataTable rows={d.rows} rowKey={(r) => r.ingredientId}
              mobile={(r) => ({
                title: r.name,
                subtitle: `Debería ${qty(r.theoretical, r.unit)} · comprado ${qty(r.purchased, r.unit)}${r.wasted ? ` · merma ${qty(r.wasted, r.unit)}` : ''}`,
                value: gap(r), valueSub: r.value !== null && Math.abs(r.value) >= 0.5 ? money(Math.abs(r.value)) : undefined,
              })}
              columns={[
                { label: 'Ingrediente', span: 3, render: (r) => <span className="block truncate text-[15px] font-medium text-gray-900">{r.name}</span> },
                { label: 'Debería', span: 2, align: 'right', render: (r) => <span className="tabular-nums">{qty(r.theoretical, r.unit)}</span> },
                { label: 'Comprado', span: 2, align: 'right', render: (r) => <span className="tabular-nums">{qty(r.purchased, r.unit)}</span> },
                { label: 'Mermas', span: 2, align: 'right', render: (r) => <span className="tabular-nums text-gray-500">{r.wasted ? qty(r.wasted, r.unit) : '—'}</span> },
                { label: 'Diferencia', span: 3, align: 'right', render: (r) => (
                  <span className="inline-flex items-center justify-end gap-2">
                    {r.value !== null && Math.abs(r.value) >= 0.5 && <span className="tabular-nums text-gray-500">{money(Math.abs(r.value))}</span>}
                    <Chip tone={toneOf(r)}>{gap(r)}</Chip>
                  </span>
                ) },
              ]} />
          )}
        </>
      )}

      {modal === 'sales' && <ImportSalesModal onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'stock' && <StockModal ingredients={ingredients} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'waste' && <WasteModal ingredients={ingredients} onClose={() => setModal(null)} onDone={refresh} />}
    </section>
  );
}
