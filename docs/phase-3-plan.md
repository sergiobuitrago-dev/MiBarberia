# Fase 3 — Nueva Visita

Solicitud autorizada: docs/phase-3-spec.md. Operación nueva transaccional; sin ampliar CRUD simple ni agregar dashboard.

1. RPC create_visit: wrapper invoker público y cuerpo privado definer, ejecución solo authenticated, auth.uid + membresía OWNER comprobada y bloqueada. Sin tenant entrante; misma primera membresía ordenada que requireOwner. Bloquear barbero/servicios mientras se toman snapshots. Validar cliente existente/nuevo, IDs activos, duplicados, enteros COP, descuento y pago. Una transacción, sin capturar excepciones SQL.
2. Tests de base antes de implementación: ocasional/existente/nuevo, múltiples servicios, precios, descuento, rounding, snapshots, tenant/roles/inactivos y fallo deliberado al insertar items para demostrar rollback completo.
3. Nueva visita en una pantalla con opciones visibles. Ocasional por defecto; efectivo por defecto; barbero siempre explícito. Buscar clientes tras dos caracteres, máximo 10 resultados; sin descargar todos. Crear cliente se aplaza al RPC. Servicios con precio editable al seleccionar. Resumen y acción, campos preservados ante errores, bloqueo inmediato con ref + pending.
4. Éxito y detalle mínimo consultados mediante RLS; navegación sin listado/dashboard. Repetir registro con formulario limpio. Edición/anulación para 3B.
5. Pruebas de integración y mobile a 360/390/430; capturas, revisión independiente, lint/typecheck/build y documentación. Sin reset ni cambios a datos reales.

Dinero: enteros seguros JS en UI (máximo 9007199254740991), sumas con BigInt; bigint/numeric en PostgreSQL. Comisión exacta: round(total_amount::numeric * commission_rate / 100)::bigint. Sin almacenar parte de barbería.

Doble submit: bloqueo inmediato en cliente; sin idempotencia distribuida. Un fallo de red después del commit puede dejar resultado incierto; documentarlo sin prometer exactly-once.
