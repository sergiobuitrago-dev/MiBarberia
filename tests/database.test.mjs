import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { connect, seed, asUser } from './helpers/database.mjs';

let db;
let f;
before(async () => { db = await connect(); });
after(async () => { await db?.end(); });
beforeEach(async () => { await db.query('begin'); f = await seed(db); });
afterEach(async () => { await db.query('rollback'); });

const tables = ['barbershops', 'barbershop_users', 'barbers', 'services', 'customers', 'visits', 'visit_items', 'loyalty_programs'];
for (const side of ['a', 'b']) {
  for (const table of tables) {
    test(`OWNER ${side.toUpperCase()} only reads its own ${table}, even without tenant filters`, async () => {
      await asUser(db, f.users[side]);
      const { rows } = await db.query(`select * from public.${table}`);
      assert.equal(rows.length, 1);
      assert.equal(table === 'barbershops' ? rows[0].id : rows[0].barbershop_id, f[side].shop);
    });
  }
}

for (const table of tables.filter(t => t !== 'barbershop_users')) {
  for (const user of ['barber', 'outsider']) {
    test(`${user} has no business access to ${table}`, async () => {
      await asUser(db, f.users[user]);
      assert.equal((await db.query(`select * from public.${table}`)).rowCount, 0);
    });
  }
  test(`anonymous cannot read ${table}`, async () => {
    await db.query('set local role anon');
    await assert.rejects(db.query(`select * from public.${table}`), { code: '42501' });
  });
}

const changes = { barbershops: "name = 'Changed'", barbers: "name = 'Changed'", services: "base_price = 40000", customers: "name = 'Changed'", loyalty_programs: 'required_visits = 8' };
for (const [table, change] of Object.entries(changes)) {
  const tenantColumn = table === 'barbershops' ? 'id' : 'barbershop_id';
  test(`OWNER A can update own ${table} and cannot update B`, async () => {
    await asUser(db, f.users.a);
    assert.equal((await db.query(`update public.${table} set ${change} where ${tenantColumn} = $1 returning *`, [f.b.shop])).rowCount, 0);
    assert.equal((await db.query(`update public.${table} set ${change} where ${tenantColumn} = $1 returning *`, [f.a.shop])).rowCount, 1);
  });
}

for (const table of ['barbers', 'services', 'customers', 'loyalty_programs']) {
  test(`OWNER A cannot move ${table} to B`, async () => {
    await asUser(db, f.users.a);
    await assert.rejects(db.query(`update public.${table} set barbershop_id = $1 where barbershop_id = $2`, [f.b.shop, f.a.shop]), { code: '42501' });
  });
}

const inserts = {
  barbers: "(barbershop_id, name, commission_rate) values ($1, 'Nuevo', 50)",
  services: "(barbershop_id, name, base_price) values ($1, 'Barba', 15000)",
  customers: "(barbershop_id, name) values ($1, 'Nuevo')",
  loyalty_programs: "(barbershop_id, required_visits, reward_description) values ($1, 7, 'Premio')",
};
for (const [table, values] of Object.entries(inserts)) {
  test(`OWNER A cannot insert ${table} in B`, async () => {
    await asUser(db, f.users.a);
    await assert.rejects(db.query(`insert into public.${table} ${values}`, [f.b.shop]), { code: '42501' });
  });
  test(`OWNER A can insert its own ${table}`, async () => {
    if (table === 'loyalty_programs') await db.query('delete from public.loyalty_programs where barbershop_id = $1', [f.a.shop]);
    await asUser(db, f.users.a);
    assert.equal((await db.query(`insert into public.${table} ${values} returning id`, [f.a.shop])).rowCount, 1);
  });
}

for (const table of tables) {
  test(`OWNER cannot delete ${table}`, async () => {
    await asUser(db, f.users.a);
    await assert.rejects(db.query(`delete from public.${table}`), { code: '42501' });
  });
}

test('OWNER cannot create a shop or provision itself into B', async () => {
  await asUser(db, f.users.a);
  await assert.rejects(db.query("insert into public.barbershop_users (barbershop_id, user_id, role) values ($1, $2, 'OWNER')", [f.b.shop, f.users.a]), { code: '42501' });
});
test('OWNER cannot change a membership role', async () => {
  await asUser(db, f.users.a);
  await assert.rejects(db.query("update public.barbershop_users set role = 'OWNER'"), { code: '42501' });
});
test('OWNER cannot create barbershops', async () => {
  await asUser(db, f.users.a);
  await assert.rejects(db.query("insert into public.barbershops (name) values ('Unauthorized')"), { code: '42501' });
});
test('membership revocation immediately removes business access', async () => {
  await db.query('delete from public.barbershop_users where user_id = $1', [f.users.a]);
  await asUser(db, f.users.a);
  assert.equal((await db.query('select * from public.barbers')).rowCount, 0);
});
test('user-editable JWT metadata does not grant OWNER access', async () => {
  await asUser(db, f.users.outsider);
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: f.users.outsider, role: 'authenticated', user_metadata: { role: 'OWNER', barbershop_id: f.a.shop } })]);
  assert.equal((await db.query('select * from public.barbershops')).rowCount, 0);
});

