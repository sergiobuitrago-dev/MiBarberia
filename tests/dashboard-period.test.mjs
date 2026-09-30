import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPeriod } from '../src/features/dashboard/period.ts';
test('period input validates calendar days without using browser timezone or trusting malformed parameters',()=>{
  assert.equal(readPeriod({}).period,'today');
  assert.equal(readPeriod({periodo:'custom'}).ready,false);
  assert.equal(readPeriod({periodo:'custom',desde:'2024-02-29',hasta:'2024-03-01'}).ready,true);
  for(const params of [
    {periodo:['today','month']},{periodo:'other'},
    {periodo:'custom',desde:'2026-02-29',hasta:'2026-03-01'},
    {periodo:'custom',desde:'2026-03-02',hasta:'2026-03-01'},
    {periodo:'custom',desde:'2026-03-01ignored',hasta:'2026-03-02'},
    {periodo:'custom',desde:['2026-03-01'],hasta:'2026-03-02'},
    {periodo:'custom',desde:'0000-01-01',hasta:'2026-03-02'},
  ]) {assert.equal(readPeriod(params).ready,false);assert.ok(readPeriod(params).error);}
});
