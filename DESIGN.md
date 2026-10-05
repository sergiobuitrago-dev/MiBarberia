# MiBarbería

## Overview
Configuración operativa para propietarios de 1–3 barberías. Español colombiano, mobile-first 360–430px. Una lista corta y una acción clara por pantalla. Dashboard operacional derivado de visitas activas; sin módulos futuros simulados.

## Colors
Identidad oscura única «carbón y latón sobrio». Tokens en src/app/globals.css: background #0B0C0E; card/surface #131519; surface-elevated/muted #1C1F24; border #343840; foreground #F5F2EA; muted-foreground #A5A6AD; primary #C9A66B; primary-foreground #111216; success #83C59B; destructive #F08D88. Input/scrollbar #747982 para límites reconocibles. Ring deriva de primary. color-scheme: dark para controles nativos; sin selector ni seguimiento del sistema.

Dorado sólido solo para acciones principales. Selección: fondo primary/10, borde primary/70 y texto primary. Semántica de éxito/error independiente de marca. Sin gradientes ni colores fijos por pantalla.

## Typography
Arial/Helvetica del sistema, sin descargas externas. Se mantiene por alcance; no es una elección definitiva de marca. Títulos 30px extra-bold con tracking ajustado; cuerpo 16px; etiquetas y ayudas 14px; contexto 12px. Números tabulares para precios y comisiones.

## Layout
Una columna de máximo 36rem, padding horizontal 20px. Formularios de dos campos en páginas dedicadas. Navegación inferior Inicio/Visitas/Comisiones/Más (Clientes dentro de Más) con espacio para safe-area y padding inferior del contenido. Catálogos con máximo 20 registros por página; historial de visitas con 25.

## Elevation & Depth
Jerarquía por background → card → surface-elevated. Bordes solo para controles, selección y separadores útiles. Dashboard con cuatro cards de métricas y cards compactas de producción, sin bordes ni sombras decorativas; pagos y servicios conservan listas abiertas.

## Shapes
Contenedores 16px de radio, botones 8px. Controles de al menos 44px de alto. Scrollbar visible y gutter estable.

## Components
Button/Input de src/components/ui son canónicos. CatalogMenu es la entrada a configuración; CatalogList presenta registros activos; CatalogForm valida y conserva entradas; DeactivateForm confirma en línea con foco inicial en Mantener activo. OwnerNavigation identifica la ruta activa.

## Do's and Don'ts
Usar nombres y precios reales del tenant autorizado. Etiquetas explícitas, foco visible, errores asociados y estados pendientes. No tablas móviles, fotos ficticias, métricas simuladas, iconos decorativos innecesarios ni navegación a funciones no implementadas.

## Verification
Playwright a 360, 390 y 430px: CRUD, errores, confirmación, overflow y aislamiento. Capturas de listas y edición con fixtures temporales.

## Fase 3 — registro de visita
Se mantiene la identidad aprobada. Nueva visita usa secciones abiertas, botones táctiles de selección y servicios seleccionados con precio editable en su propia fila. Sin selects ni pasos modales. Resumen final con total prominente. La Fase 3B omite la comisión también del detalle. Navegación inferior Inicio/Visitas/Más, con Nueva visita prominente en Inicio e historial. Pantalla de éxito con confirmación verde y resumen persistido.

## Fase 3B — historial y anulación
Historial escaneable en una columna: cliente, servicios, total, barbero/pago y fecha en español colombiano (America/Bogota). Orden visited_at DESC, id DESC; 25 visitas por página, enlaces Anterior/Siguiente. Las anuladas conservan su lugar y muestran ANULADA con texto y tono destructivo.

Detalle con precio cobrado, subtotal, descuento y total; sin UUID, IDs ni comisión. Regreso superior a Visitas y acción Registrar otra visita. ConfirmAction es el componente compartido para confirmar en línea la desactivación de catálogo y la anulación de visita: foco en cancelar, Escape, restauración de foco, bloqueo de doble envío y ancho estable al mostrar progreso. Anular es definitivo y separado de la acción primaria. No se agregan modales, tokens ni estilos de marca.

