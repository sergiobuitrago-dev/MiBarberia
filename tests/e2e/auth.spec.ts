import { test, expect } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('E2E tests require LOCAL Supabase.');
const secret = process.env.SUPABASE_TEST_SECRET_KEY;
const users: Record<string, { id: string; email: string; password: string }> = {};
const shopIds: string[] = [];
const label = randomUUID();
const admin = createClient(url, secret || 'missing-local-test-key', { auth: { autoRefreshToken: false, persistSession: false } });

test.beforeAll(async () => {
  if (!secret) throw new Error('Run npm run setup:local after npm run db:start to configure local test keys.');
  for (const role of ['a', 'b', 'barber', 'outsider']) {
    const email = `${role}-${label}@example.test`;
    const password = `Test-${randomUUID()}!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error('User not created');
    users[role] = { id: data.user.id, email, password };
  }
  for (const side of ['a', 'b']) {
    const { data, error } = await admin.from('barbershops').insert({ name: `Prueba ${side} ${label}` }).select('id').single();
    if (error) throw error;
    shopIds.push(data.id);
    const { error: membershipError } = await admin.from('barbershop_users').insert({ barbershop_id: data.id, user_id: users[side].id, role: 'OWNER' });
    if (membershipError) throw membershipError;
  }
  const { error } = await admin.from('barbershop_users').insert({ barbershop_id: shopIds[0], user_id: users.barber.id, role: 'BARBER' });
  if (error) throw error;
});

test.afterAll(async () => {
  for (const user of Object.values(users)) await admin.auth.admin.deleteUser(user.id);
  if (shopIds.length) await admin.from('barbershops').delete().in('id', shopIds);
});

test('anonymous access redirects to login and does not render shop data', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar a MiBarbería' })).toBeVisible();
  await expect(page.getByText(label, { exact: false })).toHaveCount(0);
});

test('invalid form focuses email and exposes accessible errors', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
});

test('wrong password keeps email, reports generic error and allows retry', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(users.a.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Correo o contraseña incorrectos');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(users.a.email);
  await expect(page).toHaveURL(/\/login$/);
});

test('OWNER A signs in on mobile, sees only A, persists session and signs out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(users.a.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(users.a.password);
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Prueba a ${label}` })).toBeVisible();
  await expect(page.getByText(`Prueba b ${label}`)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: `Prueba a ${label}` })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Más', exact: true }).click();
  await expect(page.getByText(users.a.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

for (const role of ['barber', 'outsider']) {
  test(`${role} can authenticate but cannot access OWNER page`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(users[role].email);
    await page.getByLabel('Contraseña', { exact: true }).fill(users[role].password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/acceso-denegado$/);
    await expect(page.getByRole('heading', { name: 'Acceso no habilitado' })).toBeVisible();
    await page.goto('/');
    await expect(page).toHaveURL(/\/acceso-denegado$/);
    await expect(page.getByText(label, { exact: false })).toHaveCount(0);
  });
}

test('public signup is disabled in the Auth service itself', async () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error, data } = await client.auth.signUp({ email: `signup-${label}@example.test`, password: `Test-${randomUUID()}!` });
  expect(error?.code).toBe('signup_disabled');
  expect(data.user).toBeNull();
});

test('SSR refreshes a session that is due for refresh and persists replacement cookies', async ({ page, context }) => {
  const cookieJar = new Map<string, string>();
  const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => { for (const cookie of cookies) cookieJar.set(cookie.name, cookie.value); },
    },
  });
  const { data, error } = await client.auth.signInWithPassword(users.a);
  expect(error).toBeNull();
  expect(data.session).not.toBeNull();
  // Force the SDK's refresh boundary while retaining genuine server-issued
  // access/refresh tokens. This does not forge a JWT or bypass authentication.
  const expiredStorage = 'base64-' + Buffer.from(JSON.stringify({ ...data.session, expires_at: 1 })).toString('base64url');
  const sessionCookie = [...cookieJar.keys()].find(name => /-auth-token(?:\.0)?$/.test(name));
  expect(sessionCookie).toBeDefined();
  const baseName = sessionCookie!.replace(/\.0$/, '');
  await context.addCookies([{ name: baseName, value: expiredStorage, url: 'http://127.0.0.1:3100' }]);
  const response = await page.goto('/');
  await expect(page.getByRole('heading', { name: `Prueba a ${label}` })).toBeVisible();
  expect(response?.headers()['cache-control']).toContain('no-store');
  const refreshed = (await context.cookies()).filter(cookie => cookie.name.startsWith(baseName));
  expect(refreshed.length).toBeGreaterThan(0);
  expect(refreshed.map(cookie => cookie.value).join('')).not.toBe(expiredStorage);
  await page.reload();
  await expect(page.getByRole('heading', { name: `Prueba a ${label}` })).toBeVisible();
});

test('revoking OWNER membership denies an already signed-in browser', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(users.b.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(users.b.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Prueba b ${label}` })).toBeVisible();
  const { error } = await admin.from('barbershop_users').delete().eq('user_id', users.b.id);
  expect(error).toBeNull();
  await page.reload();
  await expect(page).toHaveURL(/\/acceso-denegado$/);
  await expect(page.getByText(`Prueba b ${label}`)).toHaveCount(0);
});

test('login remains usable at 360px with keyboard and reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('login-mobile.png'), fullPage: true });
});
