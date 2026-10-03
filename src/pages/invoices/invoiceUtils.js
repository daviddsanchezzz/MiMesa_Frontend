export const INVOICE_STATUS = {
  PROCESSING: { label: 'Procesando', tone: 'violet' },
  REVIEW: { label: 'Por revisar', tone: 'amber' },
  CONFIRMED: { label: 'Confirmada', tone: 'green' },
  FAILED: { label: 'Error', tone: 'rose' },
};

export function formatInvoiceMoney(value, currency = 'EUR') {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
      currencyDisplay: 'narrowSymbol',
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'EUR'}`;
  }
}

export function formatInvoiceDate(value, { long = false } = {}) {
  if (!value) return 'Sin fecha';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.toLocaleDateString('es-ES', long
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short' }).replace('.', '');
}

export function inputNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

export function apiNumber(value) {
  const clean = String(value ?? '').trim().replace(',', '.');
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decimalTyping(value) {
  const normalized = String(value ?? '').replace('.', ',').replace(/[^0-9,]/g, '');
  const [integer = '', ...decimals] = normalized.split(',');
  return decimals.length ? `${integer},${decimals.join('')}` : integer;
}

export function invoiceToForm(invoice) {
  return {
    supplier: {
      name: invoice?.supplier?.name || '',
      taxId: invoice?.supplier?.taxId || '',
    },
    invoiceNumber: invoice?.invoiceNumber || '',
    invoiceDate: invoice?.invoiceDate || '',
    currency: invoice?.currency || 'EUR',
    items: (invoice?.items || []).map((item, index) => ({
      key: item._id || `line-${index}-${Date.now()}`,
      description: item.description || '',
      packageQuantity: inputNumber(item.packageQuantity),
      quantity: inputNumber(item.quantity),
      unitPrice: inputNumber(item.unitPrice),
      discount: inputNumber(item.discount),
      taxRate: inputNumber(item.taxRate),
      total: inputNumber(item.total),
    })),
    grossAmount: inputNumber(invoice?.grossAmount),
    discountRate: inputNumber(invoice?.discountRate),
    discountAmount: inputNumber(invoice?.discountAmount),
    shippingAmount: inputNumber(invoice?.shippingAmount),
    subtotal: inputNumber(invoice?.subtotal),
    taxAmount: inputNumber(invoice?.taxAmount),
    total: inputNumber(invoice?.total),
    taxBreakdown: (invoice?.taxBreakdown || []).map((entry, index) => ({
      key: `tax-${index}-${Date.now()}`,
      taxRate: inputNumber(entry.taxRate),
      taxableBase: inputNumber(entry.taxableBase),
      taxAmount: inputNumber(entry.taxAmount),
    })),
  };
}

export function formToPayload(form) {
  return {
    supplier: {
      name: form.supplier.name.trim() || null,
      taxId: form.supplier.taxId.trim() || null,
    },
    invoiceNumber: form.invoiceNumber.trim() || null,
    invoiceDate: form.invoiceDate || null,
    currency: form.currency.trim().toUpperCase() || null,
    items: form.items.map(({ description, packageQuantity, quantity, unitPrice, discount, taxRate, total }) => ({
      description: description.trim(),
      packageQuantity: apiNumber(packageQuantity),
      quantity: apiNumber(quantity),
      unitPrice: apiNumber(unitPrice),
      discount: apiNumber(discount),
      taxRate: apiNumber(taxRate),
      total: apiNumber(total),
    })),
    grossAmount: apiNumber(form.grossAmount),
    discountRate: apiNumber(form.discountRate),
    discountAmount: apiNumber(form.discountAmount),
    shippingAmount: apiNumber(form.shippingAmount),
    subtotal: apiNumber(form.subtotal),
    taxAmount: apiNumber(form.taxAmount),
    total: apiNumber(form.total),
    taxBreakdown: form.taxBreakdown.map(({ taxRate, taxableBase, taxAmount }) => ({
      taxRate: apiNumber(taxRate),
      taxableBase: apiNumber(taxableBase),
      taxAmount: apiNumber(taxAmount),
    })),
  };
}

export function apiErrorMessage(error, fallback) {
  if (error?.response?.status === 403) return 'No tienes permiso para acceder a estas facturas.';
  if (error?.response?.status === 404) return 'La factura no existe o ya no está disponible.';
  return error?.response?.data?.message || fallback;
}
