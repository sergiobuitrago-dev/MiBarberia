# Fase 2 — entrega

## Implementación
- Inicio y Más con acceso a Barberos/Servicios; navegación inferior mobile.
- Listas de activos, creación, edición y desactivación confirmada. Sin DELETE.
- Formularios de dos campos con etiquetas, errores, foco, conservación de valores y prevención de doble envío. Feedback de éxito en lista, vacío y error recuperable.
- Comisión 0–100 con hasta dos decimales; nombre recortado de 1–120 caracteres; precio entero COP y formato $30.000.
- Páginas y Server Actions verifican sesión OWNER; tenant derivado del servidor. CRUD directo con cliente Supabase de sesión, filtros de tenant y RLS existente. No RPC ni credencial administrativa en runtime.
- Ninguna migración nueva ni cambios a políticas existentes. Sin despliegue remoto.

## Archivos principales
- src/app/(owner): shell, Inicio, Más y rutas de listas/nuevo/editar.
- src/features/catalog: validación, configuración, acciones, formularios, navegación y pantallas compartidas.
- src/lib/auth.ts: devuelve también cliente de sesión verificado.
- DESIGN.md y UX-CONTRACT.md: lenguaje visual y comportamiento.
- tests/catalog.test.mjs y tests/e2e/catalog.spec.ts: validación y flujos reales.
- tests/database.test.mjs: provisioning usa fixtures aunque el SQL manual tenga valores personalizados; conteo relativo al estado inicial. No se modificó el SQL personalizado del usuario.

## Verificación
- npm test: 89 pruebas pasan (87 existentes, 2 nuevas de validación).
- npm run test:e2e: 12 pruebas pasan (10 auth existentes, 2 flujos completos nuevos). Incluye build de producción.
- npm run lint y npm run typecheck: sin errores ni advertencias.
- Revisión independiente estática: sin problemas significativos.
- Navegador Chromium: CRUD, valores inválidos, foco, cancelación/confirmación, retención del registro inactivo, manipulación de ID ajeno, acceso a editor ajeno denegado y anchos 360/390/430px.
- Pruebas con tenants temporales locales; limpieza restringida a sus IDs. Datos de Sergio Barber Shop preservados. Sin db reset.
- Auditor visual estático: falsos positivos en Button asChild con Link (sí navegan; verificado con Playwright). El auditor interpreta el componente como button literal e ignora asChild. No se agregaron acciones artificiales para silenciarlo.
- Linter DESIGN.md: sin errores; advierte ausencia de YAML, documento intencionalmente Markdown.

## Decisiones y límites
- Páginas para formularios en lugar de drawers: teclado y navegación simples.
- Máximo 20 activos por página, sin filtros innecesarios.
- Precio máximo aceptado 9.007.199.254.740.991 COP (entero seguro JavaScript), aunque bigint PostgreSQL admite más. Evita pérdida silenciosa de precisión.
- Sin reactivación en UI (fuera del alcance solicitado).
- Cancelar o navegar abandona cambios no guardados; no hay autoguardado.
- Nueva Visita sigue pendiente de aprobación. En esa fase deben conservarse snapshots de precio, nombre y comisión; seleccionar solo registros activos y definir redondeo de comisión al peso. Las funciones transaccionales de VISIT permanecen para esa fase.
