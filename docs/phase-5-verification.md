# Fase 5 — Clientes

Implementación local del 29 de septiembre de 2026, pendiente de aprobación del propietario. Sin avance a Fidelización.

## Entregado

- `/clientes`: búsqueda por nombre/teléfono, listado compacto, 25 por página y actividad válida reciente primero. Inicio/Visitas/Clientes/Más en navegación inferior.
- `/clientes/[id]`: nombre/teléfono, visitas, gasto total, última visita, historial ACTIVE paginado y enlaces al detalle existente.
- `/clientes/[id]/editar`: solamente nombre y teléfono opcional, no único. Guardar/Cancelar, validación, foco y conservación de datos al fallar. No eliminación ni deduplicación.
- Estados sin clientes, búsqueda sin resultados y cliente sin visitas activas; clientes ocasionales permanecen como customer_id NULL y no aparecen en el directorio.
- Diseño carbón/dorado y componentes actuales; sin nuevas dependencias, fuentes ni tokens.

## Migración y decisión sobre RPC

`supabase/migrations/20260929194532_phase5_customers.sql`, generada mediante `supabase db pull phase5_customers --local --yes`, revisada y ordenada para crear la vista antes de la función. Aplicada únicamente al Supabase local. Reejecución completa comprobada en transacción con rollback, sin alterar datos existentes. Historial local de migraciones sincronizado.

Una sola RPC nueva: `search_customers(p_query, p_page)`. Justificada por búsqueda literal sin distinguir mayúsculas, normalización del teléfono, agregados, orden y límite de resultados. No `get_customer_profile` ni `update_customer`.

La vista no materializada `customer_activity WITH (security_invoker=true)` comparte la fórmula del resumen entre la RPC y el perfil. Evita duplicar SQL, descargar visitas para sumar en JavaScript o habilitar agregaciones arbitrarias de PostgREST. No agrega columnas a customers ni almacena métricas. Teléfono se conserva como fue ingresado; se eliminan caracteres no numéricos solo al comparar búsquedas telefónicas.

El perfil usa dos consultas Supabase server-side: la vista filtrada por customer/tenant y `visits` filtrada por customer/tenant/status, con barbero y `visit_items.service_name` históricos. El historial trae 26 filas como máximo (25 visibles y una para detectar Siguiente). La edición usa UPDATE directo a customers con RLS y lista explícita name/phone; cero filas nunca se considera éxito.

## Cálculos y seguridad

La vista calcula `COUNT(*)`, `SUM(total_amount)` y `MAX(visited_at)` exclusivamente desde visits WHERE status='ACTIVE' AND customer_id=cliente AND barbershop_id=tenant. No une visit_items en la agregación: una VISIT con dos o más servicios cuenta como UNA visita. COUNT y SUM viajan como strings decimales y se muestran con el formateador COP existente; prueba con suma superior al entero seguro de JavaScript incluida.

Sin actividad válida: 0 visitas, $0 y última visita NULL. Anular la última visita mantiene al cliente. Listado: last_visit DESC NULLS LAST, name, id. Historial: visited_at DESC, id DESC. Paginación por offset; una nueva visita concurrente puede desplazar filas entre páginas. Resumen e historial son dos lecturas y no prometen un snapshot transaccional común.

Tenant derivado de requireOwner en servidor y de la membresía autenticada dentro de la RPC. Vista y función son invoker; RLS subyacente permanece activa, además de filtros explícitos. Anónimo sin permisos; BARBER/outsider sin acceso; propietarios A/B no pueden consultar perfiles ni modificar clientes ajenos. Perfiles ajenos, inexistentes y UUID inválidos devuelven la misma pantalla segura.

El layout OWNER existente fuerza consultas dinámicas. La versión instalada de Next.js invalida páginas visitadas tras los revalidatePath ya presentes en registro/anulación; el test incluye navegación Atrás tras anular y verifica resumen/historial actualizados. Editar revalida Clientes y Visitas, pues estas muestran el nombre actual. No se modificaron Dashboard, autenticación, create_visit, void_visit, acciones de visitas, schema de visitas, comisiones ni snapshots.

