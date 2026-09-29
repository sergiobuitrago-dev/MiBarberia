import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin = createClient(url, process.env.SUPABASE_TEST_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const owner = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `history-${randomUUID()}@example.test`, password = `Test-${randomUUID()}!`;
let userId: string, shopId: string, otherShop: string, barberId: string, otherBarber: string;
async function insert(table: string, values: Record<string, unknown>) {
  const { data, error } = await admin.from(table).insert(values).select('id').single();
  if (error) throw error;
  return data.id as string;
}
test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error;
  userId = data.user.id;
  shopId = await insert('barbershops', { name: 'Historial de prueba' });
  otherShop = await insert('barbershops', { name: 'Barbería privada' });
  await insert('barbershop_users', { barbershop_id: shopId, user_id: userId, role: 'OWNER' });
  barberId = await insert('barbers', { barbershop_id: shopId, name: 'Carlos', commission_rate: 40 });
  otherBarber = await insert('barbers', { barbershop_id: otherShop, name: 'Barbero privado', commission_rate: 40 });
  const login = await owner.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
});
test.afterAll(async () => {
  await owner.auth.signOut();
  for (const table of ['visit_items', 'visits', 'customers', 'services', 'barbers', 'barbershop_users']) {
    const { error } = await admin.from(table).delete().in('barbershop_id', [shopId, otherShop].filter(Boolean));
    if (error) throw error;
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
  await admin.from('barbershops').delete().in('id', [shopId, otherShop].filter(Boolean));
});

test('bounded history, stable ties, tenant isolation and concurrent cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Visitas', exact: true }).click();
  await expect(page.getByText('Aún no hay visitas', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: '+ Nueva visita' })).toBeVisible();

  const prefix = randomUUID().slice(0, 8);
  const ids = Array.from({ length: 26 }, (_, i) => `${prefix}-1111-4111-8111-${String(i + 1).padStart(12, '0')}`);
  const values = ids.map((id, i) => ({ id, barbershop_id: shopId, barber_id: barberId,
    subtotal_amount: 30000, discount_amount: 5000, total_amount: 25000, commission_rate: 40, commission_amount: 10000,
    payment_method: 'TRANSFER', visited_at: i === 0 ? '2026-09-29T15:00:00Z' : '2026-09-28T15:00:00Z',
  }));
  const visits = await admin.from('visits').insert(values); expect(visits.error).toBeNull();
  const service = await insert('services', { barbershop_id: shopId, name: 'Nombre cambiado del catálogo', base_price: 99000 });
  const items = await admin.from('visit_items').insert(ids.map(id => ({ barbershop_id: shopId, visit_id: id, service_id: service,
    service_name: 'Corte original', catalog_price: 30000, charged_price: 30000 })));
  expect(items.error).toBeNull();
  const foreignId = await insert('visits', { ...values[0], id: randomUUID(), barbershop_id: otherShop, barber_id: otherBarber });
  await page.reload();
  const links = page.getByRole('list', { name: 'Historial de visitas' }).getByRole('link');
  await expect(links).toHaveCount(25);
  await expect(links.first()).toHaveAttribute('href', `/visitas/${ids[0]}`);
  await expect(links.nth(1)).toHaveAttribute('href', `/visitas/${ids[25]}`);
  await expect(links.last()).toHaveAttribute('href', `/visitas/${ids[2]}`);
  await expect(page.getByText('Barbero privado')).toHaveCount(0);
  await page.getByRole('link', { name: 'Siguiente', exact: true }).click();
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute('href', `/visitas/${ids[1]}`);
  await expect(page.getByRole('link', { name: 'Siguiente', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Anterior', exact: true }).click();
  await expect(links).toHaveCount(25);

  const missingId = randomUUID();
  await page.goto(`/visitas/${foreignId}`);
  await expect(page.getByRole('heading', { name: 'Visita no disponible' })).toBeVisible();
  const denied = await page.getByRole('main').innerText();
  await page.goto(`/visitas/${missingId}`);
  await expect(page.getByRole('main')).toHaveText(denied, { useInnerText: true });
  const foreign = await owner.rpc('void_visit', { p_visit_id: foreignId });
  const missing = await owner.rpc('void_visit', { p_visit_id: missingId });
  expect(foreign.status).toBe(missing.status);
  expect(foreign.error).toEqual(missing.error);
  expect(foreign.error?.message).toBe('VISIT_UNAVAILABLE');
  expect((await owner.from('visits').select('id').eq('id', foreignId)).data).toEqual([]);
  expect((await admin.from('visits').select('status').eq('id', foreignId).single()).data?.status).toBe('ACTIVE');

  await page.goto(`/visitas/${ids[0]}`);
  await expect(page.getByText('Corte original', { exact: true })).toBeVisible();
  await expect(page.getByText('$30.000', { exact: true })).toHaveCount(2);
  await expect(page.getByText('$5.000', { exact: true })).toBeVisible();
  await expect(page.getByText('$25.000', { exact: true })).toBeVisible();
  await expect(page.getByText('Carlos · Transferencia', { exact: true })).toBeVisible();
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-09-29T15:00:00+00:00');
  await expect(page.getByRole('main')).not.toContainText('99.000');
  await page.getByRole('button', { name: 'Anular visita', exact: true }).click();
  // Another tab/client races with this already-open confirmation.
  const attempts = await Promise.all([owner.rpc('void_visit', { p_visit_id: ids[0] }), owner.rpc('void_visit', { p_visit_id: ids[0] })]);
  expect(attempts.filter(result => !result.error)).toHaveLength(1);
  expect(attempts.filter(result => result.error?.message === 'VISIT_UNAVAILABLE')).toHaveLength(1);
  const originalTime = (await admin.from('visits').select('voided_at').eq('id', ids[0]).single()).data?.voided_at;
  await page.getByRole('button', { name: 'Anular visita', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('No pudimos anular esta visita');
  await expect(page.getByRole('button', { name: 'Anular visita', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Actualizar detalle', exact: true }).click();
  await expect(page.getByText('ANULADA', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anular visita', exact: true })).toHaveCount(0);
  expect((await admin.from('visits').select('voided_at').eq('id', ids[0]).single()).data?.voided_at).toBe(originalTime);
  await page.getByRole('link', { name: '← Visitas', exact: true }).click();
  await expect(links.first()).toContainText('ANULADA');
  await page.goto('/visitas?pagina=100');
  await expect(page.getByText('No hay visitas en esta página')).toBeVisible();
  await page.getByRole('link', { name: 'Volver al historial', exact: true }).click();
  await expect(links).toHaveCount(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
