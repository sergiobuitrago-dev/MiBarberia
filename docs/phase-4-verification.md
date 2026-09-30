# Fase 4 — Dashboard

## 1. Implementación

Inicio (`/`) ahora muestra el Dashboard del OWNER. Una RPC de solo lectura calcula ventas, visitas, comisiones, para barbería, métodos de pago, producción por barbero y los cinco servicios más vendidos. Todas las cifras parten de visits ACTIVE dentro del periodo y tenant autorizado; visit_items solo interviene en el conteo de servicios.

No se crearon tablas de métricas, vistas materializadas, índices adicionales, tareas programadas, cachés, suscripciones realtime ni dependencias. No se avanzó a Clientes/Fidelización.

Archivos principales: `src/features/dashboard/screen.tsx`, `period.ts`, `src/app/(owner)/page.tsx`. La creación/anulación ahora revalida también Inicio en `src/features/visits/actions.ts`. Los tipos de Supabase se regeneraron.

## 2. Diseño y UX

- Hoy por defecto. Cuatro opciones visibles en dos columnas: Hoy, Esta semana, Este mes, Personalizado.
- Nueva visita sigue siendo una acción prominente, antes de las cifras.
- Un panel con Ventas destacadas y tres filas: Visitas, Comisiones, Para barbería.
- Listas sencillas para pagos, barberos y servicios, sin gráficas ni tablas móviles. Solo aparecen grupos con actividad, incluyendo visitas cuyo importe sea cero.
- Estado vacío con las cuatro cifras en cero, explicación y acceso a registrar una visita.
- Personalizado usa dos campos de fecha nativos y Aplicar periodo. Se acepta la presentación del calendario del navegador/sistema; etiquetas en español. Esta decisión figura en DESIGN.md, UX-CONTRACT.md y premium-ui.json.
- Validación server-side del calendario y orden de fechas, valores preservados y foco en el primer campo al fallar. Un rango inválido no presenta cifras de otro periodo.
- Periodo aplicado en URL (`periodo`, `desde`, `hasta`), sin guardado de filtros ni presets adicionales.
- Se conserva la identidad visual, Button/Input y navegación Inicio/Visitas/Más; la configuración sigue accesible en Más.
- Los estados globales de carga/error continúan cubriendo Inicio. No se ofrece un resultado parcial ante fallo de la consulta.

## 3. RPC y consultas

```sql
public.get_dashboard(
  p_period text default 'today',
  p_start_date date default null,
  p_end_date date default null
) returns jsonb
```

Periodos admitidos: `today`, `week`, `month`, `custom`. Las fechas solo se utilizan para custom. No acepta barbería ni timezone del cliente.

Devuelve periodo, timezone, límites start/end, fecha local today, totals y listas payments/barbers/services. Importes y conteos son cadenas decimales; se formatean con BigInt en la aplicación para evitar pérdida de precisión incluso si la suma excede el máximo entero seguro de JavaScript.

Una consulta agregada utiliza un conjunto común de visitas activas. Totales, pagos y barberos se calculan desde ese conjunto antes de cualquier unión con items. Así, una visita con dos servicios no duplica ventas, visitas ni comisión. El conjunto de servicios se agrega por separado y se limita a cinco.

Comisiones = SUM(visits.commission_amount). Para barbería = SUM(total_amount - commission_amount). No se recalcula la comisión según el porcentaje actual del barbero. La nomenclatura es Para barbería; no se calcula utilidad ni se incorporan gastos.

Al abrir Personalizado sin fechas, la única RPC de esa carga consulta Hoy para obtener la fecha local que rellena los campos. Las métricas permanecen ocultas hasta aplicar un rango válido.

## 4. Migración

[20260929140110_dashboard.sql](../supabase/migrations/20260929140110_dashboard.sql).

Crea solamente get_dashboard y sus permisos/comentario. Aplicada a Supabase local, sin reset ni despliegue remoto. `supabase migration list --local` confirma las cinco migraciones aplicadas.

## 5. Periodos exactos

Todos los intervalos usan `visited_at >= start AND visited_at < end`.

| Periodo | Inicio incluido | Fin excluido |
|---|---|---|
| Hoy | Medianoche del día local actual | Medianoche del día local siguiente |
| Esta semana | Lunes 00:00 de la semana local actual | Instante de consulta |
| Este mes | Día 1, 00:00 del mes local actual | Instante de consulta |
| Personalizado | Fecha inicial, 00:00 local | Día posterior a la fecha final, 00:00 local |

El instante se captura una vez con statement_timestamp(). Semana/mes son hasta ahora; Hoy es el día calendario completo acordado. Personalizado incluye ambos días, no suma una cantidad fija de horas en UTC.

Custom requiere ambas fechas finitas y válidas, año 0001–9999, inicial <= final. Errores de periodo/rango se rechazan en la RPC con INVALID_PERIOD / SQLSTATE 22023; fechas no válidas para PostgreSQL también son rechazadas por su tipo date. La aplicación valida los parámetros antes de enviarlos.

## 6. Timezone

La RPC lee barbershops.timezone del tenant autorizado. Actualmente el esquema la restringe a America/Bogota. Convierte el instante del servidor a hora local, obtiene los límites de calendario y luego convierte cada límite a timestamptz con AT TIME ZONE.

