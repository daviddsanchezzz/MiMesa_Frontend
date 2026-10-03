import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSetMobileHeader } from '../../context/MobileHeaderContext';
import { queryClient, useData } from '../../lib/query';
import { confirmLeave, useUnsavedChanges } from '../../lib/unsavedChanges';
import invoicesApi from '../../services/invoicesApi';
import Icon from '../../ui/Icon';
import { GhostButton, PageHeader, PrimaryButton, Section } from '../../ui/kit';
import InvoiceDocumentModal from './InvoiceDocumentModal';
import InvoiceStatus from './InvoiceStatus';
import {
  apiErrorMessage,
  decimalTyping,
  formatInvoiceDate,
  formatInvoiceMoney,
  formToPayload,
  invoiceToForm,
} from './invoiceUtils';

const inputCls = 'w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
const numberCls = `${inputCls} tabular-nums text-right`;
const compactNumberCls = `${numberCls} h-10 px-2.5 py-2`;

function Field({ id, label, hint, hintId, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
      {hint && <p id={hintId} className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function PageLoading() {
  return (
    <div className="space-y-7" aria-busy="true">
      <div className="h-7 w-48 rounded bg-gray-100 animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4"><div className="h-28 rounded-2xl bg-gray-100 animate-pulse" /><div className="h-28 rounded-2xl bg-gray-100 animate-pulse" /></div>
      <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );
}

function ErrorState({ error, retry, back }) {
  return (
    <div className="min-h-[55dvh] flex items-center justify-center text-center px-4">
      <div className="max-w-sm">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center"><Icon name="alert" className="w-6 h-6" /></span>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">No se puede abrir la factura</h1>
        <p className="mt-2 text-sm text-gray-500">{apiErrorMessage(error, 'Ha ocurrido un error al cargarla.')}</p>
        <div className="mt-5 flex justify-center gap-2"><GhostButton onClick={retry}>Reintentar</GhostButton><GhostButton onClick={back}>Volver</GhostButton></div>
      </div>
    </div>
  );
}

function ReadOnlyInvoice({ invoice }) {
  return (
    <div className="space-y-7">
      <section>
        <p className="text-2xl font-semibold tracking-tight text-gray-900">{invoice.supplier?.name || 'Sin proveedor'}</p>
        {invoice.supplier?.taxId && <p className="mt-0.5 text-sm text-gray-500">{invoice.supplier.taxId}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-gray-700">Factura {invoice.invoiceNumber || 'sin número'}</p>
          <p className="text-sm text-gray-500">{formatInvoiceDate(invoice.invoiceDate, { long: true })}</p>
          <InvoiceStatus status={invoice.status} />
        </div>
      </section>

      <Section title="Líneas">
        {invoice.items?.length ? (
          <ul className="divide-y divide-gray-100">
            {invoice.items.map((item) => (
              <li key={item._id} className="py-3 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-gray-900">{item.description}</p>
                  <p className="mt-0.5 text-[13px] text-gray-500">
                    {item.quantity !== null ? `${item.quantity} × ${formatInvoiceMoney(item.unitPrice, invoice.currency)}` : 'Cantidad no indicada'}
                    {item.packageQuantity !== null && item.packageQuantity !== undefined && ` · Caja ${item.packageQuantity}`}
                    {item.taxRate !== null && ` · IVA ${item.taxRate}%`}
                    {item.discount !== null && item.discount !== 0 && ` · Dto. ${item.discount}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{formatInvoiceMoney(item.total, invoice.currency)}</p>
              </li>
            ))}
          </ul>
        ) : <p className="py-3 text-sm text-gray-500">No hay líneas registradas.</p>}
      </Section>

      <TotalsReadOnly invoice={invoice} />
    </div>
  );
}

function TotalsReadOnly({ invoice }) {
  return (
    <section className="ml-auto max-w-md border-t border-gray-200 pt-4 space-y-2">
      {invoice.grossAmount !== null && invoice.grossAmount !== undefined && <div className="flex items-baseline justify-between gap-4 text-sm"><span className="text-gray-500">Total neto</span><span className="tabular-nums text-gray-900">{formatInvoiceMoney(invoice.grossAmount, invoice.currency)}</span></div>}
      {invoice.discountAmount !== null && invoice.discountAmount !== undefined && <div className="flex items-baseline justify-between gap-4 text-sm"><span className="text-gray-500">Descuento global{invoice.discountRate !== null && invoice.discountRate !== undefined ? ` (${invoice.discountRate}%)` : ''}</span><span className="tabular-nums text-gray-900">− {formatInvoiceMoney(invoice.discountAmount, invoice.currency)}</span></div>}
      {invoice.shippingAmount !== null && invoice.shippingAmount !== undefined && <div className="flex items-baseline justify-between gap-4 text-sm"><span className="text-gray-500">Portes</span><span className="tabular-nums text-gray-900">{formatInvoiceMoney(invoice.shippingAmount, invoice.currency)}</span></div>}
      <div className="flex items-baseline justify-between gap-4 text-sm"><span className="text-gray-500">Base imponible</span><span className="tabular-nums text-gray-900">{formatInvoiceMoney(invoice.subtotal, invoice.currency)}</span></div>
      <div className="flex items-baseline justify-between gap-4 text-sm"><span className="text-gray-500">IVA</span><span className="tabular-nums text-gray-900">{formatInvoiceMoney(invoice.taxAmount, invoice.currency)}</span></div>
      {invoice.taxBreakdown?.length > 0 && (
        <div className="my-3 rounded-xl bg-gray-50 px-3 py-2 space-y-1">
          {invoice.taxBreakdown.map((entry, index) => <div key={`${entry.taxRate}-${index}`} className="flex justify-between gap-4 text-xs text-gray-500"><span>IVA {entry.taxRate ?? '—'}% sobre {formatInvoiceMoney(entry.taxableBase, invoice.currency)}</span><span className="tabular-nums">{formatInvoiceMoney(entry.taxAmount, invoice.currency)}</span></div>)}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-gray-100 pt-3"><span className="font-semibold text-gray-900">Total</span><span className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{formatInvoiceMoney(invoice.total, invoice.currency)}</span></div>
    </section>
  );
}

function InvoiceLineEditor({ item, index, error, setItem, removeItem }) {
  const lineNumber = String(index + 1).padStart(2, '0');
  return (
    <>
      <article className="md:hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm shadow-gray-100/70">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Línea {lineNumber}</span>
          <button type="button" onClick={() => removeItem(index)} aria-label={`Eliminar línea ${index + 1}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">
            <Icon name="trash" className="h-4 w-4" />Eliminar
          </button>
        </div>

        <Field id={`mobile-line-${index}-description`} label="Descripción">
          <textarea id={`mobile-line-${index}-description`} rows={2} value={item.description} onChange={(e) => setItem(index, 'description', e.target.value)} className={`${inputCls} min-h-[4.25rem] resize-none leading-snug`} aria-invalid={Boolean(error)} aria-describedby={error ? `mobile-line-${index}-error` : undefined} />
          {error && <p id={`mobile-line-${index}-error`} className="mt-1 text-xs text-rose-600">{error}</p>}
        </Field>

        <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 [&_label]:mb-1 [&_label]:text-[11px]">
          <Field id={`mobile-line-${index}-package`} label="Caja"><input id={`mobile-line-${index}-package`} inputMode="decimal" value={item.packageQuantity} onChange={(e) => setItem(index, 'packageQuantity', decimalTyping(e.target.value))} className={compactNumberCls} /></Field>
          <Field id={`mobile-line-${index}-quantity`} label="Cantidad"><input id={`mobile-line-${index}-quantity`} inputMode="decimal" value={item.quantity} onChange={(e) => setItem(index, 'quantity', decimalTyping(e.target.value))} className={compactNumberCls} /></Field>
          <Field id={`mobile-line-${index}-tax`} label="IVA %"><input id={`mobile-line-${index}-tax`} inputMode="decimal" value={item.taxRate} onChange={(e) => setItem(index, 'taxRate', decimalTyping(e.target.value))} className={compactNumberCls} /></Field>
          <Field id={`mobile-line-${index}-unit`} label="Precio"><input id={`mobile-line-${index}-unit`} inputMode="decimal" value={item.unitPrice} onChange={(e) => setItem(index, 'unitPrice', decimalTyping(e.target.value))} className={compactNumberCls} /></Field>
          <Field id={`mobile-line-${index}-discount`} label="Dto. %"><input id={`mobile-line-${index}-discount`} inputMode="decimal" value={item.discount} onChange={(e) => setItem(index, 'discount', decimalTyping(e.target.value))} className={compactNumberCls} /></Field>
          <Field id={`mobile-line-${index}-total`} label="Total"><input id={`mobile-line-${index}-total`} inputMode="decimal" value={item.total} onChange={(e) => setItem(index, 'total', decimalTyping(e.target.value))} className={`${compactNumberCls} border-violet-200 bg-violet-50/60 font-semibold text-violet-950`} /></Field>
        </div>
      </article>

      <div className="hidden md:grid md:grid-cols-12 md:items-end md:gap-2 md:px-2 md:py-3">
        <Field id={`line-${index}-description`} label="Descripción" className="md:col-span-3 md:[&>label]:sr-only">
          <input id={`line-${index}-description`} value={item.description} onChange={(e) => setItem(index, 'description', e.target.value)} className={inputCls} aria-invalid={Boolean(error)} aria-describedby={error ? `line-${index}-error` : undefined} />
          {error && <p id={`line-${index}-error`} className="mt-1 text-xs text-rose-600">{error}</p>}
        </Field>
        <Field id={`line-${index}-package`} label="Caja" className="md:col-span-1 md:[&>label]:sr-only"><input id={`line-${index}-package`} inputMode="decimal" value={item.packageQuantity} onChange={(e) => setItem(index, 'packageQuantity', decimalTyping(e.target.value))} className={numberCls} /></Field>
        <Field id={`line-${index}-quantity`} label="Cantidad" className="md:col-span-1 md:[&>label]:sr-only"><input id={`line-${index}-quantity`} inputMode="decimal" value={item.quantity} onChange={(e) => setItem(index, 'quantity', decimalTyping(e.target.value))} className={numberCls} /></Field>
        <Field id={`line-${index}-unit`} label="Precio unitario" className="md:col-span-2 md:[&>label]:sr-only"><input id={`line-${index}-unit`} inputMode="decimal" value={item.unitPrice} onChange={(e) => setItem(index, 'unitPrice', decimalTyping(e.target.value))} className={numberCls} /></Field>
        <Field id={`line-${index}-discount`} label="Descuento %" className="md:col-span-1 md:[&>label]:sr-only"><input id={`line-${index}-discount`} inputMode="decimal" value={item.discount} onChange={(e) => setItem(index, 'discount', decimalTyping(e.target.value))} className={numberCls} /></Field>
        <Field id={`line-${index}-tax`} label="IVA %" className="md:col-span-1 md:[&>label]:sr-only"><input id={`line-${index}-tax`} inputMode="decimal" value={item.taxRate} onChange={(e) => setItem(index, 'taxRate', decimalTyping(e.target.value))} className={numberCls} /></Field>
        <Field id={`line-${index}-total`} label="Total" className="md:col-span-2 md:[&>label]:sr-only"><input id={`line-${index}-total`} inputMode="decimal" value={item.total} onChange={(e) => setItem(index, 'total', decimalTyping(e.target.value))} className={`${numberCls} font-semibold`} /></Field>
        <div className="md:col-span-1 flex justify-end md:pb-0.5">
          <button type="button" onClick={() => removeItem(index)} aria-label={`Eliminar línea ${index + 1}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Icon name="trash" className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  );
}

function InvoiceForm({ form, setForm, errors }) {
  const setRoot = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setSupplier = (field, value) => setForm((current) => ({ ...current, supplier: { ...current.supplier, [field]: value } }));
  const setItem = (index, field, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));
  const removeItem = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  const addItem = () => setForm((current) => ({
    ...current,
    items: [...current.items, { key: `new-${Date.now()}`, description: '', packageQuantity: '', quantity: '', unitPrice: '', discount: '', taxRate: '', total: '' }],
  }));
  const setTaxEntry = (index, field, value) => setForm((current) => ({
    ...current,
    taxBreakdown: current.taxBreakdown.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry),
  }));
  const removeTaxEntry = (index) => setForm((current) => ({ ...current, taxBreakdown: current.taxBreakdown.filter((_, entryIndex) => entryIndex !== index) }));
  const addTaxEntry = () => setForm((current) => ({
    ...current,
    taxBreakdown: [...current.taxBreakdown, { key: `tax-new-${Date.now()}`, taxRate: '', taxableBase: '', taxAmount: '' }],
  }));

  return (
    <div className="space-y-8">
      <Section title="Proveedor">
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <Field id="supplier-name" label="Nombre">
            <input id="supplier-name" value={form.supplier.name} onChange={(e) => setSupplier('name', e.target.value)} className={inputCls} autoComplete="organization" />
          </Field>
          <Field id="supplier-tax" label="NIF / CIF">
            <input id="supplier-tax" value={form.supplier.taxId} onChange={(e) => setSupplier('taxId', e.target.value)} className={inputCls} autoCapitalize="characters" />
          </Field>
        </div>
      </Section>

      <Section title="Factura">
        <div className="grid sm:grid-cols-3 gap-4 pt-1">
          <Field id="invoice-number" label="Número">
            <input id="invoice-number" value={form.invoiceNumber} onChange={(e) => setRoot('invoiceNumber', e.target.value)} className={inputCls} />
          </Field>
          <Field id="invoice-date" label="Fecha">
            <input id="invoice-date" type="date" value={form.invoiceDate} onChange={(e) => setRoot('invoiceDate', e.target.value)} className={inputCls} />
          </Field>
          <Field id="invoice-currency" label="Moneda" hint={errors.currency} hintId="invoice-currency-error">
            <input id="invoice-currency" value={form.currency} onChange={(e) => setRoot('currency', e.target.value.toUpperCase().slice(0, 3))} className={inputCls} maxLength={3} autoCapitalize="characters" aria-invalid={Boolean(errors.currency)} aria-describedby={errors.currency ? 'invoice-currency-error' : undefined} />
          </Field>
        </div>
      </Section>

      <Section title="Productos / líneas" aside={<button type="button" onClick={addItem} className="text-[13px] font-semibold text-violet-700 hover:text-violet-900">+ Añadir línea</button>}>
        <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-2 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <span className="col-span-3">Descripción</span><span className="text-right">Caja</span><span className="text-right">Cant.</span><span className="col-span-2 text-right">Precio</span><span className="text-right">Dto. %</span><span className="text-right">IVA</span><span className="col-span-2 text-right">Total</span><span />
        </div>
        <div className="space-y-3 md:space-y-0 md:divide-y md:divide-gray-100">
          {form.items.map((item, index) => (
            <InvoiceLineEditor key={item.key} item={item} index={index} error={errors.items?.[index]} setItem={setItem} removeItem={removeItem} />
          ))}
          {!form.items.length && <p className="py-5 text-sm text-gray-500 text-center">No hay líneas. Puedes añadirlas manualmente.</p>}
        </div>
      </Section>

      <Section title="Desglose de IVA" aside={<button type="button" onClick={addTaxEntry} className="text-[13px] font-semibold text-violet-700 hover:text-violet-900">+ Añadir tipo</button>}>
        <div className="space-y-3 pt-1">
          {form.taxBreakdown.map((entry, index) => (
            <div key={entry.key} className="grid grid-cols-2 sm:grid-cols-[1fr_1.5fr_1.5fr_auto] gap-2 items-end">
              <Field id={`tax-${index}-rate`} label="IVA %"><input id={`tax-${index}-rate`} inputMode="decimal" value={entry.taxRate} onChange={(e) => setTaxEntry(index, 'taxRate', decimalTyping(e.target.value))} className={numberCls} /></Field>
              <Field id={`tax-${index}-base`} label="Base imponible"><input id={`tax-${index}-base`} inputMode="decimal" value={entry.taxableBase} onChange={(e) => setTaxEntry(index, 'taxableBase', decimalTyping(e.target.value))} className={numberCls} /></Field>
              <Field id={`tax-${index}-amount`} label="Cuota IVA"><input id={`tax-${index}-amount`} inputMode="decimal" value={entry.taxAmount} onChange={(e) => setTaxEntry(index, 'taxAmount', decimalTyping(e.target.value))} className={numberCls} /></Field>
              <button type="button" onClick={() => removeTaxEntry(index)} aria-label={`Eliminar tipo de IVA ${index + 1}`} className="h-10 w-10 rounded-xl text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center"><Icon name="trash" className="w-4 h-4" /></button>
            </div>
          ))}
          {!form.taxBreakdown.length && <p className="py-3 text-sm text-gray-500">No hay desglose de IVA registrado.</p>}
        </div>
      </Section>

      <Section title="Totales" className="ml-auto max-w-md">
        <div className="space-y-3 pt-1">
          <Field id="gross-amount" label="Total neto" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="gross-amount" inputMode="decimal" value={form.grossAmount} onChange={(e) => setRoot('grossAmount', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <Field id="discount-rate" label="Descuento global %" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="discount-rate" inputMode="decimal" value={form.discountRate} onChange={(e) => setRoot('discountRate', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <Field id="discount-amount" label="Importe descuento" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="discount-amount" inputMode="decimal" value={form.discountAmount} onChange={(e) => setRoot('discountAmount', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <Field id="shipping-amount" label="Portes" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="shipping-amount" inputMode="decimal" value={form.shippingAmount} onChange={(e) => setRoot('shippingAmount', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <Field id="subtotal" label="Base imponible indicada" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="subtotal" inputMode="decimal" value={form.subtotal} onChange={(e) => setRoot('subtotal', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <Field id="tax-amount" label="IVA" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0"><input id="tax-amount" inputMode="decimal" value={form.taxAmount} onChange={(e) => setRoot('taxAmount', decimalTyping(e.target.value))} className={numberCls} /></Field>
          <div className="border-t border-gray-200 pt-3">
            <Field id="invoice-total" label="Total" className="grid grid-cols-[1fr_minmax(9rem,12rem)] items-center gap-4 [&>label]:mb-0 [&>label]:text-base [&>label]:font-semibold [&>label]:text-gray-900"><input id="invoice-total" inputMode="decimal" value={form.total} onChange={(e) => setRoot('total', decimalTyping(e.target.value))} className={`${numberCls} text-lg font-semibold`} /></Field>
          </div>
        </div>
      </Section>
    </div>
  );
}

function validateForm(form) {
  const errors = {};
  if (form.currency && !/^[A-Za-z]{3}$/.test(form.currency)) errors.currency = 'Usa un código de tres letras, por ejemplo EUR.';
  const itemErrors = {};
  form.items.forEach((item, index) => { if (!item.description.trim()) itemErrors[index] = 'La descripción es obligatoria.'; });
  if (Object.keys(itemErrors).length) errors.items = itemErrors;
  return errors;
}

function notify(message) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message } }));
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceQuery = useData(['invoices', id], () => invoicesApi.get(id), {
    retry: false,
    refetchInterval: (query) => query.state.data?.status === 'PROCESSING' ? 2000 : false,
  });
  const invoice = invoiceQuery.data;
  const naturallyEditable = invoice && ['REVIEW', 'FAILED'].includes(invoice.status);
  const [forceEditing, setForceEditing] = useState(false);
  const editable = Boolean(naturallyEditable || (invoice?.status === 'CONFIRMED' && forceEditing));
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDocument, setShowDocument] = useState(false);

  useSetMobileHeader({ title: editable ? 'Revisar factura' : 'Detalle de factura', action: false });

  useEffect(() => {
    if (!invoice || !editable) return;
    const next = invoiceToForm(invoice);
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [invoice?._id, invoice?.updatedAt, editable]);

  const dirty = useMemo(() => Boolean(form && baseline && JSON.stringify(form) !== baseline), [form, baseline]);
  useUnsavedChanges('revisión de factura', dirty);

  const goBack = () => { if (confirmLeave()) navigate('/facturas'); };

  const cancelEdit = () => {
    if (dirty && !window.confirm('¿Descartar los cambios sin guardar?')) return;
    setForceEditing(false);
    setForm(null);
    setBaseline('');
    setErrors({});
    setRequestError('');
  };

  const save = async ({ quiet = false } = {}) => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setRequestError('Revisa los campos marcados antes de guardar.');
      return null;
    }
    setSaving(true);
    setRequestError('');
    try {
      const wasConfirmed = invoice.status === 'CONFIRMED';
      const updated = await invoicesApi.update(id, formToPayload(form));
      const next = invoiceToForm(updated);
      setForm(next);
      setBaseline(JSON.stringify(next));
      queryClient.setQueryData(['invoices', id], updated);
      if (!quiet) notify(wasConfirmed ? 'Cambios guardados. Revisa y confirma de nuevo la factura' : 'Cambios guardados');
      return updated;
    } catch (error) {
      setRequestError(apiErrorMessage(error, 'No se pudieron guardar los cambios.'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (saving || confirming) return;
    setConfirming(true);
    setRequestError('');
    try {
      if (dirty) {
        const saved = await save({ quiet: true });
        if (!saved) return;
      }
      const confirmed = await invoicesApi.confirm(id);
      queryClient.setQueryData(['invoices', id], confirmed);
      notify('Factura confirmada');
      setBaseline('');
      setForceEditing(false);
      setForm(null);
    } catch (error) {
      setRequestError(apiErrorMessage(error, 'No se pudo confirmar la factura.'));
    } finally {
      setConfirming(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Eliminar esta factura y su documento original? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await invoicesApi.remove(id);
      notify('Factura eliminada');
      navigate('/facturas', { replace: true });
    } catch (error) {
      setRequestError(apiErrorMessage(error, 'No se pudo eliminar la factura.'));
      setDeleting(false);
    }
  };

  if (invoiceQuery.isLoading) return <PageLoading />;
  if (invoiceQuery.isError) return <ErrorState error={invoiceQuery.error} retry={() => invoiceQuery.refetch()} back={() => navigate('/facturas')} />;
  if (!invoice) return null;

  if (invoice.status === 'PROCESSING') {
    return (
      <div className="min-h-[55dvh] flex items-center justify-center text-center" aria-live="polite" aria-busy="true">
        <div><span className="mx-auto block w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" /><h1 className="mt-5 text-xl font-semibold text-gray-900">Analizando factura...</h1><p className="mt-2 text-sm text-gray-500">Actualizaremos esta pantalla cuando termine.</p></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={editable ? 'Revisar factura' : 'Detalle de factura'}
        subtitle={editable ? 'Comprueba que los datos sean correctos antes de guardarla.' : 'Factura guardada y confirmada.'}
        actions={<><GhostButton onClick={() => setShowDocument(true)}><Icon name="eye" className="w-4 h-4" />Ver original</GhostButton>{invoice.status === 'CONFIRMED' && !editable && <GhostButton onClick={() => setForceEditing(true)}><Icon name="edit" className="w-4 h-4" />Editar</GhostButton>}<GhostButton onClick={goBack}>Volver</GhostButton></>}
      />

      <div className="lg:hidden flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600"><Icon name="left" className="w-4 h-4" strokeWidth={2} />Facturas</button>
        <button type="button" onClick={() => setShowDocument(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700"><Icon name="eye" className="w-4 h-4" />Ver original</button>
      </div>

      {invoice.status === 'FAILED' && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3.5 flex items-start gap-3">
          <Icon name="alert" className="w-5 h-5 text-rose-500 mt-0.5" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-rose-900">No pudimos leer esta factura</p><p className="mt-0.5 text-sm text-rose-700">Puedes completar los datos manualmente o volver a subir una imagen más nítida.</p></div>
          <button type="button" onClick={() => navigate('/facturas/nueva')} className="text-sm font-semibold text-rose-800 shrink-0">Reintentar</button>
        </div>
      )}

      {invoice.extractionWarnings?.length > 0 && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3.5 flex items-start gap-3">
          <Icon name="alert" className="w-5 h-5 text-amber-600 mt-0.5" />
          <div><p className="text-sm font-semibold text-amber-900">Revisa los importes</p>{invoice.extractionWarnings.map((warning) => <p key={warning} className="mt-0.5 text-sm text-amber-800">{warning}.</p>)}</div>
        </div>
      )}

      {requestError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{requestError}</p>}

      {editable && form ? <InvoiceForm form={form} setForm={setForm} errors={errors} /> : <ReadOnlyInvoice invoice={invoice} />}

      {editable ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5 sm:p-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <div className="mb-3 min-w-0 lg:mb-0">
            <p className="text-sm font-semibold text-gray-900">{invoice.status === 'CONFIRMED' ? 'Guardar edición' : 'Finalizar revisión'}</p>
            <p className="mt-0.5 text-xs text-gray-500">{dirty ? 'Tienes cambios sin guardar.' : 'Todos los cambios están guardados.'}{invoice.status === 'CONFIRMED' ? ' Al guardar volverá a quedar por revisar.' : ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0 lg:justify-end">
            {invoice.status === 'CONFIRMED' && <GhostButton onClick={cancelEdit} disabled={saving || confirming} className="h-11 rounded-xl">Cancelar</GhostButton>}
            {invoice.status === 'CONFIRMED'
              ? <PrimaryButton icon="check" onClick={() => save()} disabled={saving || confirming || !dirty} className="h-11 rounded-xl">{saving ? 'Guardando…' : 'Guardar cambios'}</PrimaryButton>
              : <GhostButton onClick={() => save()} disabled={saving || confirming || !dirty} className="h-11 rounded-xl">{saving ? 'Guardando…' : 'Guardar cambios'}</GhostButton>}
            {invoice.status !== 'CONFIRMED' && <PrimaryButton icon="check" onClick={confirm} disabled={saving || confirming} className="h-11">{confirming ? 'Confirmando…' : 'Confirmar factura'}</PrimaryButton>}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <GhostButton onClick={() => setShowDocument(true)}><Icon name="eye" className="w-4 h-4" />Ver documento original</GhostButton>
          <div className="flex items-center gap-2">
            {invoice.status === 'CONFIRMED' && <GhostButton onClick={() => setForceEditing(true)}><Icon name="edit" className="w-4 h-4" />Editar factura</GhostButton>}
            <button type="button" onClick={remove} disabled={deleting} className="h-9 px-3.5 rounded-full text-[13px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{deleting ? 'Eliminando…' : 'Eliminar factura'}</button>
          </div>
        </div>
      )}

      {editable && (
        <div className="text-center lg:text-right">
          <button type="button" onClick={remove} disabled={deleting} className="text-[13px] font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50">{deleting ? 'Eliminando…' : 'Eliminar factura'}</button>
        </div>
      )}

      {showDocument && <InvoiceDocumentModal invoice={invoice} onClose={() => setShowDocument(false)} />}
    </div>
  );
}
