# Fase 3 — Nueva Visita

## Resultado
Registro completo: cliente ocasional/existente/nuevo → barbero → servicios y precios → descuento COP → pago → confirmación → detalle persistido. Inicio y navegación dan acceso a Nueva visita. No dashboard, edición, anulación, reviews ni fidelización.

## UX
- Pantalla única con botones táctiles, sin selects ni modales para los pasos principales.
- Cliente ocasional y Efectivo por defecto; barbero siempre explícito. El usuario puede cambiar ambos defaults.
- Búsqueda por nombre/teléfono a partir de dos caracteres: debounce 250ms, cancelación de consulta anterior, máximo 10 resultados, consultas RLS. No descarga todos los clientes.
- Nuevo cliente: nombre obligatorio, teléfono opcional. Su inserción sucede dentro de la transacción de la visita.
- Servicios seleccionados muestran precio cobrado editable. El catálogo permanece intacto.
- Resumen con subtotal, descuento y total. Errores corregidos desaparecen sin exigir otro submit. Los rechazos de servidor conservan el formulario.
- Acción bloqueada inmediatamente con ref y pending; estado Registrando…; confirmación y Registrar otra visita vuelven a un formulario limpio.
- Detalle básico con comisión y parte de barbería derivada, sin liquidación ni edición.

## Migration y contrato
Archivo: `supabase/migrations/20260929042922_create_visit.sql`, aplicado solo a Supabase local, sin reset ni alteración de datos reales.

```sql
public.create_visit(
  p_barber_id uuid,
  p_items jsonb,
  p_discount_amount bigint,
  p_payment_method text,
  p_customer_id uuid default null,
  p_new_customer jsonb default null
) returns uuid
```

Ejemplo de items: `[{"service_id":"<uuid>","charged_price":"30000"}]`.
Nuevo cliente: `{"name":"Juan Pérez","phone":"3001234567"}`. Teléfono ausente/null/vacío se almacena NULL.
Cliente ocasional: ambos parámetros de cliente NULL. Existente: solo p_customer_id. Nuevo: solo p_new_customer. Ambos simultáneos se rechazan.
Métodos: CASH, TRANSFER, CARD, OTHER. Al menos un servicio, máximo 100, sin duplicados. El retorno es el UUID de la visita, utilizado para leer el resumen persistido con RLS.

No parámetros para tenant, comisión, subtotal, total, nombres/precios de catálogo ni fecha. Campos extra en items/nuevo cliente se rechazan. Server Action solo transmite campos permitidos.

## Atomicidad y permisos
- Wrapper público SECURITY INVOKER llama al cuerpo privado SECURITY DEFINER. El privilegio especial se limita a esta operación crítica porque las tablas visits/visit_items siguen sin permisos de escritura directa para authenticated.
- EXECUTE revocado a PUBLIC/anon y concedido a authenticated. search_path vacío y referencias calificadas.
- Cuerpo comprueba auth.uid y membresía OWNER real. Obtiene la primera membresía por created_at/id, igual que requireOwner; no acepta barbershop_id del cliente.
- SELECT FOR SHARE sobre membresía, barbero, cliente existente y servicios evita que su revocación/edición/desactivación se intercale durante el registro. Bloqueos de servicios en orden estable.
- Todos los IDs se verifican dentro del tenant y los barberos/servicios deben estar activos. Lecturas de búsqueda, éxito y detalle usan RLS y filtro tenant.
- Cliente nuevo, visita y todos los items se insertan en una sola llamada PostgreSQL. No hay commits intermedios ni captura que oculte errores SQL. Cualquier excepción revierte la llamada entera.
- Prueba de atomicidad provoca un error al insertar el segundo servicio: verifica que no queda el primer item, ni visita, ni cliente nuevo.

## Dinero y snapshots
- COP enteros: bigint para importes; numeric(5,2) para comisión.
- `subtotal = sum(charged_price)`; `0 <= discount <= subtotal`; `total = subtotal - discount`.
- `commission_amount = round(total_amount::numeric * commission_rate / 100)::bigint`.
- 35.000 × 33,33% = 11.665,50 → comisión 11.666; barbería 23.334.
- Parte de barbería no se almacena: total - commission_amount.
- VISIT: comisión tomada del barbero en DB; VISIT_ITEM: service_id, service_name, catalog_price y charged_price. Cambios futuros al catálogo/comisión no reescriben snapshots.
- visited_at = clock_timestamp() y notes = NULL; presentación Bogotá según restricción vigente del schema.
- UI usa BigInt para sumas y validación. Precio cobrado y subtotal limitados a 9.007.199.254.740.991 COP, coherente con Fase 2 y representación JSON segura. Target TypeScript elevado a ES2020 para BigInt.

## Pruebas y revisión
- `npm run lint`: sin errores ni advertencias.
- `npm run typecheck`: correcto.
- `npm test`: 95 pruebas pasan (6 nuevas enfocadas en transacción y validación).
- `npm run test:e2e`: 15 pruebas pasan; incluye build de producción y 3 flujos nuevos a 360, 390 y 430px.
- Flujos E2E: ocasional/existente/nuevo, búsqueda por teléfono y nombre sin cliente ajeno, múltiples servicios, precio personalizado, descuento, rounding persistido, detalle y nuevo formulario limpio. Dos submits mientras la primera petición está detenida generan solo una petición/visita.
- Rechazo RPC con barbero desactivado entre carga y submit: mensaje seguro, valores conservados, desbloqueo y retry exitoso.
- SQL: autorización/roles/revocación, tenant ajeno, inactivos, datos inválidos, máximo seguro/overflow, snapshots y rollback tardío.
- `supabase db advisors --local --type all --level warn`: sin incidencias.
- Revisión independiente: sin defectos bloqueantes; sugerencias de prueba incorporadas.
- Auditor UI heurístico: limitación conocida con Button asChild/Link; funcionalidad verificada por Playwright. No se modifica el componente para engañar al auditor.
- Capturas revisadas en docs/screenshots/phase-3 para los tres anchos. Las capturas de página completa pueden mostrar la barra fija en la posición del viewport; en uso se desplaza el contenido detrás y hay padding inferior para todas las acciones.

## Decisiones / Fase 3B
- Sin idempotencia distribuida, conforme al alcance. Se evita doble toque en el formulario activo; no se garantiza exactly-once entre pestañas ni ante pérdida de respuesta después de commit.
- No hay historial/listado de visitas todavía; el acceso a detalle se ofrece desde éxito y por su URL.
- Cliente/barbero muestran su nombre actual en detalle; los snapshots requeridos de servicio y comisión sí son históricos. No se añadieron snapshots nuevos fuera del schema aprobado.
- Dejar update_visit y void_visit, permisos y UX de edición/anulación para 3B. Mantener creación de cliente y visita atómica y reglas de snapshots al diseñar esa fase.
- No despliegue remoto ni nuevas variables de entorno. Se usa la integración local existente. Fase siguiente pendiente de aprobación.
