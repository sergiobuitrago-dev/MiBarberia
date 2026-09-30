# Piloto privado: guía de despliegue

**Estado:** preparación; no se ha creado infraestructura ni verificado un piloto remoto.
Para 1–3 barberías OWNER. Orden: Supabase → migrations → Auth → Vercel → provisioning
→ smoke test. No migrar datos de desarrollo. No requiere dominio propio ni staging.

## 1. Crear Supabase Cloud

Elegir explícitamente organización, nombre, región y costo antes de crear un proyecto
vacío dedicado al piloto. Guardar credenciales administrativas en un gestor de secretos.
No pegarlas en el chat/repositorio/logs. Anotar project ref (identificador, no secreto).
Verificar versión PostgreSQL compatible (local usa 17). No importar un dump local.
Mantener Data API para `public`; no exponer `private`. No activar servicios extra.

LOCAL: localhost → Supabase local → pruebas. PILOTO: Vercel → Supabase Cloud → datos reales.
Conservar `.env.local`, `.env.test.local` y `supabase/config.toml` para el entorno local.

## 2. Aplicar las migraciones versionadas

Desde la raíz, usar la CLI instalada por el lockfile. Autenticarse interactivamente;
no pasar passwords en argumentos ni usar `--debug` con credenciales.

```sh
npm ci
npx supabase login
npx supabase link --project-ref <REF_DEL_PILOTO>
npx supabase db push --linked --dry-run --skip-vault
```

Sustituir `<REF_DEL_PILOTO>` por el identificador verificado. Revisar el proyecto
vinculado antes de continuar. El primer dry-run debe listar exactamente las seis
migraciones del README, de initial_schema a phase5_customers, en orden.
Si no coincide, detenerse; no utilizar reset, repair o include-all para forzar el proceso.

```sh
npx supabase db push --linked --skip-vault
npx supabase migration list --linked
```

No usar `--include-seed`, SQL de snippets, dump de datos ni provisionamiento dentro de
las migraciones. No pegar DDL manualmente tabla por tabla: el historial debe registrarse.
El enlace de CLI no cambia las variables de la app; usar siempre `--local` o `--linked`
explícitamente en operaciones posteriores. Nunca ejecutar `db reset` contra el piloto.

## 3. Verificar historial y schema

Las columnas local/remoto deben contener las seis versiones iguales. Guardar resultado
sin credenciales junto al commit desplegado. Revisar diferencia sin aplicarla:

```sh
npx supabase db diff --linked --schema public,private
```

Este comando reconstruye una base sombra; requiere Docker. Investigar diferencias
antes de publicar. No convertir automáticamente su salida en una nueva migración.

## 4. Verificar RLS, políticas, RPCs y vista

En SQL Editor del proyecto remoto, consultas de lectura:

