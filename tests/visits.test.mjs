import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connect, seed, asUser } from './helpers/database.mjs';
let db, f;
before(async () => { db = await connect(); });
after(async () => { await db.end(); });
beforeEach(async () => { await db.query('begin'); f = await seed(db); });
afterEach(async () => { await db.query('rollback'); });
const args = (overrides = {}) => ({ barber: f.a.barber, items: [{ service_id: f.a.service, charged_price: 35000 }], discount: 0, payment: 'CASH', customer: null, newCustomer: null, ...overrides });
async function create(input = args()) {
  return (await db.query('select public.create_visit($1::uuid,$2::jsonb,$3::bigint,$4::text,$5::uuid,$6::jsonb) as id', [input.barber, JSON.stringify(input.items), input.discount, input.payment, input.customer, input.newCustomer && JSON.stringify(input.newCustomer)])).rows[0].id;
}
async function reject(input, pattern = /./) {
  await db.query('savepoint bad_visit');
  await assert.rejects(create(input), pattern);
  await db.query('rollback to savepoint bad_visit');
}
test('occasional visit rounds exact post-discount commission, keeps snapshots and server time', async () => {
  await db.query('update public.barbers set commission_rate=33.33 where id=$1', [f.a.barber]);
  await asUser(db, f.users.a);
  const id = await create(args({ discount: 5000, items: [{ service_id: f.a.service, charged_price: 40000 }] }));
  const visit = (await db.query('select * from public.visits where id=$1', [id])).rows[0];
  assert.equal(visit.customer_id, null);
  assert.equal(visit.total_amount, '35000'); assert.equal(visit.commission_amount, '11666');
  assert.equal(visit.commission_rate, '33.33'); assert.equal(visit.notes, null);
  assert.ok(Math.abs(Date.now() - visit.visited_at.getTime()) < 10000);
  await db.query("update public.services set name='Nuevo nombre', base_price=99000 where id=$1", [f.a.service]);
  await db.query('update public.barbers set commission_rate=50 where id=$1', [f.a.barber]);
  const item = (await db.query('select service_name,catalog_price,charged_price from public.visit_items where visit_id=$1', [id])).rows[0];
  assert.deepEqual(item, { service_name: 'Corte', catalog_price: '30000', charged_price: '40000' });
  assert.equal((await db.query('select commission_rate from public.visits where id=$1', [id])).rows[0].commission_rate, '33.33');
});
test('existing and new customers, multiple services, free total and all payment methods', async () => {
  const second = (await db.query("insert into public.services(barbershop_id,name,base_price) values($1,'Barba',15000) returning id", [f.a.shop])).rows[0].id;
  await asUser(db, f.users.a);
  await reject(args({items:[{service_id:f.a.service,charged_price:'9007199254740991'},{service_id:second,charged_price:'1'}]}),/AMOUNT_TOO_LARGE/);
  const maximum = await create(args({items:[{service_id:f.a.service,charged_price:'9007199254740991'}]}));
  assert.equal((await db.query('select total_amount from public.visits where id=$1',[maximum])).rows[0].total_amount,'9007199254740991');
  const id = await create(args({ customer: f.a.customer, payment: 'TRANSFER', items: [{ service_id:f.a.service,charged_price:30000 },{ service_id:second,charged_price:15000 }] }));
  const v = (await db.query('select * from public.visits where id=$1',[id])).rows[0];
  assert.equal(v.customer_id,f.a.customer); assert.equal(v.subtotal_amount,'45000');
  assert.equal((await db.query('select * from public.visit_items where visit_id=$1',[id])).rowCount,2);
  const newId = await create(args({ newCustomer:{name:' Ana ',phone:' 3001234567 '},payment:'CARD' }));
  const customer = (await db.query('select c.name,c.phone from public.customers c join public.visits v on c.id=v.customer_id where v.id=$1',[newId])).rows[0];
  assert.deepEqual(customer,{name:'Ana',phone:'3001234567'});
  const free = await create(args({discount:35000,payment:'OTHER'}));
  assert.equal((await db.query('select commission_amount from public.visits where id=$1',[free])).rows[0].commission_amount,'0');
});
test('rejects foreign/inactive entities, malformed input, discounts and forged snapshots', async () => {
  await asUser(db,f.users.a);
  for (const input of [
    args({barber:f.b.barber}), args({customer:f.b.customer}), args({items:[{service_id:f.b.service,charged_price:10}]}),
    args({items:[]}),args({items:[{service_id:f.a.service,charged_price:-1}]}),args({items:[{service_id:f.a.service,charged_price:1.2}]}),
    args({items:[{service_id:f.a.service,charged_price:10,service_name:'Fake'}]}), args({items:[{service_id:f.a.service,charged_price:10},{service_id:f.a.service,charged_price:10}]}),
    args({items:[{service_id:f.a.service,charged_price:'9007199254740992'}]}), args({discount:-1}),args({discount:35001}),args({payment:'MIXED'}),args({newCustomer:{name:' '}}),args({customer:f.a.customer,newCustomer:{name:'Ana'}}),
  ]) await reject(input);
  await db.query('update public.barbers set is_active=false where id=$1',[f.a.barber]); await reject(args());
  await db.query('update public.barbers set is_active=true where id=$1',[f.a.barber]);
  await db.query('update public.services set is_active=false where id=$1',[f.a.service]); await reject(args());
});
test('OWNER authorization and tenant RLS remain enforced with direct writes forbidden', async () => {
  for (const user of [f.users.barber,f.users.outsider]) { await asUser(db,user); await reject(args()); }
  await db.query('set local role anon'); await reject(args());
  await asUser(db,f.users.a); const id=await create();
  await asUser(db,f.users.b); assert.equal((await db.query('select * from public.visits where id=$1',[id])).rowCount,0);
  await db.query('reset role'); await db.query('delete from public.barbershop_users where user_id=$1',[f.users.a]);
  await asUser(db,f.users.a); await reject(args());
});
test('late item failure rolls back new customer, visit and prior items atomically', async () => {
  const before = async () => (await db.query("select (select count(*) from public.customers) c,(select count(*) from public.visits) v,(select count(*) from public.visit_items) i")).rows[0];
  const second = (await db.query("insert into public.services(barbershop_id,name,base_price) values($1,'Segundo',12345) returning id", [f.a.shop])).rows[0].id;
  const serviceIds = [f.a.service,second].sort();
  const counts = await before();
  // Test-only transactional trigger forces failure AFTER customer and visit inserts.
  await db.query(`create function private.test_visit_failure() returns trigger language plpgsql as $$ begin if new.charged_price=12345 then raise exception 'forced item failure'; end if; return new; end $$;
    create trigger test_visit_failure before insert on public.visit_items for each row execute function private.test_visit_failure();`);
  await asUser(db,f.users.a);
  await reject(args({newCustomer:{name:'Must roll back'},items:[{service_id:serviceIds[0],charged_price:35000},{service_id:serviceIds[1],charged_price:12345}]}),/forced item failure/);
  await db.query('reset role'); assert.deepEqual(await before(),counts);
});
