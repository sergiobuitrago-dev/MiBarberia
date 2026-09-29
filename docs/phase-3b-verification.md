# Fase 3B — Historial y anulación

## 1. Resumen y alcance

Implementado el circuito registrar → historial → detalle → confirmar anulación → ANULADA. Las visitas y sus servicios permanecen en la base de datos. No se implementaron edición, update_visit, restauración, dashboard, fidelización, filtros, búsqueda, reportes ni exportación.

## 2. UX resultante

- Navegación inferior Inicio / Visitas / Más. Visitas abre `/visitas`.
- Nueva visita permanece prominente en Inicio e historial. El detalle ofrece Registrar otra visita.
- Historial en filas táctiles: cliente o Cliente ocasional, servicios, total, barbero, pago y fecha/hora. ANULADA se distingue con texto y color; no se filtra ni se mueve de posición.
- Detalle con cliente, fecha/hora, barbero, servicios y precios cobrados, subtotal, descuento, total, pago y estado. Sin UUID, IDs de base de datos ni comisión.
- Fecha en español colombiano, zona America/Bogota, consistente con el esquema actual.
- Anular visita abre una confirmación en línea con consecuencias y carácter definitivo. Cancelar recibe foco, Escape cierra y devuelve el foco al disparador. El desplazamiento mantiene los controles enfocados sobre la barra inferior.
- Durante el envío se deshabilitan ambas acciones, se bloquea el doble submit y se mantiene el ancho del botón de progreso.
- La interfaz solo muestra el resultado tras confirmar la RPC; no hay anulación optimista.
- Ante un conflicto/rechazo, mensaje seguro y enlace Actualizar detalle. Una pantalla abierta antes de que otro cliente anule no puede sobrescribir el estado ni renovar voided_at.
- Reutilización de Button y de la confirmación del catálogo extraída a ConfirmAction. El catálogo conserva su comportamiento y está cubierto por la suite existente.

## 3. Migración y RPC

Archivo: [20260929132618_void_visit.sql](../supabase/migrations/20260929132618_void_visit.sql).

Aplicada exclusivamente a Supabase local mediante `supabase migration up --local`, sin reset. No se modificó ni desplegó una base remota. Se regeneró `src/types/database.ts`.

El esquema ya tenía status, voided_at, su constraint de consistencia y el índice `(barbershop_id, visited_at DESC)`. No se añadieron tablas ni índices.

## 4. Contrato de void_visit

```sql
public.void_visit(p_visit_id uuid) returns uuid
```

- Único argumento: identificador de visita; no recibe barbería, estado ni fecha desde el navegador.
- Éxito: devuelve el UUID de la visita después de cambiar ACTIVE → VOIDED y asignar `clock_timestamp()` a voided_at.
- Conserva cliente, barbero, servicios, snapshots, pago e importes. El trigger existente mantiene updated_at.
- Autenticación ausente: AUTH_REQUIRED / SQLSTATE 42501. Sin membresía OWNER: OWNER_REQUIRED / 42501. El rol anon no tiene EXECUTE.
- Visita inexistente, de otro tenant o ya anulada: idéntico VISIT_UNAVAILABLE / 22023. Sin detalles que revelen la existencia o estado de otra barbería.
- Un UPDATE condicional por ID, barbería autorizada y status ACTIVE realiza la transición atómica. Los bloqueos de fila serializan los intentos concurrentes: exactamente uno puede tener éxito.
- No hay restauración ni ruta API de edición. Una repetición rechazada tampoco cambia voided_at.

## 5. Aislamiento entre barberías

- La Server Action exige requireOwner; el historial y detalle aplican filtro por la barbería del servidor además de RLS.
- La RPC vuelve a comprobar auth.uid() y la membresía OWNER real. Elige la primera por created_at/id, igual que requireOwner/create_visit.
- La membresía se bloquea FOR SHARE durante la operación; una revocación no puede intercalarse en la transacción.
- Wrapper público SECURITY INVOKER y cuerpo privado SECURITY DEFINER, search_path vacío, referencias calificadas y EXECUTE limitado a authenticated.
- No se conceden escrituras directas sobre visits/visit_items. Sin DELETE ni privilegios para volver a ACTIVE desde la API.
- Detalles ajenos e inexistentes muestran la misma pantalla Visita no disponible. La API devuelve el mismo código HTTP y objeto de error para ambas anulaciones.
- Las claves privilegiadas se usan únicamente en fixtures locales de pruebas, nunca en el frontend del producto.

## 6. Listado y paginación

25 visitas por página, orden `visited_at DESC, id DESC`, consulta por offset/range y conteo exacto del tenant. Anterior/Siguiente mantienen la página en `?pagina=N`. No se descarga todo el historial.

Página inválida normalizada, vacío inicial y página fuera de rango con retorno al historial. PostgREST devuelve 416/PGRST103 para un offset fuera de rango: se presenta como página vacía, sin exponer el error interno.

