import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin = createClient(url, process.env.SUPABASE_TEST_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const owner = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `dashboard-${randomUUID()}@example.test`, password = `Test-${randomUUID()}!`;
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
  shopId = await insert('barbershops', { name: 'Barbería Central' });
  otherShop = await insert('barbershops', { name: 'Barbería privada' });
  await insert('barbershop_users', { barbershop_id: shopId, user_id: userId, role: 'OWNER' });
  barberId = await insert('barbers', { barbershop_id: shopId, name: 'Carlos', commission_rate: 40 });
  otherBarber = await insert('barbers', { barbershop_id: otherShop, name: 'Barbero privado', commission_rate: 40 });
  await insert('visits', {barbershop_id:otherShop,barber_id:otherBarber,payment_method:'CASH',subtotal_amount:90000,total_amount:90000,discount_amount:0,commission_rate:40,commission_amount:36000});
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

test('dashboard periods and create → void refresh on mobile', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$0');
  await expect(page.getByText('Aún no tienes visitas registradas hoy.')).toBeVisible();
  await page.screenshot({path:info.outputPath('dashboard-vacio-390.png')});
  const service = await insert('services', {barbershop_id:shopId,name:'Corte',base_price:30000});
  const second = await insert('services', {barbershop_id:shopId,name:'Barba',base_price:15000});
  await page.getByRole('link',{name:'+ Nueva visita',exact:true}).click();
  await page.getByRole('button',{name:'Carlos',exact:true}).click();
  await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();
  await page.getByRole('button',{name:'Barba, $15.000',exact:true}).click();
  await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Visita registrada'})).toBeVisible();
  const id=page.url().split('/').at(-2)!;
  const persisted=await admin.from('visits').select('barber_id').eq('id',id).single();
  expect(persisted.data?.barber_id).toBe(barberId);
  await page.getByRole('link',{name:'Inicio',exact:true}).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$45.000');
  await expect(page.getByTestId('metric-visits')).toHaveText('1');
  await expect(page.getByTestId('metric-commissions')).toHaveText('$18.000');
  await expect(page.getByTestId('metric-shop')).toHaveText('$27.000');
  await expect(page.getByRole('region',{name:'Métodos de pago'})).toContainText('$45.000');
  await expect(page.getByRole('region',{name:'Producción por barbero'})).toContainText('Carlos');
  await expect(page.getByRole('region',{name:'Top servicios'})).toContainText('Corte');
  await page.screenshot({path:info.outputPath('dashboard-actividad-390.png')});
  for(const [label,name] of [['Producción por barbero','barberos'],['Top servicios','servicios']]) {
    await page.getByRole('region',{name:label}).evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:info.outputPath(`dashboard-${name}-390.png`)});
  }
  expect((await admin.from('barbers').update({name:'A'.repeat(120)}).eq('id',barberId)).error).toBeNull();
  expect((await admin.from('services').update({name:'B'.repeat(120)}).eq('id',service)).error).toBeNull();
  await page.reload();
  for(const width of [360,390,430]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect((await admin.from('barbers').update({name:'Carlos'}).eq('id',barberId)).error).toBeNull();
  expect((await admin.from('services').update({name:'Corte'}).eq('id',service)).error).toBeNull();
  await page.reload();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('link',{name:'Esta semana',exact:true}).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$45.000');
  await page.getByRole('link',{name:'Este mes',exact:true}).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$45.000');
  await page.getByRole('link',{name:'Personalizado',exact:true}).click();
  await expect(page.getByLabel('Fecha inicial')).toBeVisible();
  await page.screenshot({path:info.outputPath('dashboard-periodo-390.png')});
  await page.getByLabel('Fecha inicial').fill('2000-01-02');
  await page.getByLabel('Fecha final').fill('2000-01-01');
  await page.getByRole('button',{name:'Aplicar periodo'}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('La fecha final');
  await expect(page.getByLabel('Fecha inicial')).toBeFocused();
  await page.getByLabel('Fecha inicial').fill('2000-01-01');
  await page.getByRole('button',{name:'Aplicar periodo'}).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$0');
  await page.getByRole('link',{name:'Hoy',exact:true}).click();
  await expect(page.getByTestId('metric-sales')).toHaveText('$45.000');
  await page.goto(`/visitas/${id}`);
  await page.getByRole('button',{name:'Anular visita',exact:true}).click();
  await page.getByRole('button',{name:'Anular visita',exact:true}).click();
  await expect(page.getByText('ANULADA',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Inicio',exact:true}).click();
  for(const metric of ['sales','commissions','shop']) await expect(page.getByTestId(`metric-${metric}`)).toHaveText('$0');
  await expect(page.getByTestId('metric-visits')).toHaveText('0');
  for(const name of ['Métodos de pago','Producción por barbero','Top servicios']) await expect(page.getByRole('region',{name})).toHaveCount(0);
  expect(service).toBeTruthy();expect(second).toBeTruthy();
});