## Fase 4 — Dashboard
Inicio es el resumen operativo. Se mantiene el nombre de la barbería como título, seguido por cuatro opciones de periodo en dos columnas y Nueva visita prominente. Un panel de métricas contiene Ventas destacadas y filas de Visitas, Comisiones y Para barbería. Pagos, producción por barbero y top cinco servicios usan listas con separadores, sin gráficas ni widgets adicionales. Catálogos siguen en Más.

Personalizado utiliza dos controles nativos de fecha, con etiquetas españolas, layout de una columna en móvil y botón Aplicar periodo. Se acepta el calendario y geometría propios del navegador/sistema operativo; la interpretación del rango pertenece exclusivamente a PostgreSQL y a la timezone de la barbería. No se añade biblioteca de calendarios. Los importes usan BigInt para presentar COP exactos. Tokens globales, tipografía y componentes Button/Input permanecen sin cambios.

## Rediseño visual aprobado — carbón y latón
Wordmark compartido: Mi blanco roto y Barbería dorado. Button selected diferencia selección de acción primaria; Input usa superficie elevada y borde con contraste. OwnerNavigation conserva Inicio/Visitas/Más con iconos SVG de trazo uniforme y estado dorado tenue. Sin nuevas dependencias. Login, formularios, historial, detalle y catálogos usan los mismos tokens.

## Fase 5 — Clientes
Se conserva la identidad carbón/dorado aprobada. OwnerNavigation añade Clientes: Inicio/Visitas/Clientes/Más, con las mismas áreas táctiles y safe-area. Listado compacto de 25 filas con nombre, teléfono y visitas/gasto; sin tabla móvil. Perfil con resumen en una sola superficie e historial separado, extensible con un bloque futuro sin placeholders de Fidelización. Edición en página dedicada de dos campos, reutilizando Button/Input y el patrón de catálogo.

Búsqueda explícita mediante Buscar/Enter (sin peticiones por tecla); limpiar restaura el listado y conserva foco. Durante la consulta el campo permanece enfocable y de solo lectura para evitar que una respuesta anterior sustituya una entrada nueva. URL conserva búsqueda/página; nueva búsqueda reinicia página 1. Sin nuevas fuentes, colores, dependencias ni ajustes visuales en Dashboard/Visitas.


## Fase 6 — Home operacional y comisiones semanales

Sustituye las reglas visuales anteriores de Dashboard y navegación. Las secciones históricas
anteriores describen cada entrega; esta sección define la experiencia vigente.

Cuatro cards en dos columnas: Ventas (con N visitas), Visitas, Comisiones y Para barbería.
Importes largos ocupan dos columnas; nunca se truncan. Cifras de ventas/producción en success,
comisiones en destructive y para barbería en primary. Visitas neutral. Superficies oscuras,
sin gradientes, glow, sombras nuevas ni colores asignados a barberos. El significado siempre
se expresa también mediante etiquetas. No se habla de utilidad ni de ganancia neta.

Orden: encabezado, periodo, Nueva visita, métricas, Ventas — últimos 7 días, métodos de pago,
producción por barbero y Top servicios. Una sola gráfica SVG de línea con escala desde cero,
siete fechas cronológicas incluyendo hoy, día de semana y día del mes. Máximo diario en COP,
valores exactos accesibles y disclosure nativo con desglose diario operable por teclado.
Es independiente del periodo; siete ceros mantienen línea/etiquetas y mensaje claro.

BarberProductionCard es canónico para Home y Comisiones; muestra nombre, visitas, producción
y comisión. Variante semanal añade Ver detalle. Detalle en página dedicada, sin edición,
con totales completos y lista de visitas paginada. Navegación de semana anterior/actual/siguiente
con áreas táctiles de 44px. Rango incluye año para desambiguar consultas históricas.

OwnerNavigation conserva cuatro entradas: Inicio/Visitas/Comisiones/Más. Clientes es la primera
entrada de Más; su ruta mantiene Más activo. Cuenta y logout viven al final de Más. Se conserva
la barra inferior y el ancho máximo 36rem también en desktop.

Tokens: globals.css es la fuente runtime canónica; sus variables :root alimentan @theme inline
y las utilidades Tailwind de todos los componentes. Este documento refleja esos valores;
no genera CSS. Fase 6 no modifica ningún token ni añade dependencias.
