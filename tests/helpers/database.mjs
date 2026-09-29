import pg from 'pg';
import { randomUUID } from 'node:crypto';

// Never run fixture-writing tests against a hosted/pilot database.
export function localDatabaseUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('Database tests only accept a local database.');
  }
  return url.toString();
}

export async function connect() {
  const db = new pg.Client({ connectionString: localDatabaseUrl() });
  await db.connect();
  return db;
}

export async function seed(db) {
  const users = { a: randomUUID(), b: randomUUID(), barber: randomUUID(), outsider: randomUUID() };
  for (const id of Object.values(users)) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@example.test`]);
  }
  const shops = {};
  for (const side of ['a', 'b']) {
    const ids = Object.fromEntries(['shop', 'membership', 'barber', 'service', 'customer', 'loyalty', 'visit', 'item'].map(key => [key, randomUUID()]));
    shops[side] = ids;
    await db.query('insert into public.barbershops (id, name) values ($1, $2)', [ids.shop, `Barbería ${side}`]);
    await db.query("insert into public.barbershop_users (id, barbershop_id, user_id, role) values ($1, $2, $3, 'OWNER')", [ids.membership, ids.shop, users[side]]);
    await db.query("insert into public.barbers (id, barbershop_id, name, commission_rate) values ($1, $2, 'Carlos', 40)", [ids.barber, ids.shop]);
    await db.query("insert into public.services (id, barbershop_id, name, base_price) values ($1, $2, 'Corte', 30000)", [ids.service, ids.shop]);
    await db.query("insert into public.customers (id, barbershop_id, name) values ($1, $2, 'Juan')", [ids.customer, ids.shop]);
    await db.query("insert into public.loyalty_programs (id, barbershop_id, required_visits, reward_description) values ($1, $2, 6, 'Corte gratis')", [ids.loyalty, ids.shop]);
    await db.query(`insert into public.visits (id, barbershop_id, customer_id, barber_id, payment_method, subtotal_amount, discount_amount, total_amount, commission_rate, commission_amount)
      values ($1, $2, $3, $4, 'CASH', 30000, 0, 30000, 40, 12000)`, [ids.visit, ids.shop, ids.customer, ids.barber]);
    await db.query("insert into public.visit_items (id, barbershop_id, visit_id, service_id, service_name, catalog_price, charged_price) values ($1, $2, $3, $4, 'Corte', 30000, 30000)", [ids.item, ids.shop, ids.visit, ids.service]);
  }
  await db.query("insert into public.barbershop_users (barbershop_id, user_id, role) values ($1, $2, 'BARBER')", [shops.a.shop, users.barber]);
  return { users, ...shops };
}

export async function asUser(db, id) {
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [id, JSON.stringify({ sub: id, role: 'authenticated' })]);
}
