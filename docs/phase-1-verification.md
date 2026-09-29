# Fase 1 — Verificación

Fecha: 29 de septiembre de 2026 UTC (28 de septiembre en Bogotá al iniciar).
Entorno: Node 24.13.0, Next.js 16.3.6, Supabase CLI 2.118.0,
PostgreSQL 17 en Docker local. Sin proyecto remoto configurado ni modificado.

## Resultados finales

| Comando / revisión | Resultado |
|---|---|
| `npm run lint` | 0 errores, 0 advertencias |
| `npm run typecheck` | Tipos de rutas y TypeScript strict correctos |
| `npm test` | 87/87 pruebas PostgreSQL correctas |
| `npm run test:e2e` | 10/10 pruebas Chromium correctas, sobre build de producción |
| `npm run build` | Build de producción correcto; solo /, /login, /acceso-denegado y 404 |
| `npx supabase db reset --local --yes` | Schema reconstruido desde cero con ambas migraciones |
| `npx supabase migration list --local` | Versiones 20260929032903 y 20260929033048 aplicadas |
| `npx supabase db advisors --local --type all --level warn --fail-on error` | Sin hallazgos |
| Auditoría estática de UI mínima | 0 errores y 0 advertencias (`premium-audit.json`) |
| Revisión independiente | Sin defectos accionables dentro del alcance de Fase 1 |

## Qué prueban los tests

- OWNER A y OWNER B solo leen filas propias, incluso sin filtros de tenant, en
  las ocho tablas. BARBER y usuario sin membresía no leen datos de negocio.
- CRUD directo autorizado de catálogos/clientes/fidelización; escrituras en otra
  barbería bloqueadas y tenant/id/timestamps no editables por API.
- Sin escalada de membresías ni uso de user_metadata para autorización.
- Ningún DELETE de la app; visitas/items sin UPDATE directo en esta fase.
- Claves compuestas rechazan relaciones entre tenants incluso con escritor admin.
- Constraints rechazan importes/porcentajes/estados imposibles; cliente NULL válido.
- Cambiar catálogo o porcentaje del barbero no altera snapshots ya guardados.
- Provisión manual atómica, con rechazo de OWNER ya provisionado para no duplicar.
- Login email/password real, validación accesible, error de credenciales, logout,
  sesión persistente y bloqueo de usuarios sin OWNER.
- Registro público rechazado por Auth, no solo oculto en UI.
- Refresco real de sesión: se fuerza `expires_at` vencido en el almacenamiento de
  una sesión con tokens reales, Auth renueva y el navegador recibe cookies nuevas.
  No se falsifica un JWT ni se espera una hora de expiración natural.
- Respuesta de producción `no-store`, revocación OWNER efectiva en sesión abierta.
- Login móvil a 360px, navegación con teclado, movimiento reducido y sin overflow.

Los tests SQL se ejecutan como `authenticated` dentro de transacciones revertidas.
Los tests E2E crean usuarios temporales con Admin API local y los eliminan al acabar.
No se crearon credenciales permanentes ni una barbería piloto con datos inventados.

## Ciclo de verificación y correcciones

- Antes de políticas/grants, las pruebas de acceso OWNER fallaron por permiso
  denegado. Después de aplicarlos, 85/85 pasaron; dos pruebas de provisión elevaron
  la suite final a 87/87 después de reconstruir desde las migraciones.
- La prueba de acceso anónimo falló inicialmente porque `/` todavía era público;
  después de implementar protección SSR, pasó.
- La primera configuración local desactivó el proveedor Email. Se corrigió dejando
  `auth.email.enable_signup=true` y `auth.enable_signup=false`: login permitido y
  signup rechazado se verifican por separado.
- La CLI `db query --file` no aceptó múltiples sentencias. Durante desarrollo se
  aplicó RLS con el cliente PostgreSQL; luego `db reset` validó ambas migraciones
  completas por el mecanismo normal de Supabase.
- Next.js dev sobrescribe Cache-Control con `no-cache, must-revalidate`. Las E2E
  finales usan `next build` + `next start` para comprobar la respuesta desplegable.
- Los avisos NO_COLOR/FORCE_COLOR vienen del entorno de ejecución de Playwright;
  no son fallos de la app. No se suprimieron errores de pruebas.

## Decisiones respecto al PRODUCT_SPEC

- Solo Fase 1 implementada. No se agregaron pantallas de negocio, dashboard ni RPC
  de visitas. Las escrituras de visitas se habilitarán únicamente cuando exista su
  operación transaccional en Fase 3.
- Restricciones COP/America/Bogota acordes al mercado único del MVP.
- Nombre de 1–120 caracteres, teléfono opcional de 1–30 y recompensa de 1–300;
  enlace opcional HTTPS. Son validaciones de datos, no módulos nuevos.
- Catálogos y clientes tienen grants de INSERT/UPDATE por columnas, sin DELETE.
  No hay CRUD RPC ni capas repository/service.
- La pantalla protegida muestra la primera membresía OWNER si hubiera varias;
  no se añadió selector de barberías.
- No se creó un worktree ni commits: la carpeta autorizada estaba vacía y sin Git.
- No se añadió infraestructura de producción ni despliegue Vercel en esta fase.

## Pendiente externo

Conectar las herramientas del plugin Supabase a esta sesión y aplicar la
configuración al proyecto remoto elegido. El catálogo confirmó el plugin instalado
y habilitado, pero sus herramientas no estaban expuestas. El acceso al dashboard
mediante navegador fue rechazado por permisos; no se usaron vías alternativas para
eludir ese rechazo. Los pasos manuales exactos están en `docs/provisioning.md`.

Fase 2 requiere una nueva aprobación del usuario.
