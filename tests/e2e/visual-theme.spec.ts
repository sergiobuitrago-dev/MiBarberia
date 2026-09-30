import { test,expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local tests only');
const admin=createClient(url,process.env.SUPABASE_TEST_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`visual-${randomUUID()}@example.test`,password=`Test-${randomUUID()}!`;
let userId:string,shopId:string,otherShop:string;
async function insert(table:string, values:Record<string,unknown>) { const {data,error}=await admin.from(table).insert(values).select('id').single(); if(error)throw error; return data.id as string; }
test.beforeAll(async()=>{
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)throw error;userId=data.user.id;
 shopId=await insert('barbershops',{name:'Barbería de prueba'});otherShop=await insert('barbershops',{name:'Privada B'});
 await insert('barbershop_users',{barbershop_id:shopId,user_id:userId,role:'OWNER'});
 await insert('barbers',{barbershop_id:shopId,name:'Carlos',commission_rate:33.33});
 await insert('services',{barbershop_id:shopId,name:'Corte',base_price:30000});
 await insert('services',{barbershop_id:shopId,name:'Barba',base_price:15000});
 await insert('services',{barbershop_id:shopId,name:'No disponible',base_price:999,is_active:false});
 await insert('customers',{barbershop_id:shopId,name:'Juan Pérez',phone:'3001234567'});
 await insert('customers',{barbershop_id:otherShop,name:'Juan Privado',phone:'3001234567'});
});
test.afterAll(async()=>{
 for(const table of ['visit_items','visits','customers','services','barbers','barbershop_users']) {
   const {error}=await admin.from(table).delete().in('barbershop_id',[shopId,otherShop].filter(Boolean));if(error)throw error;
 }
 if(userId)await admin.auth.admin.deleteUser(userId);
 await admin.from('barbershops').delete().in('id',[shopId,otherShop].filter(Boolean));
});
test('dark visual identity across all operational screens at mobile widths',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 async function capture(name:string){
  const headings:Record<string,string>={login:'Entrar a MiBarbería',inicio:'Barbería de prueba','nueva-visita':'Nueva visita','visita-seleccionada':'Nueva visita',detalle:'Detalle de visita',historial:'Visitas',barberos:'Barberos',servicios:'Servicios'};
  await expect(page.getByRole('heading',{name:headings[name],exact:true})).toBeVisible();
  await page.mouse.move(0,0);
  for(const width of [360,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>window.scrollTo(0,0));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(name==='visita-seleccionada') await page.getByRole('heading',{name:'Servicios',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));
   await page.screenshot({path:info.outputPath(`${name}-${width}.png`)});
  }
 }
 await page.goto('/login');await capture('login');
 await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Barbería de prueba'})).toBeVisible();await capture('inicio');
 await page.getByRole('link',{name:'+ Nueva visita',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nueva visita',exact:true})).toBeVisible();await capture('nueva-visita');
 await page.getByRole('button',{name:'Carlos',exact:true}).click();
 await page.getByRole('button',{name:'Corte, $30.000',exact:true}).click();
 await page.getByRole('button',{name:'Barba, $15.000',exact:true}).click();
 await capture('visita-seleccionada');
 await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Visita registrada'})).toBeVisible();
 await page.getByRole('link',{name:'Ver visita',exact:true}).click();await capture('detalle');
 await page.getByRole('link',{name:'← Visitas',exact:true}).click();await capture('historial');
 await page.getByRole('link',{name:'Más',exact:true}).click();
 await page.getByRole('link',{name:/Barberos/}).click();await capture('barberos');
 await page.getByRole('link',{name:'Más',exact:true}).click();
 await page.getByRole('link',{name:/Servicios/}).click();await capture('servicios');
 await page.getByRole('link',{name:'Inicio',exact:true}).click();await capture('inicio');
});
