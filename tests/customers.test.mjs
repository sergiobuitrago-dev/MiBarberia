import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connect, seed, asUser } from './helpers/database.mjs';
let db, f;
before(async () => { db = await connect(); });
after(async () => { await db.end(); });
beforeEach(async () => { await db.query('begin'); f = await seed(db); });
afterEach(async () => { await db.query('rollback'); });
const search = async (q = '', page = 1) => (await db.query('select public.search_customers($1,$2) result',[q,page])).rows[0].result;
const profile = async id => (await db.query('select * from public.customer_activity where id=$1',[id])).rows[0];
test('identified visit creates searchable customer; occasional visit creates no customer; formatted phone and literal name search', async () => {
  await asUser(db,f.users.a);
  await db.query("select public.create_visit($1,$2,0,'CASH',null,$3)",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:35000}]),JSON.stringify({name:'Juan Pérez 100%',phone:'+57 (300) 123-4567'})]);
  await db.query("select public.create_visit($1,$2,0,'CASH')",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:30000}])]);
  const result=await search('pÉrEz');
  assert.equal(result.customers.length,1);assert.equal(result.customers[0].total_visits,'1');assert.equal(result.customers[0].total_spent,'35000');
  assert.equal((await search('3001234567')).customers[0].id,result.customers[0].id);
  assert.equal((await search('(300) 123-4567')).customers[0].id,result.customers[0].id);
  assert.equal((await search('%')).customers.length,1);
  assert.equal((await search('_')).customers.length,0);
  assert.equal((await search()).total,'2');
});
test('one visit with multiple services counts once; voids change total and last date; zero-active customer remains', async () => {
  await db.query("update public.visits set visited_at='2026-01-01T12:00:00Z' where id=$1",[f.a.visit]);
  const service=(await db.query("insert into public.services(barbershop_id,name,base_price) values($1,'Barba',15000) returning id",[f.a.shop])).rows[0].id;
  await asUser(db,f.users.a);
  const id=(await db.query("select public.create_visit($1,$2,5000,'CASH',$3) id",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:30000},{service_id:service,charged_price:15000}]),f.a.customer])).rows[0].id;
  let p=await profile(f.a.customer);
  assert.equal(p.total_visits,'2');assert.equal(p.total_spent,'70000');
  assert.equal(p.last_visit.getTime(),(await db.query('select visited_at from public.visits where id=$1',[id])).rows[0].visited_at.getTime());
  await db.query('select public.void_visit($1)',[id]);p=await profile(f.a.customer);
  assert.equal(p.total_visits,'1');assert.equal(p.total_spent,'30000');assert.equal(p.last_visit.toISOString(),'2026-01-01T12:00:00.000Z');
  await db.query('select public.void_visit($1)',[f.a.visit]);p=await profile(f.a.customer);
  assert.equal(p.total_visits,'0');assert.equal(p.total_spent,'0');assert.equal(p.last_visit,null);
  assert.equal((await search()).customers[0].id,f.a.customer);
});
test('search/view/edit enforce tenant isolation; nullable and shared phone allowed; unauthorized roles denied', async () => {
  await asUser(db,f.users.a);
  assert.equal((await search()).customers.length,1);assert.equal(await profile(f.b.customer),undefined);
  assert.equal((await db.query('update public.customers set name=$1,phone=$2 where id=$3 returning id',['Changed','3001234567',f.b.customer])).rowCount,0);
  await db.query('update public.customers set name=$1,phone=$2 where id=$3',['Changed','3001234567',f.a.customer]);
  await db.query("insert into public.customers(barbershop_id,name,phone) values($1,'Shared','3001234567')",[f.a.shop]);
  assert.equal((await search('300 123 4567')).customers.length,2);
  await db.query('update public.customers set phone=null where id=$1',[f.a.customer]);
  assert.equal((await profile(f.a.customer)).phone,null);
  await asUser(db,f.users.b);assert.equal(await profile(f.a.customer),undefined);assert.equal((await search('Changed')).total,'0');
  for(const user of [f.users.barber,f.users.outsider]) {
    await asUser(db,user);assert.equal(await profile(f.a.customer),undefined);
    await db.query('savepoint denied');await assert.rejects(search(),{code:'42501'});await db.query('rollback to savepoint denied');
  }
  await db.query('set local role anon');await db.query('savepoint denied');await assert.rejects(search(),{code:'42501'});await db.query('rollback to savepoint denied');
  await db.query('savepoint denied');await assert.rejects(profile(f.a.customer),{code:'42501'});await db.query('rollback to savepoint denied');
});
test('recent activity precedes no activity; pagination is bounded and stable; exact sum exceeds JS safe integer', async () => {
  await db.query("insert into public.customers(barbershop_id,name) select $1,'Cliente ' || lpad(n::text,2,'0') from generate_series(1,26) n",[f.a.shop]);
  await asUser(db,f.users.a);
  const first=await search(),second=await search('',2);
  assert.equal(first.customers.length,25);assert.equal(first.total,'27');assert.equal(first.customers[0].id,f.a.customer);
  assert.equal(second.customers.length,2);assert.equal(new Set([...first.customers,...second.customers].map(c=>c.id)).size,27);
  assert.equal((await search('',3)).customers.length,0);
  for(let i=0;i<2;i++) await db.query("select public.create_visit($1,$2,0,'CASH',$3)",[f.a.barber,JSON.stringify([{service_id:f.a.service,charged_price:'9007199254740991'}]),f.a.customer]);
  assert.equal((await profile(f.a.customer)).total_spent,'18014398509511982');
});
