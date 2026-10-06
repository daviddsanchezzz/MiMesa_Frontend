import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MENU_FIELDS, buildMenuRows, buildRows, detectDelimiter, findHeaderRow, guessMapping, parseDate, parseDelimited, parseNumber } from '../src/lib/tabular.js';

test('numbers in Spanish and English formats', () => {
  assert.equal(parseNumber('1.234,56 €'), 1234.56);
  assert.equal(parseNumber('1234,5'), 1234.5);
  assert.equal(parseNumber('1,234.56'), 1234.56);
  assert.equal(parseNumber('1.234'), 1234);
  assert.equal(parseNumber('12'), 12);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(''), null);
});

test('dates in the usual formats, and rejects impossible ones', () => {
  assert.equal(parseDate('05/10/2026'), '2026-10-05');
  assert.equal(parseDate('5-10-26'), '2026-10-05');
  assert.equal(parseDate('2026-10-05'), '2026-10-05');
  assert.equal(parseDate('05/10/2026 23:59'), '2026-10-05');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('Total'), null);
});

test('splits with quotes, a BOM and the delimiter of the file', () => {
  const text = '﻿Fecha;Total;Nota\r\n05/10/2026;"1.234,50";"dice ""hola"";adiós"\r\n';
  assert.equal(detectDelimiter(text), ';');
  assert.deepEqual(parseDelimited(text), [['Fecha', 'Total', 'Nota'], ['05/10/2026', '1.234,50', 'dice "hola";adiós']]);
});

test('finds the header below the titles and guesses the columns', () => {
  const table = parseDelimited([
    'Informe de cierre;;;',
    'Restaurante Demo;;;',
    'Fecha;Efectivo;Tarjeta;Total ventas;Nº Tickets',
    '01/10/2026;300,00;700,00;1.000,00;40',
    '02/10/2026;250,50;600,00;850,50;35',
    'TOTAL;550,50;1.300,00;1.850,50;75',
  ].join('\n'));
  const header = findHeaderRow(table);
  assert.equal(header, 2);
  const mapping = guessMapping(table[header]);
  assert.deepEqual(mapping, { date: 0, total: 3, cash: 1, card: 2, tickets: 4 });
  const { rows, skipped } = buildRows(table, header, mapping);
  assert.equal(skipped, 1); // the TOTAL line has no date
  assert.deepEqual(rows[1], { date: '2026-10-02', total: 850.5, cash: 250.5, card: 600, tickets: 35 });
});

test('articles of a POS: header, columns and rows for the menu', () => {
  const table = parseDelimited([
    'Listado de artículos',
    'Código;Artículo;Familia;PVP',
    '001;Croquetas caseras;Entrantes;8,50',
    '002;Entrecot;Carnes;22,00',
    ';;;',
    '003;Agua;;2',
  ].join('\n'));
  const header = findHeaderRow(table, MENU_FIELDS, 'name');
  assert.equal(header, 1);
  const mapping = guessMapping(table[header], MENU_FIELDS);
  assert.deepEqual(mapping, { name: 1, price: 3, category: 2, externalId: 0 });
  const { rows } = buildMenuRows(table, header, mapping);
  assert.deepEqual(rows[0], { name: 'Croquetas caseras', category: 'Entrantes', externalId: '001', price: 8.5 });
  assert.equal(rows.length, 3);
  assert.equal(rows[2].category, '');
});
