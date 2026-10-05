import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connect, seed, asUser } from './helpers/database.mjs';
let db, f;
before(async () => { db = await connect(); });
after(async () => { await db.end(); });
beforeEach(async () => { await db.query('begin'); f = await seed(db); });
afterEach(async () => { await db.query('rollback'); });
async function dashboard(period = 'today', start = null, end = null) {
  return (await db.query('select public.get_dashboard($1,$2::date,$3::date) as result', [period,start,end])).rows[0].result;
}
test('empty and single visit use zero-safe totals and tenant-scoped aggregates', async () => {
  await asUser(db, f.users.a);
  const empty = await dashboard('custom','2000-01-01','2000-01-01');
  assert.deepEqual(empty.totals,{sales:'0',visits:'0',commissions:'0',shop:'0'});
  assert.deepEqual([empty.payments,empty.barbers,empty.services],[[],[],[]]);
  const one = await dashboard();
  assert.deepEqual(one.totals,{sales:'30000',visits:'1',commissions:'12000',shop:'18000'});
  assert.deepEqual(one.payments,[{method:'CASH',amount:'30000'}]);
  assert.equal(one.barbers[0].id,f.a.barber);
  assert.equal(one.services[0].id,f.a.service);
  await asUser(db,f.users.b);
  const b = await dashboard();
  assert.equal(b.barbers[0].id,f.b.barber);
  for (const user of [f.users.barber,f.users.outsider]) {
    await asUser(db,user);await db.query('savepoint denied');
    await assert.rejects(dashboard(),{code:'42501'});await db.query('rollback to savepoint denied');
  }
  await db.query('set local role anon');await db.query('savepoint denied');
  await assert.rejects(dashboard(),{code:'42501'});await db.query('rollback to savepoint denied');
});
test('create and void update every aggregate without join multiplication or recomputing commission', async () => {
  const second = (await db.query("insert into public.services(barbershop_id,name,base_price) values($1,'Barba',15000) returning id",[f.a.shop])).rows[0].id;
  await asUser(db,f.users.a);
  await db.query("update public.services set name='Corte actual' where id=$1",[f.a.service]);
  const id = (await db.query("select public.create_visit($1,$2,0,'TRANSFER') id",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:30000},{service_id:second,charged_price:15000}])])).rows[0].id;
  await db.query('update public.barbers set commission_rate=80 where id=$1',[f.a.barber]);
  const active = await dashboard();
  assert.deepEqual(active.totals,{sales:'75000',visits:'2',commissions:'30000',shop:'45000'});
  assert.deepEqual(active.payments,[{method:'CASH',amount:'30000'},{method:'TRANSFER',amount:'45000'}]);
  assert.deepEqual(active.barbers,[{id:f.a.barber,name:'Carlos',visits:'2',production:'75000',commission:'30000'}]);
  assert.deepEqual(active.services.map(s=>[s.name,s.quantity]),[['Corte actual','2'],['Barba','1']]);
  assert.equal((await db.query('select service_name from public.visit_items where id=$1',[f.a.item])).rows[0].service_name,'Corte');
  await db.query('select public.void_visit($1)',[id]);
  const voided = await dashboard();
  assert.deepEqual(voided.totals,{sales:'30000',visits:'1',commissions:'12000',shop:'18000'});
  assert.deepEqual(voided.payments,[{method:'CASH',amount:'30000'}]);
  assert.equal(voided.barbers[0].commission,'12000');assert.equal(voided.barbers[0].visits,'1');
  assert.deepEqual(voided.services.map(s=>[s.name,s.quantity]),[['Corte actual','1']]);
});
test('local calendar boundaries for today, Monday week, month and inclusive custom dates', async () => {
  const local = new Date(Date.now()-5*3600000);
  const day = Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),5);
  const week = day-((local.getUTCDay()+6)%7)*86400000;
  const month = Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),1,5);
  for (const [period,start] of [['today',day],['week',week],['month',month]]) {
    await db.query('reset role');await db.query('update public.visits set visited_at=$1 where id=$2',[new Date(start),f.a.visit]);
    await asUser(db,f.users.a);const d = await dashboard(period);
    assert.equal(new Date(d.start).getTime(),start);assert.equal(d.timezone,'America/Bogota');assert.equal(d.totals.visits,'1');
    if(period==='today') assert.equal(new Date(d.end).getTime(),day+86400000);
    else assert.ok(Math.abs(new Date(d.end).getTime()-Date.now())<10000);
    await db.query('reset role');await db.query('update public.visits set visited_at=$1::timestamptz-interval \'1 microsecond\' where id=$2',[new Date(start),f.a.visit]);
    await asUser(db,f.users.a);assert.equal((await dashboard(period)).totals.visits,'0');
    await db.query('reset role');await db.query('update public.visits set visited_at=$1 where id=$2',[new Date(day+86400000),f.a.visit]);
    await asUser(db,f.users.a);assert.equal((await dashboard(period)).totals.visits,'0');
  }
  for(const [at,count] of [['2026-02-01T04:59:59.999Z','0'],['2026-02-01T05:00:00Z','1'],['2026-03-01T04:59:59.999Z','1'],['2026-03-01T05:00:00Z','0']]) {
    await db.query('reset role');await db.query('update public.visits set visited_at=$1 where id=$2',[at,f.a.visit]);
    await asUser(db,f.users.a);assert.equal((await dashboard('custom','2026-02-01','2026-02-28')).totals.visits,count);
  }
  for(const args of [['invalid'],['custom'],['custom','2026-02-02','2026-02-01']]) {
    await db.query('savepoint bad_period');await assert.rejects(dashboard(...args),{code:'22023'});await db.query('rollback to savepoint bad_period');
  }
});
test('multiple barbers and payments remain separate; top five services merge renamed snapshots', async () => {
  const secondBarber=(await db.query("insert into public.barbers(barbershop_id,name,commission_rate) values($1,'Andrés',50) returning id",[f.a.shop])).rows[0].id;
  const services=[];
  for(let i=0;i<6;i++) services.push((await db.query("insert into public.services(barbershop_id,name,base_price) values($1,$2,1000) returning id",[f.a.shop,`Servicio ${i}`])).rows[0].id);
  await asUser(db,f.users.a);
  for(const payment of ['TRANSFER','CARD','OTHER']) await db.query('select public.create_visit($1,$2,0,$3)',[secondBarber,JSON.stringify(services.map(id=>({service_id:id,charged_price:1000}))),payment]);
  const data=await dashboard();
  assert.deepEqual(data.totals,{sales:'48000',visits:'4',commissions:'21000',shop:'27000'});
  assert.deepEqual(data.payments.map(p=>[p.method,p.amount]),[['CASH','30000'],['TRANSFER','6000'],['CARD','6000'],['OTHER','6000']]);
  assert.deepEqual(data.barbers.map(b=>[b.name,b.visits,b.production,b.commission]),[['Carlos','1','30000','12000'],['Andrés','3','18000','9000']]);
  assert.equal(data.services.length,5);
  assert.ok(data.services.every(s=>s.quantity==='3'));
  assert.deepEqual(data.services.map(s=>s.id),services.sort().slice(0,5));
});
test('aggregate COP amounts remain exact above the JavaScript safe integer limit', async () => {
  await asUser(db,f.users.a);
  for(let i=0;i<2;i++) await db.query("select public.create_visit($1,$2,0,'CASH')",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:'9007199254740991'}])]);
  const data=await dashboard();
  assert.equal(data.totals.sales,'18014398509511982');
  assert.equal(data.payments[0].amount,'18014398509511982');
  assert.equal(data.barbers[0].production,'18014398509511982');
  assert.equal(data.daily_sales.at(-1).sales,'18014398509511982');
});

