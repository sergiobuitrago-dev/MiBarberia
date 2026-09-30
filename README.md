# MiBarbería

Aplicación mobile-first para propietarios: Dashboard, registro/historial/anulación
de visitas, Clientes y configuración de Barberos/Servicios. Next.js App Router,
TypeScript y Supabase Auth/PostgreSQL con aislamiento por barbería mediante RLS.
Acceso OWNER provisionado manualmente; sin registro público ni acceso operativo BARBER.

## Dos entornos separados

| Entorno | Aplicación | Base/Auth | Datos |
|---|---|---|---|
| Desarrollo | localhost | Supabase local | Ficticios y tests |
| Piloto privado (por preparar) | Vercel, HTTPS | Supabase Cloud dedicado | Reales, 1–3 barberías |

El desarrollo cotidiano nunca se conecta a la base del piloto. No copiar bases,
usuarios, clientes ni visitas locales al remoto. El remoto se reconstruye desde
las migraciones, seguido del provisionamiento explícito de cada barbería.

## Arranque local

Node.js 22 o superior, npm y Docker Desktop en ejecución:

```sh
npm ci
npm run db:start
npm run setup:local
npm run dev
```

App: http://localhost:3000. Studio: http://127.0.0.1:54323.
`setup:local` obtiene claves del stack local, crea `.env.local` solo si no existe
y genera `.env.test.local`. Ambos archivos están ignorados por Git. Si `.env.local`
ya existe, comprueba que siga apuntando a localhost; el script no lo sobrescribe.
Para probar una build optimizada: detener `dev`, ejecutar `npm run build` y
`npm run start`. No ejecutar ambos servidores sobre el mismo puerto.

## Variables

| Nombre | Uso | Clasificación |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Local en `.env.local`; remota en Vercel | Pública |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave del proyecto correspondiente | Pública |
| TEST_DATABASE_URL | Solo tests PostgreSQL locales | Privada |
| SUPABASE_TEST_SECRET_KEY | Solo fixtures Auth/E2E locales | Secreta |

La app desplegada requiere únicamente las dos variables `NEXT_PUBLIC_`.
El servidor usa la sesión del usuario y sigue sujeto a RLS. No configurar
service_role, claves administrativas ni contraseña PostgreSQL en Vercel.
No guardar valores reales en documentación, código ni logs.

## Migraciones: fuente de verdad

Las seis migraciones versionadas, en orden:

1. `20260929032903_initial_schema.sql`: ocho tablas, constraints, índices y RLS.
2. `20260929033048_owner_rls.sql`: autorización OWNER, políticas y grants.
3. `20260929042922_create_visit.sql`: registro transaccional y snapshots.
4. `20260929132618_void_visit.sql`: anulación definitiva, sin borrado/restauración.
5. `20260929140110_dashboard.sql`: agregados de visitas ACTIVE.
6. `20260929194532_phase5_customers.sql`: vista customer_activity y búsqueda.

No insertan datos demo al aplicarse; los INSERT dentro de las RPCs solo se ejecutan
al invocar esas operaciones. Seed desactivado. `supabase/manual` y `supabase/snippets`
no forman parte del deployment de migraciones.

`npm run db:reset` **borra la base local**: no usar para desplegar ni verificar un
entorno con datos que se deban conservar. Para inspección sin borrado:

```sh
npx supabase migration list --local
npx supabase db diff --local --schema public,private
```

## Verificación local

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Playwright necesita Chromium instalado (`npx playwright install chromium`).
E2E compila y levanta la app en 3100; crea y limpia exclusivamente sus fixtures.
Los tests de base de datos usan transacciones revertidas. Ambas suites rechazan
hosts remotos: no eliminar esas protecciones ni usar túneles al piloto para saltarlas.
No ejecutar estas suites contra datos reales.

## Piloto y provisión

Seguir [deployment del piloto](docs/pilot-deployment.md) y
[provisionamiento manual](docs/provisioning.md). Preparación documental únicamente:
la existencia de estas guías no significa que el piloto esté desplegado/verificado.

Las notas `docs/phase-*` son evidencia histórica de cada fase, no instrucciones
actuales de despliegue. No se agrega onboarding, billing ni infraestructura adicional.
