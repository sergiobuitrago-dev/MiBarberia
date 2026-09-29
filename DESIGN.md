# MiBarbería

## Overview
Configuración operativa para propietarios de 1–3 barberías. Español colombiano, mobile-first 360–430px. Una lista corta y una acción clara por pantalla. Sin dashboard ni módulos futuros simulados.

## Colors
Fondo #f8fafc; superficie #ffffff; texto y acción #0f172a; secundario #475569; borde #cbd5e1; error #b91c1c. Acento de marca #1d4ed8. Confirmación: fondo #ecfdf5 y texto #064e3b. Tokens globales en src/app/globals.css.

## Typography
Arial/Helvetica del sistema, sin descargas externas. Títulos 30px bold con tracking ajustado; cuerpo 16px; etiquetas y ayudas 14px; contexto 12px. Números tabulares para precios y comisiones.

## Layout
Una columna de máximo 36rem, padding horizontal 20px. Formularios de dos campos en páginas dedicadas. Navegación inferior Inicio/Visitas/Más con espacio para safe-area y padding inferior del contenido. Catálogos con máximo 20 registros por página; historial de visitas con 25.

## Elevation & Depth
Superficies planas, separación por borde. Sin sombras decorativas ni capas modales.

## Shapes
Contenedores 16px de radio, botones 8px. Controles de al menos 44px de alto. Scrollbar visible y gutter estable.

## Components
Button/Input de src/components/ui son canónicos. CatalogMenu es la entrada a configuración; CatalogList presenta registros activos; CatalogForm valida y conserva entradas; DeactivateForm confirma en línea con foco inicial en Mantener activo. OwnerNavigation identifica la ruta activa.

## Do's and Don'ts
Usar nombres y precios reales del tenant autorizado. Etiquetas explícitas, foco visible, errores asociados y estados pendientes. No tablas móviles, fotos ficticias, métricas, iconos decorativos innecesarios ni navegación a funciones no implementadas.

## Verification
Playwright a 360, 390 y 430px: CRUD, errores, confirmación, overflow y aislamiento. Capturas de listas y edición con fixtures temporales.

## Fase 3 — registro de visita
Se mantiene la identidad aprobada. Nueva visita usa secciones abiertas, botones táctiles de selección y servicios seleccionados con precio editable en su propia fila. Sin selects ni pasos modales. Resumen final con total prominente. La Fase 3B omite la comisión también del detalle. Navegación inferior Inicio/Visitas/Más, con Nueva visita prominente en Inicio e historial. Pantalla de éxito con confirmación verde y resumen persistido.

## Fase 3B — historial y anulación
Historial escaneable en una columna: cliente, servicios, total, barbero/pago y fecha en español colombiano (America/Bogota). Orden visited_at DESC, id DESC; 25 visitas por página, enlaces Anterior/Siguiente. Las anuladas conservan su lugar y muestran ANULADA con texto y tono destructivo.

Detalle con precio cobrado, subtotal, descuento y total; sin UUID, IDs ni comisión. Regreso superior a Visitas y acción Registrar otra visita. ConfirmAction es el componente compartido para confirmar en línea la desactivación de catálogo y la anulación de visita: foco en cancelar, Escape, restauración de foco, bloqueo de doble envío y ancho estable al mostrar progreso. Anular es definitivo y separado de la acción primaria. No se agregan modales, tokens ni estilos de marca.
