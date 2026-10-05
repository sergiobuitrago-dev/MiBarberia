import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin = createClient(url, process.env.SUPABASE_TEST_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const email=`commissions-${randomUUID()}@example.test`, password=`Test-${randomUUID()}!`;
let userId:string, shopId:string, otherShop:string, barberId:string, foreignBarber:string, serviceId:string;
async function insert(table:string, values:Record<string,unknown>) {
  const {data,error}=await admin.from(table).insert(values).select('id').single();
  if(error) throw error;return data.id as string;
}
async function login(page:Page) {
  await page.goto('/login');await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Operación piloto'})).toBeVisible();
}
async function visit(at:string,total:number,status='ACTIVE') {
  const id=await insert('visits',{barbershop_id:shopId,barber_id:barberId,payment_method:'CASH',subtotal_amount:total,
    total_amount:total,commission_rate:50,commission_amount:total/2,visited_at:at,status,
    ...(status==='VOIDED'?{voided_at:at}:{})});
  await insert('visit_items',{barbershop_id:shopId,visit_id:id,service_id:serviceId,service_name:'Corte + Barba',catalog_price:45000,charged_price:total});
  return id;
}
test.beforeAll(async()=>{
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(error||!data.user) throw error;userId=data.user.id;
  shopId=await insert('barbershops',{name:'Operación piloto'});
  otherShop=await insert('barbershops',{name:'Otro tenant'});
  await insert('barbershop_users',{barbershop_id:shopId,user_id:userId,role:'OWNER'});
  barberId=await insert('barbers',{barbershop_id:shopId,name:'Carlos',commission_rate:80,is_active:false});
  foreignBarber=await insert('barbers',{barbershop_id:otherShop,name:'Privado',commission_rate:50});
  serviceId=await insert('services',{barbershop_id:shopId,name:'Nombre actual distinto',base_price:45000});
  await visit('2025-01-01T21:35:00Z',45000);
  await visit('2025-01-05T04:59:59Z',30000);
  await visit('2025-01-04T18:00:00Z',90000,'VOIDED');
  await visit(new Date().toISOString(),120000);
});
test.afterAll(async()=>{
  for(const table of ['visit_items','visits','customers','services','barbers','barbershop_users']) {
    const {error}=await admin.from(table).delete().in('barbershop_id',[shopId,otherShop].filter(Boolean));if(error) throw error;
  }
  if(userId) await admin.auth.admin.deleteUser(userId);
  await admin.from('barbershops').delete().in('id',[shopId,otherShop].filter(Boolean));
});

test('weekly navigation, inactive historical detail, snapshot, empty and tenant rejection',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  const nav=page.getByRole('navigation',{name:'Navegación principal'});
  await nav.getByRole('link',{name:'Comisiones',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Comisiones',exact:true})).toBeVisible();
  await expect(page.getByText('$60.000',{exact:true})).toBeVisible();
  await page.goto('/comisiones?semana=2025-01-01');
  await expect(page.getByText('30 dic 2024 – 5 ene 2025',{exact:true})).toBeVisible();
  const card=page.getByRole('article',{name:'Carlos'});
  await expect(card).toContainText('2 visitas');await expect(card).toContainText('$75.000');await expect(card).toContainText('$37.500');
  for(const width of [360,390,430]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`commissions-${width}.png`),fullPage:true});
  }
  await card.getByRole('link',{name:'Ver detalle de Carlos'}).click();
  await expect(page.getByRole('heading',{name:'Carlos',exact:true})).toBeVisible();
  await expect(page.getByTestId('commission-total')).toHaveText('$37.500');
  const visits=page.getByRole('region',{name:'Visitas de la semana'});
  await expect(visits.getByRole('listitem')).toHaveCount(2);
  await expect(visits).toContainText('Corte + Barba');await expect(visits).toContainText('$22.500');
  await expect(visits).not.toContainText('Nombre actual distinto');
  for(const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`commission-detail-${width}.png`),fullPage:true});
  }
  await page.getByRole('link',{name:'Volver a Comisiones'}).click();
  await expect(page).toHaveURL(/\/comisiones\?semana=2024-12-30$/);
  await expect(page.getByRole('heading',{name:'Comisiones',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Semana anterior'}).click();
  await expect(page.getByText('No hay comisiones registradas esta semana.')).toBeVisible();
  await page.getByRole('link',{name:'Semana siguiente'}).click();
  await expect(page.getByRole('article',{name:'Carlos'})).toBeVisible();
  await page.getByRole('link',{name:'Semana actual',exact:true}).click();
  await expect(page.getByText('Esta semana',{exact:true})).toBeVisible();
  await page.goto(`/comisiones/${foreignBarber}?semana=2025-01-01`);
  await expect(page.getByRole('heading',{name:'Barbero no disponible'})).toBeVisible();
  await page.goto('/comisiones?semana=2026-02-30');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('fecha');
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('operational Home stays independent of period, mobile cards, nav and account location',async({page},info)=>{
  await page.setViewportSize({width:360,height:844});await login(page);
  await expect(page.getByTestId('metric-sales')).toHaveText('$120.000');
  const chart=page.getByRole('region',{name:'Ventas — últimos 7 días'});
  await expect(chart).toBeVisible();await expect(chart.getByRole('img')).toBeVisible();
  await expect(chart).toContainText('$120.000');
  await expect(page.getByRole('button',{name:'Cerrar sesión'})).toHaveCount(0);
  for(const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`home-${width}.png`),fullPage:true});
  }
  await page.goto('/?periodo=custom&desde=2000-01-01&hasta=2000-01-01');
  await expect(page.getByTestId('metric-sales')).toHaveText('$0');await expect(chart).toContainText('$120.000');
  await page.goto('/?periodo=custom');await expect(chart).toBeVisible();
  const nav=page.getByRole('navigation',{name:'Navegación principal'});
  await expect(nav.getByRole('link')).toHaveCount(4);
  await nav.getByRole('link',{name:'Más',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cerrar sesión'})).toBeVisible();
  await page.getByRole('link',{name:/Clientes.*Nombres/}).click();
  await expect(page.getByRole('heading',{name:'Clientes',exact:true})).toBeVisible();
  await expect(nav.getByRole('link',{name:'Más',exact:true})).toHaveAttribute('aria-current','page');
});


test('zero chart, very large amounts and long names fit mobile; daily values work with keyboard',async({page},info)=>{
  await page.setViewportSize({width:360,height:844});await login(page);
  const name='Carlos con un nombre largo '.repeat(4).trim();
  const changed=await admin.from('barbers').update({name}).eq('id',barberId);expect(changed.error).toBeNull();
  const recent=await admin.from('visits').select('id').eq('barbershop_id',shopId).gt('visited_at','2026-01-01');
  expect(recent.error).toBeNull();
  const recentIds=recent.data!.map(v=>v.id);
  try {
    expect((await admin.from('visits').update({status:'VOIDED',voided_at:new Date().toISOString()}).in('id',recentIds)).error).toBeNull();
    await page.reload();
    const chart=page.getByRole('region',{name:'Ventas — últimos 7 días'});
    await expect(chart.getByText('Sin ventas activas en los últimos 7 días.')).toBeVisible();
    const daily=chart.locator('summary');await daily.focus();await page.keyboard.press('Enter');
    await expect(chart.locator('details')).toHaveAttribute('open','');
    await expect(chart.locator('dd')).toHaveCount(7);await expect(chart.locator('dd').first()).toHaveText('$0');
    await page.screenshot({path:info.outputPath('home-seven-zeros-360.png'),fullPage:true});
    await page.goto('/comisiones');await expect(page.getByText('No hay comisiones registradas esta semana.')).toBeVisible();
    await page.screenshot({path:info.outputPath('commissions-empty-360.png'),fullPage:true});
    expect((await admin.from('visits').update({status:'ACTIVE',voided_at:null,subtotal_amount:9000000000000000,total_amount:9000000000000000,commission_rate:50,commission_amount:4500000000000000}).in('id',recentIds)).error).toBeNull();
    for(const path of ['/', '/comisiones', `/comisiones/${barberId}`]) {
      await page.goto(path);await expect(page.getByRole('main')).toContainText('$9.000.000.000.000.000');
      for(const width of [360,390,430]) {
        await page.setViewportSize({width,height:844});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        for(const value of await page.locator('dd').all()) {
          expect(await value.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
        }
        await page.screenshot({path:info.outputPath(`large-${path==='/'?'home':path==='/comisiones'?'commissions':'detail'}-${width}.png`),fullPage:true});
      }
    }
  } finally {
    expect((await admin.from('barbers').update({name:'Carlos'}).eq('id',barberId)).error).toBeNull();
    expect((await admin.from('visits').update({status:'ACTIVE',voided_at:null,subtotal_amount:120000,total_amount:120000,commission_rate:50,commission_amount:60000}).in('id',recentIds)).error).toBeNull();
  }
});


test('weekly detail pagination preserves full totals and resets on week navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  for(let i=0;i<26;i++) await visit('2010-02-03T18:00:00Z',1000);
  await page.goto(`/comisiones/${barberId}?semana=2010-02-03`);
  const visits=page.getByRole('region',{name:'Visitas de la semana'});
  await expect(page.getByTestId('commission-total')).toHaveText('$13.000');
  await expect(visits.getByRole('listitem')).toHaveCount(25);
  await page.getByRole('link',{name:'Página siguiente',exact:true}).click();
  await expect(visits.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByTestId('commission-total')).toHaveText('$13.000');
  await expect(page).toHaveURL(/semana=2010-02-01&pagina=2/);
  await page.getByRole('link',{name:'Semana siguiente',exact:true}).click();
  await expect(page.getByTestId('commission-total')).toHaveText('$0');
  await expect(page).toHaveURL(/semana=2010-02-08$/);
  await page.goto(`/comisiones/${barberId}?semana=2010-02-01&pagina=3`);
  await expect(page.getByText('No hay visitas en esta página.')).toBeVisible();
  await page.getByRole('link',{name:'Primera página',exact:true}).click();
  await expect(visits.getByRole('listitem')).toHaveCount(25);
});
