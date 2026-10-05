# Fase 6 — Home operacional + Comisiones semanales

Implementación y validación local del 4 de octubre de 2026. Rama `codex/home-comisiones`.
Sin commit ni push; sin cambios a Supabase Cloud ni deployment. No hay nuevas dependencias.

## Resultado

- Home con cuatro cards, importes semánticos y producción por barbero en cards compactas.
- Una gráfica SVG: siete días calendario locales incluyendo hoy, independiente del selector;
  ACTIVE solamente, días vacíos en cero, números exactos, desglose diario accesible con teclado.
- `/comisiones`: semana actual por defecto, navegación anterior/actual/siguiente y cards solo
  para barberos con actividad ACTIVE (incluidos inactivos con histórico o visitas de valor cero).
- `/comisiones/[barberId]`: totales semanales completos y visitas de 25 en 25 con fecha/hora,
  servicios históricos, total y comisión snapshot. Regreso conserva la semana.
- Barra inferior Inicio/Visitas/Comisiones/Más; Clientes y cuenta/logout en Más.
- Revalidación al crear/anular; sin cierre ni estado de pago. Las anulaciones afectan históricos.

## Datos y migración

`supabase/migrations/20261005012235_home_weekly_commissions.sql`, generada por la CLI y
aplicada con `supabase migration up --local`. El timestamp del nombre es UTC.
Se conservan sin modificaciones las seis migraciones anteriores y los datos existentes.
No hubo repair, reset ni escrituras manuales a supabase_migrations.

Extensión aditiva de `get_dashboard`: propiedad `daily_sales`, siete `{date,sales}`.
La firma, los cuatro periodos y los agregados existentes se conservan. Semana/mes del
Dashboard continúan hasta el instante de consulta; la serie usa días calendario completos.

Nueva RPC `get_weekly_commissions(date,uuid,integer)`: STABLE/SECURITY INVOKER,
search_path vacío, permisos de ejecución autenticados y comprobación OWNER. Tenant/timezone
se derivan de auth.uid; RLS permanece activa; sin argumento tenant. IDs de barbero ajenos e
inexistentes fallan igual. Semanas [lunes 00:00, próximo lunes 00:00) America/Bogota.
Suma total_amount y commission_amount almacenados, no tasas actuales. Totales y detalle
pertenecen a la misma respuesta/snapshot de lectura; importes y conteos como strings exactos.
Sin tablas nuevas, cambios de políticas, agregados persistidos ni migración de datos.

Historial local verificado: siete versiones, final `20261005012235`.
Tipos TypeScript regenerados exclusivamente desde Supabase local.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; ejecutado por webServer de Playwright antes de la suite |
| `npm test` | 121/121, cero fallos u omitidos |
| `npx playwright test` | 25/25, cero fallos; pasada final completa tras corrección de revalidación |
| `supabase db lint --local --schema public --level warning --fail-on error` | Sin errores |
| `supabase db advisors --local --type security --level warn --fail-on error` | Sin incidencias |
| `supabase migration list --local` | Siete versiones alineadas con archivos locales |
| `git diff --check` | Correcto |
| Revisión independiente | Único hallazgo de revalidación corregido; sin otros hallazgos accionables |

Se mantuvieron todos los tests previos; se adaptaron los recorridos de Clientes/logout al
nuevo lugar de navegación. Nuevos casos SQL: serie independiente, cero ventas, bordes locales
y microsegundos, sumas grandes, lunes/domingo y cambio de año, snapshot, VOIDED, semanas
históricas y vacías, barbero inactivo, valor cero, OWNER/anon/BARBER/outsider, tenant A/B,
barber_id ajeno, fechas/páginas inválidas y totales completos al paginar.

Navegador Chromium: Home/listado/detalle a 360/390/430, Home/detalle también a 1280.
Sin scroll horizontal ni importes recortados en los casos probados, incluidos importes de
$9.000.000.000.000.000 y nombres largos. Siete ceros, un pico, teclado en desglose diario,
fechas inválidas, barbero ajeno, estados vacíos, navegación, paginación y actualización
al crear/anular cubiertos. No se afirma prueba en dispositivos físicos ni Safari/iOS.

Revisión de la versión local de Next: `revalidatePath('/comisiones','layout')` no coincide
con las etiquetas de rutas del grupo OWNER. Se corrigió a `/(owner)/comisiones` y se comprobó
el patrón contra getImplicitTags. La prueba crear → consultar → anular → consultar pasó.

## Auditorías y límites conocidos

Auditoría premium estricta: 38 hallazgos `affordance.actionless-button`, todos corresponden a
`Button asChild` con `Link`/href; 28 ya estaban documentados en fase 5. Se inspeccionaron las
38 ubicaciones: no son botones sin acción, renderizan enlaces reales. Los destinos nuevos se
verificaron en navegador. Se conserva el resultado bruto en `phase-6-ui-audit.json`; no se
presenta ese comando como aprobado. No se alteró el componente canónico para silenciar el analizador.

`designmd lint DESIGN.md`: cero errores, un aviso por ausencia de YAML en el documento existente,
que mantiene su formato de prosa. globals.css sigue siendo fuente canónica de tokens sin cambios.
Persisten los avisos de entorno existentes MODULE_TYPELESS_PACKAGE_JSON y NO_COLOR/FORCE_COLOR.

La paginación offset conserva la limitación del historial existente: actividad concurrente puede
mover filas entre páginas. No se agrega realtime ni snapshot persistido. Comisiones indica lo
que corresponde según ACTIVE; no representa dinero pagado.

## Capturas reales

Fixtures temporales locales, eliminados al finalizar los tests.

| Pantalla | 360 px | 390 px | 430 px |
|---|---|---|---|
| Home | [Ver](screenshots/phase-6/home-360.png) | [Ver](screenshots/phase-6/home-390.png) | [Ver](screenshots/phase-6/home-430.png) |
| Comisiones | [Ver](screenshots/phase-6/commissions-360.png) | [Ver](screenshots/phase-6/commissions-390.png) | [Ver](screenshots/phase-6/commissions-430.png) |
| Detalle | [Ver](screenshots/phase-6/commission-detail-360.png) | [Ver](screenshots/phase-6/commission-detail-390.png) | [Ver](screenshots/phase-6/commission-detail-430.png) |

[Home en cero](screenshots/phase-6/home-seven-zeros-360.png) ·
[Semana vacía](screenshots/phase-6/commissions-empty-360.png) ·
[Importes grandes](screenshots/phase-6/large-home-360.png) ·
[Home desktop](screenshots/phase-6/home-1280.png)

## Publicación pendiente, fuera de esta ejecución

Según instrucción explícita del propietario:
1. Aplicar Migration 7 a Supabase Cloud por el flujo normal.
2. Verificar migration history y RPCs.
3. Hacer commit del código aprobado.
4. Hacer push a main únicamente con aprobación explícita: es una acción de deployment.
5. Netlify despliega automáticamente desde GitHub; no ejecutar deployment manual.
6. Verificar build/deployment del commit aprobado.
7. Smoke test en la URL pública.

Ver también la sección 12 actualizada de `pilot-deployment.md`.