Límite deliberado: el orden es estable para fechas empatadas, pero no hay snapshot entre páginas. Si se registran visitas mientras se navega, un offset puede desplazarse. Es la paginación sencilla acordada para el piloto; volver a página 1 muestra lo reciente.

## 7. Pruebas y verificaciones

- `npm run lint`: pasa sin errores ni advertencias.
- `npm run typecheck`: pasa.
- `npm test`: 99/99 pruebas pasan (4 pruebas SQL nuevas).
- `npm run test:e2e`: 16/16 pruebas pasan en Chromium; incluye `npm run build` y servidor de producción. Se ampliaron los 3 flujos de visita existentes y se añadió una prueba integrada de historial/aislamiento/concurrencia.
- `supabase db advisors --local --type all --level warn`: sin incidencias.
- `supabase migration list --local`: las 4 migraciones están aplicadas, incluida void_visit.
- Revisión independiente de código: sin hallazgos accionables. Correcciones posteriores acotadas a foco visible sobre barra fija y límite fuera de rango, verificadas en E2E.
- Capturas de los tres anchos revisadas visualmente; controles de confirmación comprobados por geometría frente a la barra inferior.

Auditor UI: se ejecutó `audit_project.py . --mode strict`; termina con código 1 y 18 detecciones de `affordance.actionless-button`, todas correspondientes a Button asChild con Link (limitación conocida desde Fase 3). Son enlaces reales, verificados en navegador; no se alteró el componente para silenciar el auditor. Evidencia: [phase-3b-ui-audit.json](phase-3b-ui-audit.json). No se presenta esta verificación estática como aprobada.

Advertencias de herramientas: Node informa MODULE_TYPELESS_PACKAGE_JSON al ejecutar los tests de validación TypeScript, y Playwright informa NO_COLOR/FORCE_COLOR. No son fallos de las pruebas. No hay formatter ni suite visual-regression configurados en package.json; la comprobación visual se hizo sobre capturas reales.

Durante la verificación se detectaron y corrigieron dos problemas de producto: el 416 de PostgREST al pedir una página fuera de rango y el foco de confirmación oculto por la barra móvil. Ambos tienen regresión E2E. Dos ajustes adicionales corrigieron selectores/comparación de texto de las nuevas pruebas.

Cobertura añadida o ampliada:

- Visita activa anulable, voided_at servidor y repetición rechazada sin cambiar timestamps.
- Conservación de la fila, importes y todos los visit_items; escrituras directas y restauración rechazadas.
- OWNER, BARBER, usuario sin membresía, anon y revocación; visitas ajenas invisibles y no anulables.
- Paridad de errores RPC y pantalla entre visita inexistente y ajena.
- Historial de 26 registros: 25 en página 1 y 1 en página 2; fecha más reciente primero y desempate por ID; límites y vacío inicial.
- Detalle con snapshot de servicio aunque el catálogo tenga otro nombre/precio, descuento y total persistidos.
- Dos anulaciones concurrentes: un éxito y un rechazo; recuperación de una confirmación abierta con estado obsoleto.
- Registro → historial inmediato → detalle → cancelar/confirmar → ANULADA → historial visible → nueva visita limpia, a 360/390/430px.
- Estado pendiente, teclado, foco visible sobre navegación fija, ausencia de overflow y reduced motion.

## 8. Capturas móviles

Capturas reales de Chromium con fixtures locales temporales. Se guardan las cuatro pantallas a los tres anchos:

| Ancho | Historial | Detalle | Confirmación | Anulada |
|---|---|---|---|---|
| 360 px | [Ver](screenshots/phase-3b/historial-360.png) | [Ver](screenshots/phase-3b/detalle-360.png) | [Ver](screenshots/phase-3b/confirmacion-360.png) | [Ver](screenshots/phase-3b/anulada-360.png) |
| 390 px | [Ver](screenshots/phase-3b/historial-390.png) | [Ver](screenshots/phase-3b/detalle-390.png) | [Ver](screenshots/phase-3b/confirmacion-390.png) | [Ver](screenshots/phase-3b/anulada-390.png) |
| 430 px | [Ver](screenshots/phase-3b/historial-430.png) | [Ver](screenshots/phase-3b/detalle-430.png) | [Ver](screenshots/phase-3b/confirmacion-430.png) | [Ver](screenshots/phase-3b/anulada-430.png) |

## 9. PRODUCT_SPEC y decisiones

- La sección 28 del PRODUCT_SPEC contempla edición. Se difiere expresamente por la decisión aprobada para Fase 3B: anular y registrar de nuevo. No existe update_visit.
- La comisión se omite del detalle conforme al alcance aprobado; su snapshot e importe se conservan sin cambios.
- Las exclusiones de visitas VOIDED en dashboard, comisiones agregadas y fidelización serán responsabilidad de esos módulos cuando se implementen. No se han creado en esta fase.
- No hubo cambios en la identidad visual: tokens de globals.css, tipografía, bordes, radios y Button existentes. DESIGN.md y UX-CONTRACT.md reflejan navegación, 25 filas y confirmación compartida.

La Fase 3B se entrega para aprobación. No se avanza al Dashboard.
