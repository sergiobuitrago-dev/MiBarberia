import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer, customerPage } from '../src/features/customers/validation.ts';
test('customer edit trims names, accepts shared/formatted optional phones and enforces existing lengths',()=>{
 assert.deepEqual(validateCustomer(' Juan ',' 300 123-4567 ').values,{name:'Juan',phone:'300 123-4567'});
 assert.equal(validateCustomer('Juan','   ').values.phone,'');
 assert.equal(validateCustomer('  ','').errors.name,'Escribe un nombre de hasta 120 caracteres.');
 assert.ok(validateCustomer('a'.repeat(121),'1'.repeat(31)).errors.phone);
 assert.deepEqual(validateCustomer('Juan','3001234567').errors,{});
});
test('page input cannot create negative, unbounded or ambiguous offsets',()=>{
 for(const input of [undefined,['2'],'-1','0','NaN','1.5','100001'])assert.equal(customerPage(input),1);
 assert.equal(customerPage('2'),2);assert.equal(customerPage('100000'),100000);
});
