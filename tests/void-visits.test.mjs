import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connect, seed, asUser } from './helpers/database.mjs';
let db, f;
before(async () => { db = await connect(); });
after(async () => { await db.end(); });
beforeEach(async () => { await db.query('begin'); f = await seed(db); });
afterEach(async () => { await db.query('rollback'); });
async function voidVisit(id) {
  return (await db.query('select public.void_visit($1::uuid) as id', [id])).rows[0].id;
}
async function rejected(id) {
  await db.query('savepoint invalid_void');
  let failure;
  try { await voidVisit(id); } catch (error) { failure = { code: error.code, message: error.message }; }
  await db.query('rollback to savepoint invalid_void');
  assert.ok(failure, 'An unauthorized or repeated void must fail');
  return failure;
}
test('void changes only state and server timestamps, preserving the visit and every item', async () => {
  await asUser(db, f.users.a);
  const before = (await db.query('select * from public.visits where id=$1', [f.a.visit])).rows[0];
  const items = (await db.query('select * from public.visit_items where visit_id=$1', [f.a.visit])).rows;
  const earliest = (await db.query('select clock_timestamp() as at')).rows[0].at;
  assert.equal(await voidVisit(f.a.visit), f.a.visit);
  const after = (await db.query('select * from public.visits where id=$1', [f.a.visit])).rows[0];
  const latest = (await db.query('select clock_timestamp() as at')).rows[0].at;
  assert.equal(after.status, 'VOIDED');
  assert.ok(after.voided_at >= earliest && after.voided_at <= latest);
  assert.deepEqual(after, { ...before, status: 'VOIDED', voided_at: after.voided_at, updated_at: after.updated_at });
  assert.deepEqual((await db.query('select * from public.visit_items where visit_id=$1', [f.a.visit])).rows, items);
  assert.deepEqual(await rejected(f.a.visit), { code: '22023', message: 'VISIT_UNAVAILABLE' });
  assert.deepEqual((await db.query('select * from public.visits where id=$1', [f.a.visit])).rows[0], after);
});
test('foreign and missing visits return identical errors and foreign data stays invisible', async () => {
  await asUser(db, f.users.a);
  assert.deepEqual(await rejected(f.b.visit), await rejected(randomUUID()));
  assert.deepEqual(await rejected(f.b.visit), { code: '22023', message: 'VISIT_UNAVAILABLE' });
  assert.equal((await db.query('select * from public.visits where id=$1', [f.b.visit])).rowCount, 0);
  assert.equal((await db.query('select * from public.visit_items where visit_id=$1', [f.b.visit])).rowCount, 0);
  await db.query('reset role');
  assert.equal((await db.query('select status from public.visits where id=$1', [f.b.visit])).rows[0].status, 'ACTIVE');
});
test('only authenticated OWNER membership authorizes void; revocation takes effect', async () => {
  for (const user of [f.users.barber, f.users.outsider]) {
    await asUser(db, user);
    assert.equal((await rejected(f.a.visit)).code, '42501');
  }
  await db.query('set local role anon');
  assert.equal((await rejected(f.a.visit)).code, '42501');
  await db.query('reset role');
  await db.query('delete from public.barbershop_users where user_id=$1', [f.users.a]);
  await asUser(db, f.users.a);
  assert.equal((await rejected(f.a.visit)).code, '42501');
});
test('void does not grant direct visit/item writes or restoration', async () => {
  await asUser(db, f.users.a);
  await voidVisit(f.a.visit);
  for (const sql of [
    "update public.visits set status='ACTIVE',voided_at=null where id=$1",
    'delete from public.visits where id=$1',
    'delete from public.visit_items where visit_id=$1',
    'update public.visit_items set charged_price=0 where visit_id=$1',
  ]) {
    await db.query('savepoint forbidden_write');
    await assert.rejects(db.query(sql, [f.a.visit]), { code: '42501' });
    await db.query('rollback to savepoint forbidden_write');
  }
});
