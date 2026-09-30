# Contrato mínimo — Fase 1

| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Form | src/features/auth/login-form.tsx | noValidate, errores asociados, foco primer error, correo conservado y contraseña no devuelta por servidor | tests/e2e/auth.spec.ts |
| Auth | src/features/auth/actions.ts, src/lib/auth.ts | Supabase email/password, membresía OWNER en DB, redirección fija a /, cerrar sesión local | tests/e2e/auth.spec.ts |
| Scrollbar | src/app/globals.css | visible, colores globales y gutter estable | revisión CSS |

Sin registro público, recuperación de contraseña, OAuth, selectores de barbería
ni pantallas de negocio. Al no tener OWNER, mostrar acceso no habilitado y permitir
cerrar sesión. Si falla el backend, mostrar error recuperable sin revelar detalles.

## Fase 2
La configuración de barberos/servicios reemplaza la exclusión de pantallas de negocio de Fase 1. Las demás exclusiones permanecen.

| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Navegación | features/catalog/navigation.tsx | Inicio/Más, ruta activa y área segura inferior | catalog.spec.ts |
| Listas | features/catalog/screens.tsx | Solo activos del tenant; 20 por página; vacío y éxito textual; error recuperable global | catalog.spec.ts |
| Formularios | features/catalog/form.tsx | Etiquetas, noValidate, foco primer error, conservar valores, deshabilitar mientras guarda; cancelar vuelve sin guardar | catalog.spec.ts |
| Desactivación | DeactivateForm | Confirmación en línea, foco Mantener activo, sin borrado físico, pendiente y error | catalog.spec.ts |
| Mutaciones | features/catalog/actions.ts | Autenticación y tenant del servidor en cada operación; lista explícita de campos; RLS; cero filas no es éxito | catalog.spec.ts y database.test.mjs |

No hay edición automática: solo Guardar cambios persiste. Se usan páginas en lugar de drawers para evitar complejidad de foco y teclado móvil. Loading/error globales cubren también las rutas nuevas.

## Fase 3
| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Selección | features/visits/form.tsx | Botones aria-pressed, cliente ocasional y efectivo por defecto, barbero explícito, varios servicios | visits.spec.ts |
| Búsqueda cliente | customer-picker.tsx + api/customers | 2 caracteres, debounce 250ms, cancelar petición anterior, hasta 10 resultados del tenant por nombre/teléfono; error textual | visits.spec.ts |
| Dinero | features/visits/validation.ts | BigInt en feedback, enteros COP; subtotal y descuento visibles; DB autoridad | visit-validation.test.mjs y visits.test.mjs |
| Submit | features/visits/actions.ts + form.tsx | Bloqueo inmediato ref, disabled pendiente, errores seguros y valores preservados; redirect tras commit | visits.spec.ts |
| Persistencia | create_visit RPC | OWNER, tenant derivado, snapshots, atomicidad y rounding exacto | visits.test.mjs |
| Éxito/detalle | features/visits/detail.tsx | RLS, información persistida y registro nuevo limpio; sin edición/anulación | visits.spec.ts |

No cliente provisional: Cliente nuevo solo existe tras commit exitoso. Cliente ocasional usa NULL. No idempotencia distribuida; doble toque en el formulario activo se bloquea, sin promesa de exactly-once entre pestañas o reintentos después de una respuesta de red perdida.

## Fase 3B
Reemplaza la exclusión de anulación de Fase 3. La edición continúa excluida por decisión explícita del piloto; no hay restauración.

| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Historial | features/visits/history.tsx | OWNER + RLS, 25 por página, visited_at DESC/id DESC, anuladas visibles, vacío y límites con regreso, sin filtros/búsqueda | visit-history.spec.ts |
| Navegación | features/catalog/navigation.tsx | Inicio/Visitas/Más; Visitas abre historial; Nueva visita prominente en Inicio/historial | visits.spec.ts |
| Fecha/estado | features/visits/presentation.tsx | es-CO, America/Bogota, time semántico, ACTIVA/ANULADA con texto | visit-history.spec.ts |
| Detalle | features/visits/detail.tsx | Datos persistidos del tenant; snapshots de servicios; sin comisión/IDs; estado y regreso al historial | visits.spec.ts |
| Confirmación | components/ui/confirm-action.tsx | Variante en línea compartida con DeactivateForm; foco Cancelar/Mantener activo, Escape y foco al trigger; pendiente deshabilitado, doble submit bloqueado | visits.spec.ts y catalog.spec.ts |
| Anulación | features/visits/actions.ts + void_visit RPC | OWNER/tenant derivados, ACTIVE → VOIDED definitivo, tiempo servidor, cero borrados; éxito solo tras commit, revalidación de historial/detalle/éxito | void-visits.test.mjs |
| Error/concurrencia | ConfirmAction + voidVisit | Error seguro con Actualizar detalle; RPC no distingue inexistente/ajena/anulada; dos intentos concurrentes solo producen un éxito | visit-history.spec.ts |

Carga/error globales siguen cubriendo las rutas; detalle inaccesible muestra Visita no disponible sin revelar existencia ni tenant. La paginación es por offset como los catálogos; una inserción concurrente puede desplazar filas entre páginas. Volver a la primera página muestra lo más reciente. No hay snapshot de navegación entre páginas ni infinite scroll.

