import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connect, seed, asUser } from './helpers/database.mjs';
let db, f;
before(async()=>{db=await connect();});
after(async()=>{await db.end();});
beforeEach(async()=>{await db.query('begin');f=await seed(db);});
afterEach(async()=>{await db.query('rollback');});
async function weekly(date=null,barber=null,page=1) {
  return (await db.query('select public.get_weekly_commissions($1::date,$2::uuid,$3::integer) result',[date,barber,page])).rows[0].result;
}
async function denied(call,code='42501') {
  await db.query('savepoint denied');
  await assert.rejects(call,{code});
  await db.query('rollback to savepoint denied');
}
test('week includes Monday midnight through Sunday final microsecond in Bogotá',async()=>{
  for(const [at,count] of [
    ['2026-09-28T04:59:59.999999Z','0'],['2026-09-28T05:00:00Z','1'],
    ['2026-10-05T04:59:59.999999Z','1'],['2026-10-05T05:00:00Z','0'],
  ]) {
    await db.query('reset role');await db.query('update public.visits set visited_at=$1 where id=$2',[at,f.a.visit]);
    await asUser(db,f.users.a);
    const data=await weekly('2026-10-04');
    assert.equal(data.week_start,'2026-09-28');assert.equal(data.week_end,'2026-10-04');
    assert.equal(data.previous_week,'2026-09-21');assert.equal(data.next_week,'2026-10-05');
    assert.equal(data.timezone,'America/Bogota');
    assert.equal(data.barbers[0]?.visits ?? '0',count);
  }
  const year=await weekly('2027-01-01');
  assert.equal(year.week_start,'2026-12-28');assert.equal(year.week_end,'2027-01-03');
  const current=await weekly();
  assert.equal(current.is_current,true);
  assert.equal((await weekly(current.week_start)).is_current,true);
});
test('historical inactive barber keeps snapshot commission and service names, VOIDED excluded',async()=>{
  await asUser(db,f.users.a);
  const id=(await db.query("select public.create_visit($1,$2,0,'CARD') id",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:45000}])])).rows[0].id;
  await db.query('reset role');
  await db.query("update public.visits set visited_at='2025-01-01T18:00:00Z' where barbershop_id=$1",[f.a.shop]);
  await asUser(db,f.users.a);
  await db.query('update public.barbers set commission_rate=90,is_active=false where id=$1',[f.a.barber]);
  await db.query("update public.services set name='Nuevo nombre',is_active=false where id=$1",[f.a.service]);
  const data=await weekly('2025-01-01');
  assert.deepEqual(data.barbers,[{id:f.a.barber,name:'Carlos',visits:'2',production:'75000',commission:'30000'}]);
  const detail=await weekly('2025-01-01',f.a.barber);
  assert.deepEqual(detail.barber,data.barbers[0]);assert.equal(detail.visits.length,2);
  assert.ok(detail.visits.every(v=>v.services[0]==='Corte'));
  assert.equal(detail.visits.find(v=>v.id===id).commission,'18000');
  await db.query('select public.void_visit($1)',[id]);
  const after=await weekly('2025-01-01',f.a.barber);
  assert.equal(after.barber.visits,'1');assert.equal(after.barber.production,'30000');assert.equal(after.barber.commission,'12000');
  assert.equal(after.visits.length,1);
  const empty=await weekly('2000-01-01');assert.deepEqual(empty.barbers,[]);
  const emptyDetail=await weekly('2000-01-01',f.a.barber);
  assert.equal(emptyDetail.barber.visits,'0');assert.deepEqual(emptyDetail.visits,[]);
});
test('weekly reads require OWNER and reject cross-tenant or missing barbers identically',async()=>{
  await asUser(db,f.users.a);
  assert.equal((await weekly()).barbers[0].id,f.a.barber);
  await denied(()=>weekly(null,f.b.barber),'P0002');
  await denied(()=>weekly(null,randomUUID()),'P0002');
  await asUser(db,f.users.b);assert.equal((await weekly()).barbers[0].id,f.b.barber);
  for(const user of [f.users.barber,f.users.outsider]) {await asUser(db,user);await denied(()=>weekly());}
  await db.query("select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true)");
  await denied(()=>weekly());
  await db.query('set local role anon');await denied(()=>weekly());
});
test('detail paginates with full exact totals, no duplicate visits from multiple services',async()=>{
  const second=(await db.query("insert into public.services(barbershop_id,name,base_price) values($1,'Barba',1000) returning id",[f.a.shop])).rows[0].id;
  await asUser(db,f.users.a);
  for(let i=0;i<26;i++) await db.query("select public.create_visit($1,$2,0,'CASH')",[f.a.barber,JSON.stringify([
    {service_id:f.a.service,charged_price:'9007199254739991'},{service_id:second,charged_price:1000},
  ])]);
  const first=await weekly(null,f.a.barber), next=await weekly(null,f.a.barber,2);
  assert.equal(first.barber.visits,'27');
  assert.equal(first.barber.production,'234187180623295766');
  assert.equal(first.barber.commission,'93674872249318296');
  assert.deepEqual(first.barber,next.barber);assert.equal(first.visits.length,25);assert.equal(next.visits.length,2);
  assert.equal(first.has_more,true);assert.equal(next.has_more,false);
  assert.equal(new Set([...first.visits,...next.visits].map(v=>v.id)).size,27);
  assert.equal(first.visits[0].services.length,2);
  assert.deepEqual((await weekly(null,f.a.barber,3)).visits,[]);
});
test('invalid dates/pages are rejected and finite calendar extremes stay representable',async()=>{
  await asUser(db,f.users.a);
  for(const date of ['infinity','-infinity','10000-01-01']) await denied(()=>weekly(date),'22023');
  for(const page of [0,-1,null]) await denied(()=>weekly(null,null,page),'22023');
  const first=await weekly('0001-01-01');assert.equal(first.week_start,'0001-01-01');assert.equal(first.previous_week,null);
  const last=await weekly('9999-12-31');assert.equal(last.week_end,'9999-12-31');assert.equal(last.next_week,null);
});


test('zero-value ACTIVE visits still produce a card and never include idle barbers',async()=>{
  await db.query("insert into public.barbers(barbershop_id,name,commission_rate) values($1,'Sin actividad',50)",[f.a.shop]);
  await db.query('update public.visits set subtotal_amount=0,total_amount=0,commission_amount=0 where id=$1',[f.a.visit]);
  await asUser(db,f.users.a);
  const data=await weekly();
  assert.deepEqual(data.barbers,[{id:f.a.barber,name:'Carlos',visits:'1',production:'0',commission:'0'}]);
});
