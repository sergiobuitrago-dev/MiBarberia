import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin = createClient(url, process.env.SUPABASE_TEST_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const users: { id: string; email: string; password: string }[] = [];
const shops: string[] = [];
const foreign: Record<string, string> = {};

test.beforeAll(async () => {
  for (const name of ['Estudio de prueba', 'Otra barbería']) {
    const email = `${randomUUID()}@example.test`, password = `Test-${randomUUID()}!`;
    const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (user.error || !user.data.user) throw user.error;
    users.push({ id: user.data.user.id, email, password });
    const shop = await admin.from('barbershops').insert({ name }).select('id').single();
    if (shop.error) throw shop.error;
    shops.push(shop.data.id);
    const membership = await admin.from('barbershop_users').insert({ barbershop_id: shop.data.id, user_id: user.data.user.id, role: 'OWNER' });
    if (membership.error) throw membership.error;
  }
  for (const kind of ['barbers', 'services']) {
    const result = await admin.from(kind).insert({ barbershop_id: shops[1], name: 'Privado de B', ...(kind === 'barbers' ? { commission_rate: 50 } : { base_price: 20000 }) }).select('id').single();
    if (result.error) throw result.error;
    foreign[kind] = result.data.id;
  }
});
test.afterAll(async () => {
  for (const kind of ['barbers', 'services']) if (shops.length) await admin.from(kind).delete().in('barbershop_id', shops);
  for (const user of users) await admin.auth.admin.deleteUser(user.id);
  if (shops.length) await admin.from('barbershops').delete().in('id', shops);
});
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(users[0].email);
  await page.getByLabel('Contraseña', { exact: true }).fill(users[0].password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estudio de prueba' })).toBeVisible();
});

for (const config of [
  { kind: 'barbers', route: 'barberos', singular: 'barbero', label: 'Comisión (%)', invalid: '101', amount: '40', edit: '45', name: 'Carlos', display: '40% comisión' },
  { kind: 'services', route: 'servicios', singular: 'servicio', label: 'Precio (COP)', invalid: '30.5', amount: '30000', edit: '35000', name: 'Corte', display: '$30.000' },
]) {
  test(`${config.kind}: mobile CRUD, validation and tampered tenant id`, async ({ page }, info) => {
    await page.getByRole('link', { name: 'Más', exact: true }).click();
    await page.getByRole('link', { name: config.route === 'barberos' ? /Barberos/ : /Servicios/ }).click();
    await expect(page.getByText(`No tienes ${config.route} todavía`)).toBeVisible();
    await expect(page.getByText('Privado de B')).toHaveCount(0);
    await page.getByRole('link', { name: `Agregar primer ${config.singular}` }).click();
    await page.getByLabel('Nombre', { exact: true }).fill(config.name);
    await page.getByLabel(config.label, { exact: true }).fill(config.invalid);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByLabel(config.label, { exact: true })).toBeFocused();
    await expect(page.getByLabel(config.label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue(config.name);
    await page.getByLabel(config.label, { exact: true }).fill(config.amount);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toContainText('Guardado correctamente');
    await expect(page.getByText(config.display, { exact: true })).toBeVisible();
    for (const width of [360, 430]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`${config.route}-mobile.png`), fullPage: true });
    await page.getByRole('link', { name: `Editar ${config.name}` }).click();
    const ownId = await page.locator('input[name=id]').inputValue();
    await page.locator('input[name=id]').evaluate((input, id) => { (input as HTMLInputElement).value = id; }, foreign[config.kind]);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('ya no está disponible');
    await page.reload();
    await page.getByLabel('Nombre', { exact: true }).fill(`${config.name} actualizado`);
    await page.getByLabel(config.label, { exact: true }).fill(config.edit);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toContainText('Cambios guardados');
    await page.getByRole('link', { name: `Editar ${config.name} actualizado` }).click();
    await expect(page.getByRole('heading', { name: `Editar ${config.singular}`, exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${config.route}-editar-mobile.png`), fullPage: true });
    await page.getByRole('button', { name: `Desactivar ${config.singular}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mantener activo' })).toBeFocused();
    await page.getByRole('button', { name: 'Mantener activo' }).click();
    await page.getByRole('button', { name: `Desactivar ${config.singular}`, exact: true }).click();
    await page.getByRole('button', { name: 'Sí, desactivar' }).click();
    await expect(page.getByText(`No tienes ${config.route} todavía`)).toBeVisible();
    const own = await admin.from(config.kind).select('*').eq('id', ownId).single();
    expect(own.data?.is_active).toBe(false);
    expect(own.data?.name).toBe(`${config.name} actualizado`);
    expect(own.data?.[config.kind === 'barbers' ? 'commission_rate' : 'base_price']).toBe(Number(config.edit));
    await page.goto(`/mas/${config.route}/${foreign[config.kind]}/editar`);
    await expect(page.getByText('Privado de B')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
    const other = await admin.from(config.kind).select('*').eq('id', foreign[config.kind]).single();
    expect(other.data?.name).toBe('Privado de B');
    expect(other.data?.is_active).toBe(true);
  });
}
