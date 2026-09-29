# MiBarbería — Fase 1

Cimentación del MVP: Next.js 16/App Router, TypeScript strict, Tailwind 4,
shadcn/ui y Supabase Auth/PostgreSQL/RLS. Solo login, página OWNER protegida
y acceso denegado. No hay dashboard ni funciones de las fases siguientes.

## Arranque local

Requisitos: Node.js 22 o superior, npm y Docker Desktop en ejecución.

```sh
npm ci
npm run db:start
npm run setup:local
npm run dev
```

Aplicación: http://localhost:3000. Studio local: http://127.0.0.1:54323.
`setup:local` obtiene las claves exclusivamente del stack local. Crea `.env.local`
solo si no existe y genera `.env.test.local` para las pruebas; ambos están ignorados.
No sobrescribe una conexión remota que ya tengas configurada.

Sin variables, la app sigue arrancando: `/` redirige a `/login`, que informa que el
acceso aún no está configurado. No hay un modo demo que salte autenticación.

Para iniciar sesión, crea un usuario y una barbería con los pasos de
[provisionamiento](docs/provisioning.md). Las cuentas E2E son temporales y se eliminan.

## Variables de la aplicación

En `.env.local` y posteriormente en Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

No se necesita `service_role`, clave secreta ni contraseña de PostgreSQL en la app.
El cliente del servidor también usa la clave pública y la sesión del usuario, por
lo que está sujeto a RLS. Las claves antiguas `anon` no son el formato configurado
en esta fase; usar la publishable key del diálogo Connect/API Keys.

Variables exclusivas de pruebas locales, generadas por `setup:local`:

- `SUPABASE_TEST_SECRET_KEY`: provisión/limpieza de usuarios temporales E2E.
- `TEST_DATABASE_URL`: PostgreSQL local (por defecto puerto 54322).

Estas variables no se configuran en Vercel ni se envían al navegador. Los tests
rechazan URLs remotas para no escribir fixtures en una barbería real.

## Migraciones

1. `20260929032903_initial_schema.sql`: ocho tablas, constraints, claves compuestas,
   índices, timestamps y RLS habilitado sin acceso público.
2. `20260929033048_owner_rls.sql`: autorización OWNER, políticas y grants mínimos.

Son la fuente de verdad y se aplican en orden. Las tablas de visitas no aceptan
escrituras por la API en Fase 1. Las funciones transaccionales de VISIT se crearán
en Fase 3; el CRUD simple usa directamente Supabase y RLS.

```sh
# Borra SOLO los datos del Supabase LOCAL y reconstruye desde migraciones.
npm run db:reset
npm run db:types
```

No uses `db:reset` en un entorno con datos que quieras conservar. Nunca se ejecuta
automáticamente al iniciar la aplicación.

## Comprobaciones

Con Supabase local iniciado:

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npx supabase db advisors --local --type all --level warn --fail-on error
```

`npm test` ejecuta operaciones reales como `authenticated`, con fixtures en
transacciones revertidas, sobre PostgreSQL local. No simula RLS.
`test:e2e` compila y levanta Next.js en modo producción en el puerto 3100, usa Auth real y elimina solo sus
cuentas/barberías temporales. Sus claves locales se cargan de `.env.test.local`.

## Seguridad y decisiones

- Sesiones SSR por cookies y refresco con `src/proxy.ts` (Next.js 16).
- La página protegida valida identidad con Auth y consulta membresía OWNER en DB.
- RLS no confía en `user_metadata`, parámetros del navegador o filtros de la UI.
- Membresías solo administradas manualmente; un OWNER no puede asignarse permisos.
- Tablas de negocio aisladas por `barbershop_id`; relaciones cross-tenant impedidas
  también por claves foráneas compuestas.
- CRUD simple con SELECT/INSERT/UPDATE según tabla y columnas permitidas, sin RPC.
- Sin permisos DELETE para usuarios de aplicación. Catálogos se desactivarán.
- `visits` y `visit_items`: SELECT únicamente; no CRUD parcial inseguro.
- Las páginas privadas son dinámicas y las respuestas no se almacenan en caché.
- El helper privado `owned_barbershop_ids` usa SECURITY DEFINER únicamente para
  consultar membresías sin recursión RLS. No acepta user_id ni es una RPC pública.
- Cuentas sin OWNER y rol BARBER ven acceso no habilitado.
- Si un usuario tiene varias membresías OWNER, esta página mínima muestra la
  primera por fecha/id. No se implementó selector de barberías.

Ver [decisiones y alcance](docs/phase-1-plan.md), [provisión](docs/provisioning.md)
y [evidencia de verificación](docs/phase-1-verification.md).
