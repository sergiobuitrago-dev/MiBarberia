import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { money, validateVisit, cop } from '../src/features/visits/validation.ts';
test('money stays integer-exact, total bounds and required selections are validated', () => {
  for (const value of ['-1','1.2','1e3','','9007199254740992']) assert.equal(money(value),null);
  assert.equal(cop(45000n),'$45.000');
  const draft={customerMode:'occasional',barberId:randomUUID(),items:[{service_id:randomUUID(),charged_price:'30000'}],discount:'5000',payment:'CASH'};
  assert.deepEqual(validateVisit(draft).errors,{});
  assert.ok(validateVisit({...draft,discount:'30001'}).errors.discount);
  assert.ok(validateVisit({...draft,barberId:'',items:[]}).errors.barber);
  assert.ok(validateVisit({...draft,customerMode:'new',customerName:' ',customerPhone:''}).errors.customerName);
  assert.ok(validateVisit({...draft,items:[{service_id:randomUUID(),charged_price:'9007199254740991'},{service_id:randomUUID(),charged_price:'1'}]}).errors.items);
});