test('seven local calendar days include zeros, exclude VOIDED and are independent of period', async () => {
  const { today, first, tomorrow } = (await db.query(`select
    (statement_timestamp() at time zone 'America/Bogota')::date::text today,
    ((statement_timestamp() at time zone 'America/Bogota')::date-6)::text first,
    ((statement_timestamp() at time zone 'America/Bogota')::date+1)::text tomorrow`)).rows[0];
  await db.query('update public.visits set visited_at=$1::date::timestamp at time zone \'America/Bogota\' where id=$2', [first,f.a.visit]);
  await asUser(db,f.users.a);
  const data = await dashboard('custom','2000-01-01','2000-01-01');
  assert.equal(data.totals.sales,'0');
  assert.equal(data.daily_sales?.length,7);
  assert.deepEqual(data.daily_sales[0],{date:first,sales:'30000'});
  assert.deepEqual(data.daily_sales[6],{date:today,sales:'0'});
  assert.ok(data.daily_sales.slice(1).every(d=>d.sales==='0'));
  for(const period of ['today','week','month']) assert.deepEqual((await dashboard(period)).daily_sales,data.daily_sales);
  // Bogotá midnight, not UTC midnight; include the last microsecond of today.
  for(const [expression,want] of [
    ["$1::date::timestamp at time zone 'America/Bogota'",'0'],
    ["($1::date::timestamp at time zone 'America/Bogota') - interval '1 microsecond'",'30000'],
  ]) {
    await db.query('reset role');
    await db.query(`update public.visits set visited_at=${expression} where id=$2`,[tomorrow,f.a.visit]);
    await asUser(db,f.users.a);
    assert.equal((await dashboard()).daily_sales[6].sales,want);
  }
  await db.query('select public.void_visit($1)',[f.a.visit]);
  assert.ok((await dashboard()).daily_sales.every(d=>d.sales==='0'));
  await db.query('reset role');
  await db.query("update public.visits set status='ACTIVE', voided_at=null, visited_at=($1::date::timestamp at time zone 'America/Bogota')-interval '1 microsecond' where id=$2",[first,f.a.visit]);
  await asUser(db,f.users.a);
  assert.ok((await dashboard()).daily_sales.every(d=>d.sales==='0'));
});