Ejemplo: Hoy, 29/09/2026 en Bogotá, cubre `[2026-09-29 05:00Z, 2026-09-30 05:00Z)`. El rango personalizado 01/02/2026–28/02/2026 termina en `2026-03-01 05:00Z`, excluido.

Ni el reloj ni la timezone del navegador autorizan o calculan los periodos. El frontend trata las fechas de formulario como días ISO; la conversión temporal se hace en PostgreSQL.

## 7. Tenant isolation y estado

- requireOwner autentica cada carga de Inicio.
- RPC SECURITY INVOKER y STABLE, search_path vacío; RLS permanece activa. No existe bypass privilegiado de lectura para el Dashboard.
- Verifica auth.uid() y OWNER real, eligiendo la primera membresía por created_at/id como el resto de la app.
- Todas las visitas se filtran por barbería derivada y status ACTIVE; las uniones de items, catálogo y barberos también se delimitan al mismo tenant.
- EXECUTE revocado a PUBLIC/anon y concedido a authenticated. Sin autenticación/membresía válida se rechaza con 42501.
- VOIDED queda excluido de todas las métricas por el filtro común. No existe lógica de restar importes ni escritura de resultados agregados.
- Registrar/anular revalida Inicio. Al regresar, una consulta normal obtiene los nuevos totales; sin realtime.

## 8. Tests y verificaciones

- `npm run lint`: pasa sin errores ni advertencias.
- `npm run typecheck`: pasa.
- `npm test`: 105/105 pasan; seis nuevas pruebas enfocadas en Dashboard/periodos.
- `npm run test:e2e`: 17/17 pasan en Chromium, incluyendo build y ejecución de producción. Un flujo E2E nuevo recorre Dashboard → registrar → Dashboard → periodos → anular → Dashboard.
- `supabase db advisors --local --type all --level warn`: sin incidencias.
- Revisión independiente: detectó desbordamiento con nombre de barbero largo; corregido y cubierto por el navegador. Sin otros hallazgos accionables.
- Capturas reales a 390 px revisadas; geometría sin overflow a 360/390/430 px, incluyendo nombres sin espacios de 120 caracteres.

Cobertura de datos: vacío, una/múltiples visitas, todos los totales, cuatro métodos de pago, varios barberos, top cinco con desempate estable, nombres renombrados sin fragmentar service_id, snapshots intactos, comisión histórica tras cambiar commission_rate, ACTIVE/VOIDED, OWNER A/B, BARBER/usuario sin OWNER/anon, límites día/semana/mes y personalizado inclusivo, zona Bogotá y precisión por encima del entero seguro de JavaScript.

Cobertura de UI: vacío, creación real de $45.000 con dos servicios y comisión de $18.000, para barbería $27.000, desgloses, navegación de los cuatro periodos, error de rango y foco, rango histórico vacío, anulación y eliminación del efecto en las cuatro cifras y todas las listas. Existe una visita de otro tenant que no aparece en el Dashboard.

Auditor UI estricto: código 1, 20 detecciones `affordance.actionless-button`, todas en Button asChild con Link. Es la limitación del auditor ya documentada en fases anteriores; los enlaces reales están verificados por navegador. Cero decisiones de ownership sin resolver. Evidencia: [phase-4-ui-audit.json](phase-4-ui-audit.json). No se declara este chequeo estático aprobado.

Se mantienen avisos de herramientas MODULE_TYPELESS_PACKAGE_JSON en los tests Node y NO_COLOR/FORCE_COLOR en Playwright. Sin formatter ni suite visual-regression configurados; revisión visual manual de las capturas.

## 9. Capturas de 390 px

| Estado | Captura |
|---|---|
| Dashboard vacío | [Ver](screenshots/phase-4/dashboard-vacio-390.png) |
| Dashboard con actividad | [Ver](screenshots/phase-4/dashboard-actividad-390.png) |
| Selector de periodo personalizado | [Ver](screenshots/phase-4/dashboard-periodo-390.png) |
| Producción por barbero | [Ver](screenshots/phase-4/dashboard-barberos-390.png) |
| Top servicios | [Ver](screenshots/phase-4/dashboard-servicios-390.png) |

Fixtures temporales de prueba; no son datos del piloto. Las capturas de listas se toman con la página desplazada para mostrar el contenido completo.

## 10. Decisiones y PRODUCT_SPEC

- Top Servicios agrupa únicamente por service_id, conforme a la precisión aprobada. Nombre actual del catálogo cuando existe, incluso si el servicio está inactivo. Fallback sencillo: snapshot más reciente dentro del periodo, con desempate por IDs. Los snapshots nunca se modifican.
- El catálogo está protegido por una FK restrictiva, por lo que la desaparición de un servicio no es un flujo ordinario actual. El fallback no requiere infraestructura ni nuevas tablas.
- Los nombres de barbero son los actuales, como en el historial existente; las comisiones son históricas. Barberos inactivos siguen apareciendo si tienen actividad en el periodo.
- Top Servicios se ordena por cantidad DESC, service_id ASC y muestra hasta cinco. Barberos por producción DESC, ID; pagos en orden Efectivo/Transferencia/Tarjeta/Otro.
- Sin desviaciones funcionales adicionales del alcance aprobado. No se implementó edición, restauración, Clientes/Fidelización, reportes, gráficos, gastos, exportaciones ni analytics.

Fase 4 entregada para aprobación. No se avanza de fase automáticamente.
