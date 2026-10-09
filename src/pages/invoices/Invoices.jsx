import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../lib/query';
import invoicesApi from '../../services/invoicesApi';
import Icon from '../../ui/Icon';
import { Empty, FilterChips } from '../../ui/kit';
import Page from '../../ui/Page';
import InvoiceStatus from './InvoiceStatus';
import { apiErrorMessage, formatInvoiceDate, formatInvoiceMoney } from './invoiceUtils';
import { TableHead } from '../../ui/list';


function ListSkeleton() {
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-2 py-4">
          <div className="w-9 h-9 bg-gray-100 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-2"><div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-24 bg-gray-100 rounded animate-pulse" /></div>
          <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** The invoices (or delivery notes) of the business. Used as a section of Compras. */
export default function Invoices({ embedded = false, kind = 'INVOICE' }) {
  const navigate = useNavigate();
  const isNote = kind === 'DELIVERY_NOTE';
  const noun = isNote ? 'albarán' : 'factura';
  const addInvoice = () => navigate(`/compras/facturas/nueva${isNote ? '?tipo=albaran' : ''}`);

  const invoicesQuery = useData(['invoices', 'list', isNote ? 'notes' : 'invoices'], () => invoicesApi.list(isNote ? 'DELIVERY_NOTE' : 'INVOICE'), { retry: false });
  const all = invoicesQuery.data || [];
  const [filter, setFilter] = useState('all'); // all | review | confirmed
  const needsAction = (i) => i.status === 'REVIEW' || i.status === 'FAILED' || i.status === 'PROCESSING';
  const reviewCount = all.filter(needsAction).length;
  // What needs your attention first, then the rest as they came.
  const invoices = useMemo(() => {
    const shown = filter === 'review' ? all.filter(needsAction) : filter === 'confirmed' ? all.filter((i) => !needsAction(i)) : all;
    return [...shown].sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)));
  }, [all, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const content = (
    <>
      {invoicesQuery.isLoading && <ListSkeleton />}
      {invoicesQuery.isError && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          <p>{apiErrorMessage(invoicesQuery.error, 'No se pudieron cargar las facturas.')}</p>
          <button type="button" onClick={() => invoicesQuery.refetch()} className="mt-2 font-semibold underline underline-offset-2">Volver a intentar</button>
        </div>
      )}

      {!invoicesQuery.isLoading && !invoicesQuery.isError && all.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Icon name="receipt" className="w-6 h-6" />
          </div>
          <Empty action={<button type="button" onClick={addInvoice} className="text-sm font-semibold text-violet-700">{isNote ? 'Subir primer albarán' : 'Subir primera factura'}</button>}>
            <span className="block font-medium text-gray-900 mb-1">{isNote ? 'Todavía no tienes albaranes' : 'Todavía no tienes facturas'}</span>
            <span className="block max-w-md mx-auto">{isNote ? 'Sube el albarán cuando llegue el pedido: Vetra lo lee y, cuando llegue la factura, comprueba que cuadra con lo entregado.' : 'Sube una foto o PDF y Vetra extraerá automáticamente el proveedor, las líneas y los importes.'}</span>
          </Empty>
        </div>
      )}

      {!invoicesQuery.isLoading && !invoicesQuery.isError && all.length > 0 && (
        <FilterChips value={filter} onChange={setFilter} options={[['all', 'Todas'], ['review', 'Por revisar', reviewCount], ['confirmed', isNote ? 'Confirmados' : 'Confirmadas']]} />
      )}

      {!invoicesQuery.isLoading && !invoicesQuery.isError && all.length > 0 && invoices.length === 0 && (
        <Empty>{filter === 'review' ? `No tienes ${noun}s por revisar. 🎉` : `No hay ${noun}s de este tipo.`}</Empty>
      )}

      {!invoicesQuery.isLoading && !invoicesQuery.isError && invoices.length > 0 && (
        <div>
          <TableHead>
            <span className="col-span-3">Proveedor</span>
            <span className="col-span-2">{isNote ? 'Albarán' : 'Factura'}</span>
            <span className="col-span-2">Fecha</span>
            <span className="col-span-2">Estado</span>
            <span className="col-span-2 text-right">Total</span>
            <span className="col-span-1" />
          </TableHead>
          <ul className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <li key={invoice._id}>
                <button type="button" onClick={() => navigate(`/compras/facturas/${invoice._id}`)}
                  className="w-full text-left px-2 py-3.5 flex items-center gap-3 md:grid md:grid-cols-12 md:gap-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  <span className="w-9 h-9 md:hidden rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                    <Icon name="receipt" className="w-[18px] h-[18px]" />
                  </span>
                  <span className="md:col-span-3 min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-gray-900 truncate">{invoice.supplier?.name || 'Sin proveedor'}</span>
                    <span className="md:hidden block text-[13px] text-gray-500 truncate">
                      {invoice.invoiceNumber || 'Sin número'} · {formatInvoiceDate(invoice.invoiceDate)}
                    </span>
                    <InvoiceStatus status={invoice.status} className="md:hidden mt-1" />
                  </span>
                  <span className="hidden md:block md:col-span-2 text-sm text-gray-600 truncate">{invoice.invoiceNumber || '—'}</span>
                  <span className="hidden md:block md:col-span-2 text-sm text-gray-600">{formatInvoiceDate(invoice.invoiceDate)}</span>
                  <span className="hidden md:block md:col-span-2"><InvoiceStatus status={invoice.status} /></span>
                  <span className="md:col-span-2 text-right text-sm font-semibold tabular-nums text-gray-900 shrink-0">{formatInvoiceMoney(invoice.total, invoice.currency)}</span>
                  <span className="md:col-span-1 flex justify-end"><Icon name="right" className="w-4 h-4 text-gray-300" strokeWidth={2} /></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
  if (embedded) return <div className="w-full space-y-6">{content}</div>;
  return (
    <Page title={isNote ? 'Albaranes' : 'Facturas'} subtitle={isNote ? 'Lo que te entrega cada proveedor, para comprobarlo con su factura.' : 'Digitaliza tus facturas y mantén tus compras organizadas.'} primary={{ label: `Añadir ${noun}`, short: 'Añadir', onClick: addInvoice }}>{content}</Page>
  );
}
