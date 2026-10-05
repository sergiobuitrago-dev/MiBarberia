import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salesChart } from '../src/features/dashboard/chart.ts';
import { readWeek, weekRange } from '../src/features/commissions/period.ts';

test('chart has a zero baseline and bounded coordinates for zeros and one enormous peak',()=>{
  const zero=salesChart(['0','0','0','0','0','0','0']);
  assert.equal(zero.max,'0');assert.ok(zero.points.every(p=>p.y===140));
  const peak=salesChart(['0','0','0','234187180623295766','0','0','0']);
  assert.equal(peak.max,'234187180623295766');
  assert.equal(peak.points[3].y,12);
  assert.ok(peak.points.every(p=>Number.isFinite(p.x)&&p.y>=12&&p.y<=140));
  assert.ok(peak.points.every((p,i)=>i===0||p.x>peak.points[i-1].x));
  assert.ok(salesChart(['10','20','30','40','50','60','70']).points[5].y < 50);
});
test('weekly URL validates dates and pages without computing calendar boundaries',()=>{
  assert.deepEqual(readWeek({}),{date:undefined,page:1,error:''});
  assert.equal(readWeek({semana:'2024-02-29',pagina:'2'}).date,'2024-02-29');
  for(const params of [{semana:'2026-02-29'},{semana:'0000-01-01'},{semana:'2026-01-01x'},
    {semana:['2026-01-01']},{pagina:'0'},{pagina:'-1'},{pagina:'1.5'},{pagina:['1']},{pagina:'2147483648'}])
    assert.ok(readWeek(params).error,JSON.stringify(params));
  assert.equal(weekRange('2026-09-28','2026-10-04'),'28 sep – 4 oct 2026');
  assert.equal(weekRange('2026-12-28','2027-01-03'),'28 dic 2026 – 3 ene 2027');
});