## Verificación

- `npm run lint`: correcto.
- `npm run typecheck`: correcto.
- `npm test`: 111/111 correctas, ninguna omitida.
- Build de producción: correcto, ejecutado por el webServer de Playwright antes de cada pasada.
- `npm run test:e2e`: 21/21 correctas en la pasada final (52,3 s), incluidas las 18 pruebas existentes y las 3 nuevas de Clientes.
- `supabase db lint --local --schema public --level warning --fail-on error`: sin errores.
- `supabase db advisors --local --type security --level warn --fail-on error`: sin incidencias.
- Revisión independiente de código: sin hallazgos accionables.

Casos cubiertos: creación desde visita, ocasional excluido, nombre, teléfono formateado/NULL/compartido, búsqueda literal con %/_, ACTIVE/VOIDED, una visita con múltiples servicios, descuentos, sumas exactas, última visita, cero ACTIVE, tenant A/B y roles no autorizados, edición, conservación tras error, navegación y paginación de clientes/historial. El test de perfil demuestra que sus métricas no cambian al paginar el historial.

Se corrigió una carrera de UI que permitía introducir otra búsqueda mientras la anterior actualizaba el campo: ahora la consulta explícita deja el campo temporalmente de solo lectura, conserva foco y muestra pendiente. No se hacen peticiones por cada tecla. Los ajustes posteriores de tests corrigen fixtures (status explícito al insertar por lotes), lectura prematura de URL (esperar h1 del perfil) y comprobación de fecha por datetime semántico en vez de una abreviatura supuesta.

Auditoría premium estricta: 28 hallazgos `affordance.actionless-button`, todos en Button asChild que contiene Link/href (20 ya existentes y 8 añadidos). Son falsos positivos del analizador heurístico; se inspeccionó el código y los destinos se ejercitaron en navegador. Resultado bruto en `docs/phase-5-ui-audit.json`; no se declara este comando como aprobado. Permanecen los avisos de entorno ya existentes MODULE_TYPELESS_PACKAGE_JSON y NO_COLOR/FORCE_COLOR, sin fallos funcionales.

## Capturas

Capturas reales con fixtures temporales, limpiados al terminar. Siete estados × tres anchos: 360, 390 y 430 px; comprobación de ausencia de overflow horizontal. Revisión visual en Chromium, sin afirmar prueba en dispositivos físicos Safari/iOS/Android.

| Estado | 360 px | 390 px | 430 px |
|---|---|---|---|
| Listado | [Ver](screenshots/phase-5/listado-360.png) | [Ver](screenshots/phase-5/listado-390.png) | [Ver](screenshots/phase-5/listado-430.png) |
| Búsqueda | [Ver](screenshots/phase-5/busqueda-360.png) | [Ver](screenshots/phase-5/busqueda-390.png) | [Ver](screenshots/phase-5/busqueda-430.png) |
| Perfil | [Ver](screenshots/phase-5/perfil-360.png) | [Ver](screenshots/phase-5/perfil-390.png) | [Ver](screenshots/phase-5/perfil-430.png) |
| Historial | [Ver](screenshots/phase-5/historial-360.png) | [Ver](screenshots/phase-5/historial-390.png) | [Ver](screenshots/phase-5/historial-430.png) |
| Sin clientes | [Ver](screenshots/phase-5/empty-360.png) | [Ver](screenshots/phase-5/empty-390.png) | [Ver](screenshots/phase-5/empty-430.png) |
| Sin resultados | [Ver](screenshots/phase-5/sin-resultados-360.png) | [Ver](screenshots/phase-5/sin-resultados-390.png) | [Ver](screenshots/phase-5/sin-resultados-430.png) |
| Sin ACTIVE | [Ver](screenshots/phase-5/sin-visitas-activas-360.png) | [Ver](screenshots/phase-5/sin-visitas-activas-390.png) | [Ver](screenshots/phase-5/sin-visitas-activas-430.png) |
