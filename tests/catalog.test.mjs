import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, formatCOP } from '../src/features/catalog/validation.ts';

test('name and commission enforce database precision and range', () => {
  for (const value of ['', '-1', '101', 'NaN', '1e2', '40.123']) {
    assert.ok(validateCatalog('barbers', 'Carlos', value).errors.amount, value);
  }
  for (const value of ['0', '100', '40,25']) assert.equal(validateCatalog('barbers', ' Carlos ', value).errors.amount, undefined);
  assert.ok(validateCatalog('barbers', '  ', '40').errors.name);
  assert.ok(validateCatalog('barbers', 'a'.repeat(121), '40').errors.name);
  assert.equal(validateCatalog('barbers', ' Carlos ', '40,25').amount, 40.25);
});

test('COP accepts nonnegative whole safe integers and formats without decimals', () => {
  for (const value of ['', '-1', '1.5', '30.000', '1e4', '9007199254740992']) assert.ok(validateCatalog('services', 'Corte', value).errors.amount, value);
  for (const value of ['0', '30000', '9007199254740991']) assert.equal(validateCatalog('services', 'Corte', value).errors.amount, undefined);
  assert.equal(formatCOP(30000), '$30.000');
});
