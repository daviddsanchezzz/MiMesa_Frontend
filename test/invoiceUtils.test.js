import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiNumber,
  decimalTyping,
  formatInvoiceDate,
  formatInvoiceMoney,
  formToPayload,
  invoiceToForm,
} from '../src/pages/invoices/invoiceUtils.js';

test('invoice money and dates use Spanish presentation without losing currency', () => {
  assert.match(formatInvoiceMoney(1234.56, 'EUR'), /1\.234,56/);
  assert.match(formatInvoiceMoney(1234.56, 'USD'), /1\.234,56/);
  assert.equal(formatInvoiceMoney(null, 'EUR'), '—');
  assert.equal(formatInvoiceDate('2026-10-03', { long: true }), '3 oct 2026');
});

test('decimal inputs accept Spanish commas and become API numbers or null', () => {
  assert.equal(decimalTyping('12.34'), '12,34');
  assert.equal(decimalTyping('12,3a4'), '12,34');
  assert.equal(apiNumber('12,34'), 12.34);
  assert.equal(apiNumber(''), null);
});

test('invoice form keeps nullable decimals and creates the PATCH shape', () => {
  const form = invoiceToForm({
    supplier: { name: 'Makro', taxId: 'A1' }, invoiceNumber: 'F-1', invoiceDate: '2026-10-03', currency: 'EUR',
    items: [{ _id: 'line-1', description: 'Agua', quantity: null, unitPrice: 2.5, discount: null, taxRate: 10, total: 2.5 }],
    subtotal: 2.5, taxAmount: null, total: 2.5,
  });
  assert.equal(form.items[0].quantity, '');
  assert.equal(form.items[0].unitPrice, '2,5');
  assert.deepEqual(formToPayload(form), {
    supplier: { name: 'Makro', taxId: 'A1' },
    invoiceNumber: 'F-1', invoiceDate: '2026-10-03', currency: 'EUR',
    items: [{ description: 'Agua', quantity: null, unitPrice: 2.5, discount: null, taxRate: 10, total: 2.5 }],
    subtotal: 2.5, taxAmount: null, total: 2.5,
  });
});
