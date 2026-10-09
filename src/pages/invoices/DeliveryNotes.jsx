import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { queryClient, useData } from '../../lib/query';
import invoicesApi from '../../services/invoicesApi';
import { Section } from '../../ui/kit';
import { formatInvoiceDate, formatInvoiceMoney } from './invoiceUtils';

const ISSUE = {
  'not-delivered': ['No consta en los albaranes', 'text-rose-700'],
  'not-billed': ['Entregado y no facturado', 'text-amber-700'],
  'more-billed': ['Facturas más de lo entregado', 'text-rose-700'],
  'less-billed': ['Facturas menos de lo entregado', 'text-amber-700'],
  price: ['Precio distinto al del albarán', 'text-rose-700'],
};
const qty = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 3 }));
const eur = (n) => (n === null || n === undefined ? '—' : formatInvoiceMoney(n));

/** On an invoice: the delivery notes it bills, and whether what is billed matches what arrived. */
export function InvoiceNotes({ invoiceId }) {
  const navigate = useNavigate();
  const q = useData(['invoices', 'notes-of', invoiceId], () => invoicesApi.deliveryNotes(invoiceId), { retry: false });
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const data = q.data;
  if (!data) return null;
  const { linked, candidates, comparison } = data;
  if (!linked.length && !candidates.length) return null;

  async function save(ids) {
    setBusy(true);
    try {
      const next = await invoicesApi.setDeliveryNotes(invoiceId, ids);
      queryClient.setQueryData(['invoices', 'notes-of', invoiceId], next);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setAdding(false);
    } catch (err) { toast.error(err?.response?.data?.message || 'No se ha podido guardar'); } finally { setBusy(false); }
  }

  const issues = comparison?.lines.filter((l) => l.issue) || [];
  return (
    <Section title="Albaranes" aside={candidates.length > 0 && <button type="button" onClick={() => setAdding(!adding)} className="whitespace-nowrap text-[13px] font-semibold text-violet-700">{adding ? 'Cerrar' : '+ Añadir albarán'}</button>}>
      {linked.length === 0 && !adding && <p className="py-1 text-sm text-gray-500">Hay {candidates.length} {candidates.length === 1 ? 'albarán' : 'albaranes'} de este proveedor sin factura. Vincúlalos para comprobar que cuadra.</p>}

      {linked.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {linked.map((n) => (
            <li key={n.id} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => navigate(`/compras/facturas/${n.id}`)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[15px] font-medium text-gray-900">Albarán {n.number || 'sin número'}</span>
                <span className="block text-[13px] text-gray-500">{formatInvoiceDate(n.date)}{n.status !== 'CONFIRMED' ? ' · por revisar' : ''}</span>
              </button>
              <span className="text-sm font-semibold tabular-nums text-gray-900">{n.total === null ? '' : eur(n.total)}</span>
              <button type="button" disabled={busy} onClick={() => save(linked.filter((x) => x.id !== n.id).map((x) => x.id))} className="text-[13px] font-medium text-gray-400 hover:text-rose-600">Quitar</button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <ul className="mt-2 divide-y divide-gray-100 border-t border-gray-100">
          {candidates.map((n) => (
            <li key={n.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-gray-900">Albarán {n.number || 'sin número'}</span>
                <span className="block text-[13px] text-gray-500">{formatInvoiceDate(n.date)}</span>
              </span>
              <span className="text-sm tabular-nums text-gray-600">{n.total === null ? '' : eur(n.total)}</span>
              <button type="button" disabled={busy} onClick={() => save([...linked.map((x) => x.id), n.id])} className="text-[13px] font-semibold text-violet-700">Vincular</button>
            </li>
          ))}
        </ul>
      )}

      {comparison && (
        <div className="mt-4">
          {issues.length === 0 && comparison.difference !== null && comparison.difference === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">Todo cuadra: lo facturado coincide con lo entregado.</p>
          ) : (
            <div className="rounded-xl bg-amber-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-amber-900">
                {issues.length ? `${issues.length} ${issues.length === 1 ? 'diferencia' : 'diferencias'} con lo entregado` : 'Los albaranes no tienen todos los importes'}
                {comparison.difference ? ` · la factura es ${eur(Math.abs(comparison.difference))} ${comparison.difference > 0 ? 'mayor' : 'menor'} que los albaranes` : ''}
              </p>
              {issues.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {issues.map((l) => (
                    <li key={l.key} className="text-sm">
                      <span className="block font-medium text-gray-900">{l.name}</span>
                      <span className={`block text-[13px] ${ISSUE[l.issue][1]}`}>{ISSUE[l.issue][0]}
                        {l.issue === 'price' ? ` · ${eur(l.deliveredPrice)} → ${eur(l.billedPrice)}` : ` · albarán ${qty(l.deliveredQty)} · factura ${qty(l.billedQty)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/** On a delivery note: which invoice bills it. */
export function NoteBilledBy({ invoiceId }) {
  const navigate = useNavigate();
  if (!invoiceId) return <p className="text-sm text-gray-500">Todavía no está en ninguna factura. Cuando llegue la factura, vincúlala desde ella.</p>;
  return <button type="button" onClick={() => navigate(`/compras/facturas/${invoiceId}`)} className="text-sm font-semibold text-violet-700">Ver la factura que la cobra →</button>;
}
