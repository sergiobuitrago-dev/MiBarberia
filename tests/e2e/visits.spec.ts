import { test,expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin=createClient(url,process.env.SUPABASE_TEST_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`visits-${randomUUID()}@example.test`,password=`Test-${randomUUID()}!`;
let userId:string,shopId:string,otherShop:string,barberId:string,serviceId:string,customerId:string;
async function insert(table:string, values:Record<string,unknown>) { const {data,error}=await admin.from(table).insert(values).select('id').single(); if(error)throw error; return data.id as string; }
test.beforeAll(async()=>{
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)throw error;userId=data.user.id;
 shopId=await insert('barbershops',{name:'Barbería de prueba'});otherShop=await insert('barbershops',{name:'Privada B'});
 await insert('barbershop_users',{barbershop_id:shopId,user_id:userId,role:'OWNER'});
 barberId=await insert('barbers',{barbershop_id:shopId,name:'Carlos',commission_rate:33.33});
 serviceId=await insert('services',{barbershop_id:shopId,name:'Corte',base_price:30000});
 await insert('services',{barbershop_id:shopId,name:'Barba',base_price:15000});
 await insert('services',{barbershop_id:shopId,name:'No disponible',base_price:999,is_active:false});
 customerId=await insert('customers',{barbershop_id:shopId,name:'Juan Pérez',phone:'3001234567'});
 await insert('customers',{barbershop_id:otherShop,name:'Juan Privado',phone:'3001234567'});
});
test.afterAll(async()=>{
 for(const table of ['visit_items','visits','customers','services','barbers','barbershop_users']) {
   const {error}=await admin.from(table).delete().in('barbershop_id',[shopId,otherShop].filter(Boolean));if(error)throw error;
 }
 if(userId)await admin.auth.admin.deleteUser(userId);
 await admin.from('barbershops').delete().in('id',[shopId,otherShop].filter(Boolean));
});
for(const [width,mode] of [[360,'occasional'],[390,'existing'],[430,'new']] as const){
 test(`${width}px: ${mode} visit, accurate persisted result and no duplicate submit`,async({page},info)=>{
  await page.setViewportSize({width,height:844});
  await page.goto('/login');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('link',{name:'+ Nueva visita',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nueva visita',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`visita-inicial-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
  await expect(page.getByText('Selecciona un barbero.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Carlos',exact:true})).toBeFocused();
  if(mode==='existing'){
   await page.getByRole('button',{name:'Buscar cliente',exact:true}).click();
   await page.getByLabel('Buscar por nombre o teléfono').fill('300123');
   await expect(page.getByRole('button',{name:/Juan Pérez/})).toBeVisible();
   await expect(page.getByText('Juan Privado')).toHaveCount(0);
   await page.getByLabel('Buscar por nombre o teléfono').fill('Juan');
   await page.getByRole('button',{name:/Juan Pérez/}).click();
  }
  if(mode==='new'){
   await page.getByRole('button',{name:'+ Cliente nuevo',exact:true}).click();
   await page.getByLabel('Nombre del cliente').fill('Ana Nueva');
   await page.getByLabel('Teléfono (opcional)').fill('3010000000');
  }
  await page.getByRole('button',{name:'Carlos',exact:true}).click();
  await expect(page.getByRole('button',{name:/No disponible/})).toHaveCount(0);
  await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();
  await page.getByRole('button',{name:'Barba, $15.000',exact:true}).click();
  await expect(page.getByTestId('total')).toHaveText('$45.000');
  await expect(page.getByText('Selecciona un barbero.',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  if(mode==='new'){
   await page.getByLabel('Precio cobrado de Corte').fill('25000');
   await page.getByLabel('Descuento (COP)').fill('5000');
   await expect(page.getByTestId('total')).toHaveText('$35.000');
  }
  if(mode==='new'){
   const deactivated=await admin.from('barbers').update({is_active:false}).eq('id',barberId);expect(deactivated.error).toBeNull();
   await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
   await expect(page.getByRole('main').getByRole('alert')).toContainText('El barbero ya no está disponible');
   await expect(page.getByLabel('Nombre del cliente')).toHaveValue('Ana Nueva');
   await expect(page.getByLabel('Precio cobrado de Corte')).toHaveValue('25000');
   await expect(page.getByTestId('total')).toHaveText('$35.000');
   await expect(page.getByRole('button',{name:'Registrar visita',exact:true})).toBeEnabled();
   const reactivated=await admin.from('barbers').update({is_active:true}).eq('id',barberId);expect(reactivated.error).toBeNull();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`visita-servicios-${width}.png`),fullPage:true});
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let submissions=0;
  await page.route('**/visitas/nueva',async route=>{if(route.request().method()==='POST'){submissions++;await gate;}await route.continue();});
  await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
  await expect(page.getByRole('button',{name:'Registrando…',exact:true})).toBeDisabled();
  await page.locator('form').evaluate((form)=>{(form as HTMLFormElement).requestSubmit();});
  release();
  await expect(page.getByRole('heading',{name:'Visita registrada',exact:true})).toBeVisible();
  expect(submissions).toBe(1);
  const id=page.url().split('/').at(-2)!;
  const {data:visit,error}=await admin.from('visits').select('*,visit_items(*)').eq('id',id).single();expect(error).toBeNull();
  expect(visit.barbershop_id).toBe(shopId);expect(visit.barber_id).toBe(barberId);expect(visit.visit_items.length).toBe(2);
  expect(visit.total_amount).toBe(mode==='new'?35000:45000);expect(visit.commission_amount).toBe(mode==='new'?11666:14999);
  expect(visit.customer_id).toBe(mode==='occasional'?null:mode==='existing'?customerId:visit.customer_id);
  if(mode==='new') {expect(visit.customer_id).not.toBeNull();const c=await admin.from('customers').select('name').eq('id',visit.customer_id).single();expect(c.data?.name).toBe('Ana Nueva');}
  expect((await admin.from('services').select('base_price').eq('id',serviceId).single()).data?.base_price).toBe(30000);
  await page.screenshot({path:info.outputPath(`visita-exito-${width}.png`),fullPage:true});
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('link',{name:'Visitas',exact:true}).click();
  const history = page.getByRole('list',{name:'Historial de visitas'});
  await expect(history.getByRole('link').first()).toHaveAttribute('href',`/visitas/${id}`);
  await page.screenshot({path:info.outputPath(`historial-${width}.png`),fullPage:false});
  await history.getByRole('link').first().click();
  await expect(page.getByRole('heading',{name:'Detalle de visita'})).toBeVisible();
  await expect(page.getByText('ACTIVA',{exact:true})).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Comisión');
  await expect(page.getByRole('main')).not.toContainText(id);
  await expect(page.getByText('Subtotal',{exact:true})).toBeVisible();
  await expect(page.getByText('Descuento',{exact:true})).toBeVisible();
  await expect(page.getByText('Carlos · Efectivo',{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`detalle-${width}.png`),fullPage:false});
  await page.getByRole('button',{name:'Anular visita',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Cancelar',exact:true}).press('Enter');
  await expect(page.getByRole('button',{name:'Anular visita',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Anular visita',exact:true}).press('Enter');
  await expect(page.getByRole('heading',{name:'¿Anular esta visita?'})).toBeVisible();
  const cancelBounds=await page.getByRole('button',{name:'Cancelar',exact:true}).boundingBox();
  const navigationBounds=await page.getByRole('navigation',{name:'Navegación principal'}).boundingBox();
  expect(cancelBounds!.y+cancelBounds!.height).toBeLessThanOrEqual(navigationBounds!.y);
  await page.screenshot({path:info.outputPath(`confirmacion-${width}.png`),fullPage:false});
  let finishVoid!:()=>void; const voidGate=new Promise<void>(resolve=>{finishVoid=resolve;});
  await page.route(`**/visitas/${id}`,async route=>{if(route.request().method()==='POST')await voidGate;await route.continue();});
  await page.getByRole('button',{name:'Anular visita',exact:true}).click();
  await expect(page.getByRole('button',{name:'Anulando…',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();
  finishVoid();
  await expect(page.getByText('ANULADA',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Anular visita',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`anulada-${width}.png`),fullPage:false});
  const persisted=await admin.from('visits').select('status,voided_at,total_amount,visit_items(*)').eq('id',id).single();
  expect(persisted.error).toBeNull();expect(persisted.data?.status).toBe('VOIDED');
  expect(persisted.data?.voided_at).toBeTruthy();expect(persisted.data?.total_amount).toBe(visit.total_amount);
  expect(persisted.data?.visit_items).toHaveLength(2);
  await page.getByRole('link',{name:'← Visitas',exact:true}).click();
  await expect(page.getByRole('list',{name:'Historial de visitas'}).getByRole('link').first()).toContainText('ANULADA');
  await page.getByRole('main').getByRole('link',{name:'+ Nueva visita',exact:true}).click();
  await expect(page.getByTestId('total')).toHaveText('$0');
  await expect(page.getByRole('button',{name:'Carlos',exact:true})).toHaveAttribute('aria-pressed','false');
 });
}