## Fase 4
Inicio sustituye la portada por Dashboard. Sin edición de visitas, Clientes/Fidelización ni otras fases.

| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Dashboard | features/dashboard/screen.tsx | Una RPC por carga; métricas y listas de ACTIVE; ceros y listas vacías; Nueva visita prominente | dashboard.spec.ts |
| Date | Input nativo type=date + dashboard/period.ts | Selector nativo aceptado; fechas ISO como días, validación calendario/rango server-side; GET restorable en URL; sin convertir periodos según navegador | dashboard-period.test.mjs |
| Periodos | get_dashboard RPC | Hoy local completo; semana lunes/mes día1 hasta statement_timestamp; personalizado ambos días mediante límite superior exclusivo | dashboard.test.mjs |
| Seguridad | get_dashboard + requireOwner | SECURITY INVOKER, RLS activa, OWNER y barbería/timezone derivados; ningún tenant del navegador | dashboard.test.mjs |
| Exactitud | RPC + cop/BigInt | Importes/counts como strings decimales, snapshot commission_amount, agregación de visitas separada de items | dashboard.test.mjs |
| Servicios | get_dashboard | Agrupa service_id; nombre actual incluso si está inactivo; fallback último snapshot del periodo; no escribe snapshots; cinco resultados con desempate estable | dashboard.test.mjs |
| Refresh | visits/actions.ts | Revalidate de Inicio después de crear/anular; nueva consulta al regresar; sin realtime ni métricas almacenadas | dashboard.spec.ts |

Loading/error globales siguen vigentes. Rango inválido conserva fechas y muestra error; no muestra cifras de otro periodo como si fueran el seleccionado. Al abrir Personalizado sin aplicar, la RPC de Hoy se utiliza únicamente para obtener la fecha local de los defaults, y no se presentan métricas hasta aplicar un rango válido. La validación exige fechas de años 0001 a 9999. Una actividad con total cero sigue contando como visita y mantiene su método/barbero/servicios.

## Rediseño visual — septiembre de 2026
Contrato funcional de fases anteriores sin cambios. Apariencia oscura única, tokens centralizados y Arial/Helvetica existente. Button incorpora selected para elecciones; Wordmark comparte Mi blanco/Barbería dorado; OwnerNavigation conserva las mismas rutas y aria-current. Jerarquía por superficies, con bordes en controles y separadores.

Verificación: tests/e2e/visual-theme.spec.ts recorre ocho vistas a 360/390/430 px, espera el encabezado de cada ruta antes de capturar y comprueba ausencia de overflow horizontal. Los tests funcionales existentes siguen cubriendo autenticación, CRUD, registro, anulación y Dashboard.

## Fase 5 — Clientes
Esta fase habilita Clientes; Fidelización permanece excluida.

| Capacidad | Responsable | Comportamiento | Verificación |
|---|---|---|---|
| Navegación | OwnerNavigation | Inicio/Visitas/Clientes/Más; ruta activa también en perfil/edición | customers.spec.ts |
| Search | customers/search.tsx + search_customers | Buscar/Enter explícito, sin debounce necesario al no buscar por tecla; limpiar con foco; pendiente bloquea edición temporalmente; URL q/pagina; nombre literal sin case, teléfono por dígitos | customers.test.mjs + customers.spec.ts |
| Métricas | customer_activity, vista security_invoker | COUNT de visitas ACTIVE, SUM total, MAX fecha; una visita cuenta una vez independientemente de servicios; sin persistencia; importes como strings exactos | customers.test.mjs |
| Listas | customers/screens.tsx | 25 filas, última ACTIVE DESC NULLS LAST/name/id; sin ocasionales artificiales; estados vacíos y páginas fuera de rango | customers.spec.ts |
| Perfil | customers/screens.tsx | Supabase server-side a vista y visitas; historial ACTIVE de 25 + 1 lookahead; fecha/id descendentes; datos de barbero y snapshots; métricas globales no dependen de página | customers.spec.ts |
| Form / CRUD | customers/form.tsx + actions.ts | Button/Input canónicos; nombre obligatorio, teléfono opcional/no único; validación server-side, foco primer error, entradas conservadas, pending, Cancelar; UPDATE limitado a name/phone con tenant del servidor y RLS | customer-validation.test.mjs + customers.spec.ts |
| Seguridad | requireOwner + RLS + filtros de tenant | Vista/RPC invoker; perfiles ajenos e inexistentes indistinguibles; sin nuevo permiso de escritura; zero-row update no es éxito | customers.test.mjs + customers.spec.ts |

No cache persistente de Clientes: layout OWNER force-dynamic existente; consultas nuevas en navegación. Edición revalida Clientes y Visitas por el nombre actual compartido. Acciones/RPC existentes de registro/anulación permanecen intactas. Consultas de resumen e historial separadas: cambios concurrentes entre ambas pueden reflejar instantes distintos; no se promete snapshot transaccional ni realtime. Paginación offset comparte la limitación ya aceptada del historial: una nueva visita puede desplazar filas entre páginas.