for (const table of ['visits', 'visit_items']) {
  test(`direct writes to ${table} are blocked until transactional visit functions exist`, async () => {
    await asUser(db, f.users.a);
    await assert.rejects(db.query(`update public.${table} set barbershop_id = barbershop_id`), { code: '42501' });
  });
}

for (const [column, value] of [['barber_id', 'barber'], ['customer_id', 'customer']]) {
  test(`composite FK rejects cross-tenant ${column} even for a privileged writer`, async () => {
    await assert.rejects(db.query(`update public.visits set ${column} = $1 where id = $2`, [f.b[value], f.a.visit]), { code: '23503' });
  });
}
for (const [column, value] of [['visit_id', 'visit'], ['service_id', 'service']]) {
  test(`composite FK rejects cross-tenant item ${column}`, async () => {
    await assert.rejects(db.query(`update public.visit_items set ${column} = $1 where id = $2`, [f.b[value], f.a.item]), { code: '23503' });
  });
}

for (const [table, change] of [
  ['barbers', 'commission_rate = 101'], ['barbers', 'commission_rate = -1'],
  ['services', 'base_price = -1'], ['visit_items', 'charged_price = -1'],
  ['visits', 'discount_amount = 30001'], ['visits', 'total_amount = 1'],
  ['visits', 'commission_amount = 1'], ['visits', "status = 'VOIDED'"],
  ['loyalty_programs', 'required_visits = 0'], ['customers', "name = '   '"],
]) {
  test(`database rejects impossible value: ${table} ${change}`, async () => {
    await assert.rejects(db.query(`update public.${table} set ${change}`), { code: '23514' });
  });
}

test('occasional customer is NULL and does not require an artificial customer', async () => {
  const { rows } = await db.query('update public.visits set customer_id = null where id = $1 returning customer_id', [f.a.visit]);
  assert.equal(rows[0].customer_id, null);
});
test('editing catalog and barber rate does not rewrite historical snapshots', async () => {
  await asUser(db, f.users.a);
  await db.query('update public.barbers set commission_rate = 50');
  await db.query("update public.services set name = 'Nuevo corte', base_price = 45000");
  const { rows: [visit] } = await db.query('select commission_rate, commission_amount from public.visits');
  const { rows: [item] } = await db.query('select service_name, catalog_price, charged_price from public.visit_items');
  assert.equal(visit.commission_rate, '40.00');
  assert.equal(visit.commission_amount, '12000');
  assert.deepEqual(item, { service_name: 'Corte', catalog_price: '30000', charged_price: '30000' });
});

test('manual provisioning creates a shop and OWNER membership together', async () => {
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [f.users.outsider]);
  const sql = readFileSync('supabase/manual/provision-owner.sql', 'utf8')
    .replace(/v_owner_email text := '[^']*'/, `v_owner_email text := '${f.users.outsider}@example.test'`)
    .replace(/v_shop_name text := '[^']*'/, "v_shop_name text := 'Primera barbería'");
  await db.query(sql);
  await asUser(db, f.users.outsider);
  const { rows } = await db.query('select name, currency_code, timezone from public.barbershops');
  assert.deepEqual(rows, [{ name: 'Primera barbería', currency_code: 'COP', timezone: 'America/Bogota' }]);
});

test('manual provisioning rejects an existing OWNER without creating another shop', async () => {
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [f.users.a]);
  const sql = readFileSync('supabase/manual/provision-owner.sql', 'utf8')
    .replace(/v_owner_email text := '[^']*'/, `v_owner_email text := '${f.users.a}@example.test'`)
    .replace(/v_shop_name text := '[^']*'/, "v_shop_name text := 'Duplicada'");
  const previousCount = (await db.query('select * from public.barbershops')).rowCount;
  await db.query('savepoint provisioning');
  await assert.rejects(db.query(sql), /ya tiene una barbería OWNER/);
  await db.query('rollback to savepoint provisioning');
  assert.equal((await db.query('select * from public.barbershops')).rowCount, previousCount);
});