```sql
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname;

select c.relname, c.reloptions, pg_get_viewdef(c.oid)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v';

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Esperar ocho tablas de negocio con RLS, políticas OWNER con tenant y grants que
coincidan con las migraciones. Verificar RPCs públicas create_visit, void_visit,
get_dashboard y search_customers; wrappers/lecturas invoker. Los helpers privados
privilegiados deben conservar comprobación Auth/OWNER/tenant y search_path vacío.
customer_activity debe tener security_invoker=true. Revisar también grants por columna
contra owner_rls y Security Advisor en el dashboard. Antes de provisionar, las ocho
tablas deben estar vacías. Estas inspecciones **no sustituyen** pruebas de aislamiento.

## 5. Configurar Auth remoto

Authentication: Email habilitado, registro público desactivado, acceso anónimo
desactivado. Mantener sesión/refresh seguros y mínimo 12 caracteres de contraseña.
No copiar toda la configuración local al remoto: `config.toml` no configura Cloud.
No habilitar BARBER login, proveedores sociales ni envío de invitaciones/emails.
Las cuentas serán creadas administrativamente con correo confirmado.

## 6. Crear proyecto Vercel

**Antes de este paso consultar condiciones, planes y costos oficiales vigentes para
el uso del piloto y explicarlos al responsable. El plan no está decidido en Fase 0.**

Iniciar sesión y autorizar el repositorio. Importar como Next.js, raíz del repositorio,
Node compatible con package.json (22 o superior soportado), instalación `npm ci`,
build `npm run build`, salida predeterminada. Elegir una revisión aprobada.
No desplegar como export estático: necesita servidor y Auth SSR.
En Vercel, el entorno llamado Production representa aquí el piloto privado.
No requiere convertirlo en un producto público ni comprar un dominio.

## 7. Variables de Vercel

Configurar solo estos nombres en el entorno del piloto, tomando sus valores del
proyecto Supabase Cloud correcto antes de la primera build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Son públicas. El servidor utiliza sesión del usuario y RLS. No configurar service_role,
secret key, contraseña PostgreSQL, `TEST_DATABASE_URL` ni `SUPABASE_TEST_SECRET_KEY`.
No asignar las credenciales del piloto a Preview/Development por defecto. No usar
un Preview como staging adicional. Los cambios de estas variables requieren redeploy.

## 8. URL de Auth y acceso

Con la URL HTTPS estable del piloto, configurar en Supabase Authentication → URL
Configuration: Site URL = URL del piloto; redirects permitidos limitados a esa URL
(y rutas concretas si se incorporan flujos que los necesiten). Sin comodines amplios
para todos los previews. No agregar localhost al proyecto remoto para desarrollo
cotidiano; localhost sigue usando su Auth local sin modificaciones.

El login actual es email/password, sin callback OAuth ni enlace por correo. Site URL
no reemplaza comprobar credenciales, proyecto y membership. La página de login será
accesible desde internet; los datos requieren Auth y autorización OWNER. Verificar
que la configuración de protección de Vercel permita al dueño abrir la URL prevista
sin necesitar una cuenta Vercel; no desactivar controles sin revisar su alcance.

## 9. Provisionar OWNER/barbería

Seguir [provisioning.md](provisioning.md): crear Auth user confirmado, rellenar una
copia de la plantilla SQL vacía y ejecutarla en el proyecto verificado. Mantener la
plantilla del repositorio sin datos personales. Rechaza usuarios OWNER ya vinculados.
No usar usuarios ficticios ni copiar memberships locales.

## 10. Configurar barberos y servicios

Entrar como OWNER y usar Más → Barberos / Servicios con los datos acordados. Una regla
de fidelización solo si corresponde y se ha definido; administrarla explícitamente
según provisioning.md. No crear clientes o visitas para completar esta configuración.
Confirmar 0 clientes, 0 visitas y 0 visit_items para la barbería real.

## 11. Smoke test remoto separado

Checklist manual, **sin escrituras de negocio**, desde celular o navegador privado.
Anotar commit, URL, fecha y resultados; nunca contraseñas/tokens.

- [ ] Sin sesión, las rutas privadas llevan al login.
- [ ] Login del OWNER funciona y muestra su barbería.
- [ ] Dashboard carga sin error y con cero visitas al iniciar.
- [ ] Nueva visita carga; no enviar el formulario.
- [ ] Clientes carga vacío; no crear clientes.
- [ ] Barberos y Servicios muestran solo lo configurado.
- [ ] Logout cierra sesión; abrir una ruta privada vuelve al login.
- [ ] Con una cuenta técnica previamente provisionada SIN membership, el acceso
      queda denegado; no asignarle una barbería para superar la prueba.

No ejecutar `npm test` ni `npm run test:e2e` contra el remoto. No quitar guards locales
ni usar túneles para burlarlos. El smoke de lectura no certifica las mutaciones/RLS.

**Pruebas de escritura/aislamiento antes de entregar el piloto:** preparar ejecución
separada y explícitamente autorizada sobre tenants técnicos A/B y cuentas técnicas,
con IDs recién creados registrados para esa ejecución. Verificar lectura cruzada,
Clientes, Dashboard, create_visit con referencias ajenas y void_visit ajena/inexistente,
y confirmar que solo las operaciones válidas del tenant correcto funcionan. Usar
sesiones de usuarios normales, no una clave administrativa, para esas comprobaciones.
Nunca usar la barbería real como A o B. La limpieza administrativa se limita a los
IDs técnicos registrados, con revisión explícita; sin TRUNCATE, reset ni borrados globales.
No entregar acceso real hasta aprobar estas comprobaciones y confirmar que no quedan
fixtures técnicos. No se incluye en esta fase ningún ejecutor remoto destructivo.

## 12. Futuras versiones y redeployment

1. Desarrollar y probar localmente. Revisar diff y secretos, aprobar un commit.
2. Si hay nuevas migraciones, revisar compatibilidad con la app desplegada, respaldo
   y posibilidad de recuperación antes de ejecutarlas. Dry-run remoto, aplicar solo
   pendientes y comprobar historial; nunca editar migraciones ya aplicadas.
3. Desplegar el commit aprobado mediante Vercel y repetir el smoke. Si conectas Git,
   recordar que los pushes a la rama de producción pueden desplegar automáticamente;
   no usar esa rama para trabajo sin aprobar.
4. Para repetir sin cambios, usar Redeploy en el deployment aprobado. Verificar variables.
5. Ante regresión, restaurar una versión de app compatible desde Vercel. Esto **no**
   revierte schema/datos; no improvisar migraciones inversas ni usar reset.

## Si falla login

- Comprobar variables del deployment y que pertenecen al mismo Supabase remoto;
  tras corregir variables, volver a desplegar.
- Confirmar Email habilitado, usuario confirmado y credenciales correctas.
- Si autentica pero deniega acceso: comprobar membership OWNER y barbería vinculada.
- Revisar disponibilidad Supabase, logs de Auth y Vercel sin compartir tokens/passwords.
- Comprobar dominio HTTPS, cookies, Site URL y redirects; probar sesión privada limpia.
- No resolver fallos desactivando RLS, abriendo signup o poniendo service_role en la app.

Referencias oficiales (revalidar al desplegar):
[Supabase migrations](https://supabase.com/docs/guides/deployment/managing-environments),
[Auth URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs),
[planes Vercel](https://vercel.com/docs/plans).
