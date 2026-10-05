import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
test.use({ actionTimeout: 10000 });
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin=createClient(url,process.env.SUPABASE_TEST_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`customers-${randomUUID()}@example.test`,password=`Test-${randomUUID()}!`;
let userId:string,shopId:string,otherShop:string,foreignCustomer:string;
async function insert(table:string,values:Record<string,unknown>) {const {data,error}=await admin.from(table).insert(values).select('id').single();if(error)throw error;return data.id as string;}
test.beforeEach(async()=>{
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)throw error;userId=data.user.id;
 shopId=await insert('barbershops',{name:'Barbería de prueba'});otherShop=await insert('barbershops',{name:'Privada B'});
 await insert('barbershop_users',{barbershop_id:shopId,user_id:userId,role:'OWNER'});
 await insert('barbers',{barbershop_id:shopId,name:'Carlos',commission_rate:40});
 await insert('services',{barbershop_id:shopId,name:'Corte',base_price:30000});
 await insert('services',{barbershop_id:shopId,name:'Barba',base_price:15000});
 foreignCustomer=await insert('customers',{barbershop_id:otherShop,name:'Juan Privado',phone:'3001234567'});
});
test.afterEach(async()=>{
 for(const table of ['visit_items','visits','customers','services','barbers','barbershop_users']){const {error}=await admin.from(table).delete().in('barbershop_id',[shopId,otherShop].filter(Boolean));if(error)throw error;}
 if(userId)await admin.auth.admin.deleteUser(userId);
 await admin.from('barbershops').delete().in('id',[shopId,otherShop].filter(Boolean));
});
async function login(page:Page){await page.goto('/login');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Barbería de prueba'})).toBeVisible();}
async function openCustomers(page:Page){
 await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('link',{name:'Más',exact:true}).click();
 await page.getByRole('link',{name:/Clientes.*Nombres/}).click();
 await expect(page.getByRole('heading',{name:'Clientes',exact:true})).toBeVisible();
}
async function capture(page:Page,name:string){
 mkdirSync('docs/screenshots/phase-5',{recursive:true});
 for(const width of [360,390,430]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`docs/screenshots/phase-5/${name}-${width}.png`,fullPage:true});
 }
}
test('customer lifecycle: new/occasional, search, profile, edit, repeat visit, void, mobile states and tenant protection',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});await login(page);
 await openCustomers(page);
 await expect(page.getByText('Aún no tienes clientes registrados.',{exact:true})).toBeVisible();await capture(page,'empty');
 await page.getByRole('link',{name:'Nueva visita',exact:true}).click();
 await page.getByRole('button',{name:'Carlos',exact:true}).click();await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();
 await page.getByRole('button',{name:'Registrar visita',exact:true}).click();await expect(page.getByRole('heading',{name:'Visita registrada'})).toBeVisible();
 await openCustomers(page);await expect(page.getByText('Aún no tienes clientes registrados.',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Nueva visita',exact:true}).click();
 await page.getByRole('button',{name:'+ Cliente nuevo',exact:true}).click();await page.getByLabel('Nombre del cliente').fill('Juan Pérez');await page.getByLabel('Teléfono (opcional)').fill('300 123-4567');
 await page.getByRole('button',{name:'Carlos',exact:true}).click();await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();await page.getByRole('button',{name:'Barba, $15.000',exact:true}).click();
 await page.getByRole('button',{name:'Registrar visita',exact:true}).click();await expect(page.getByRole('heading',{name:'Visita registrada'})).toBeVisible();
 const firstVisit=page.url().split('/').at(-2)!;
 await openCustomers(page);
 const list=page.getByRole('list',{name:'Clientes registrados'});await expect(list).toContainText('1 visita · $45.000');await capture(page,'listado');
 await page.getByLabel('Buscar nombre o teléfono').fill('JUAN');await page.getByLabel('Buscar nombre o teléfono').press('Enter');
 await expect(list).toContainText('Juan Pérez');await expect(list).not.toContainText('Juan Privado');await capture(page,'busqueda');
 await page.getByLabel('Buscar nombre o teléfono').fill('(300)1234567');await page.getByLabel('Buscar nombre o teléfono').press('Enter');await expect(list).toContainText('Juan Pérez');
 await page.getByLabel('Buscar nombre o teléfono').fill('Inexistente');await page.getByLabel('Buscar nombre o teléfono').press('Enter');await expect(page.getByText('No encontramos clientes con esa búsqueda.')).toBeVisible();await capture(page,'sin-resultados');
 await page.getByRole('button',{name:'Limpiar búsqueda'}).click();await expect(page.getByLabel('Buscar nombre o teléfono')).toBeFocused();
 await list.getByRole('link',{name:/Juan Pérez/}).click();await expect(page.getByRole('heading',{name:'Juan Pérez',exact:true,level:1})).toBeVisible();const profileUrl=page.url();
 await expect(page.getByRole('heading',{name:'Juan Pérez',exact:true,level:1})).toBeVisible();await expect(page.getByLabel('Resumen del cliente')).toContainText('1 visita');await expect(page.getByLabel('Resumen del cliente')).toContainText('$45.000');await capture(page,'perfil');
 const history=page.getByRole('list',{name:'Historial del cliente'});await expect(history.getByRole('link')).toHaveCount(1);await expect(history).toContainText('Corte');await expect(history).toContainText('Barba');await expect(history).toContainText('Carlos');await capture(page,'historial');
 await history.getByRole('link').click();await expect(page).toHaveURL(new RegExp(`/visitas/${firstVisit}$`));await page.goBack();await expect(page.getByRole('heading',{name:'Juan Pérez',exact:true,level:1})).toBeVisible();
 await page.getByRole('link',{name:'Editar datos'}).click();await page.getByLabel('Nombre',{exact:true}).fill('   ');await page.getByRole('button',{name:'Guardar cambios'}).click();await expect(page.getByLabel('Nombre',{exact:true})).toBeFocused();await expect(page.getByText('Escribe un nombre de hasta 120 caracteres.')).toBeVisible();
 await page.getByLabel('Nombre',{exact:true}).fill('Juan Pérez Editado');await page.getByLabel('Teléfono (opcional)').fill('');await page.getByRole('button',{name:'Guardar cambios'}).click();await expect(page.getByRole('heading',{name:'Juan Pérez Editado'})).toBeVisible();await expect(page.getByText('Sin teléfono',{exact:true})).toBeVisible();
 await page.goto('/visitas/nueva');await page.getByRole('button',{name:'Buscar cliente',exact:true}).click();await page.getByLabel('Buscar por nombre o teléfono').fill('Juan Pérez Editado');await page.getByRole('button',{name:/Juan Pérez Editado/}).click();await page.getByRole('button',{name:'Carlos',exact:true}).click();await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();await page.getByRole('button',{name:'Registrar visita',exact:true}).click();await expect(page.getByRole('heading',{name:'Visita registrada'})).toBeVisible();
 const secondVisit=page.url().split('/').at(-2)!;
 await openCustomers(page);await list.getByRole('link',{name:/Juan Pérez Editado/}).click();await expect(page.getByLabel('Resumen del cliente')).toContainText('2 visitas');await expect(page.getByLabel('Resumen del cliente')).toContainText('$75.000');
 await history.getByRole('link').first().click();await expect(page).toHaveURL(new RegExp(`/visitas/${secondVisit}$`));await page.getByRole('button',{name:'Anular visita',exact:true}).click();await page.getByRole('button',{name:'Anular visita',exact:true}).click();await expect(page.getByText('ANULADA',{exact:true})).toBeVisible();
 await page.goBack();await expect(page.getByLabel('Resumen del cliente')).toContainText('1 visita');await expect(page.getByLabel('Resumen del cliente')).toContainText('$45.000');await expect(history.getByRole('link')).toHaveCount(1);
 await history.getByRole('link').click();await page.getByRole('button',{name:'Anular visita',exact:true}).click();await page.getByRole('button',{name:'Anular visita',exact:true}).click();await expect(page.getByText('ANULADA',{exact:true})).toBeVisible();await page.goto(profileUrl);await expect(page.getByLabel('Resumen del cliente')).toContainText('0 visitas');await expect(page.getByLabel('Resumen del cliente')).toContainText('$0');await expect(page.getByText('Aún no tiene visitas activas.')).toBeVisible();await capture(page,'sin-visitas-activas');
 for(const path of [`/clientes/${foreignCustomer}`,`/clientes/${foreignCustomer}/editar`,`/clientes/${randomUUID()}`]){await page.goto(path);await expect(page.getByRole('heading',{name:'Cliente no disponible'})).toBeVisible();await expect(page.getByText('Juan Privado')).toHaveCount(0);}
});
test('list and ACTIVE history paginate without changing all-time metrics',async({page})=>{
 await login(page);
 const barbers=await admin.from('barbers').select('id').eq('barbershop_id',shopId);const services=await admin.from('services').select('id').eq('barbershop_id',shopId);
 const customer=await insert('customers',{barbershop_id:shopId,name:'Cliente con historial'});
 const visits=Array.from({length:27},(_,i)=>({barbershop_id:shopId,customer_id:customer,barber_id:barbers.data![0].id,payment_method:'CASH',subtotal_amount:1000,total_amount:1000,discount_amount:0,commission_rate:40,commission_amount:400,visited_at:new Date(Date.UTC(2026,8,i+1,12)).toISOString(),...(i===26?{status:'VOIDED',voided_at:new Date().toISOString()}:{status:'ACTIVE',voided_at:null})}));
 const inserted=await admin.from('visits').insert(visits).select('id');expect(inserted.error).toBeNull();
 const items=await admin.from('visit_items').insert(inserted.data!.map(v=>({barbershop_id:shopId,visit_id:v.id,service_id:services.data![0].id,service_name:'Corte histórico',catalog_price:1000,charged_price:1000})));expect(items.error).toBeNull();
 const customers=await admin.from('customers').insert(Array.from({length:26},(_,i)=>({barbershop_id:shopId,name:`Paginado ${String(i).padStart(2,'0')}`})));expect(customers.error).toBeNull();
 await page.goto('/clientes');const list=page.getByRole('list',{name:'Clientes registrados'});await expect(list.getByRole('link')).toHaveCount(25);await expect(list.getByRole('link').first()).toContainText('Cliente con historial');
 await page.getByRole('link',{name:'Siguiente',exact:true}).click();await expect(page.getByText('Página 2',{exact:true})).toBeVisible();await expect(list.getByRole('link')).toHaveCount(2);
 await page.getByLabel('Buscar nombre o teléfono').fill('Paginado');await page.getByLabel('Buscar nombre o teléfono').press('Enter');await expect(page.getByText('Página 1',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Siguiente',exact:true}).click();await expect(list.getByRole('link')).toHaveCount(1);await expect(page.getByLabel('Buscar nombre o teléfono')).toHaveValue('Paginado');
 await page.goto(`/clientes/${customer}`);const history=page.getByRole('list',{name:'Historial del cliente'});await expect(history.getByRole('link')).toHaveCount(25);await expect(page.getByLabel('Resumen del cliente')).toContainText('26 visitas');await expect(page.getByLabel('Resumen del cliente')).toContainText('$26.000');await expect(page.getByLabel('Resumen del cliente').locator('time')).toHaveAttribute('datetime','2026-09-26T12:00:00+00:00');
 await page.getByRole('link',{name:'Siguiente',exact:true}).click();await expect(history.getByRole('link')).toHaveCount(1);await expect(page.getByLabel('Resumen del cliente')).toContainText('26 visitas');await expect(history).toContainText('Corte histórico');
});
test('edit failure preserves input and never reports success for an inaccessible customer',async({page})=>{
 await login(page);const id=await insert('customers',{barbershop_id:shopId,name:'Cliente editable',phone:'3000000000'});
 await page.goto(`/clientes/${id}/editar`);await page.getByLabel('Nombre',{exact:true}).fill('Nombre conservado');await page.getByLabel('Teléfono (opcional)').fill('3010000000');
 // Simulate losing access between reading the form and submitting it.
 const moved=await admin.from('customers').update({barbershop_id:otherShop}).eq('id',id);expect(moved.error).toBeNull();
 await page.getByRole('button',{name:'Guardar cambios'}).click();await expect(page.getByRole('alert').filter({hasText:'Este cliente no está disponible.'})).toBeVisible();
 await expect(page.getByLabel('Nombre',{exact:true})).toHaveValue('Nombre conservado');await expect(page.getByLabel('Teléfono (opcional)')).toHaveValue('3010000000');await expect(page.getByRole('button',{name:'Guardar cambios'})).toBeEnabled();
 expect((await admin.from('customers').select('name,phone').eq('id',id).single()).data).toEqual({name:'Cliente editable',phone:'3000000000'});
});
