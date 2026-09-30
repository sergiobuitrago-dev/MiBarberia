# Reporte del rediseño visual

Implementado el 29 de septiembre de 2026. Pendiente de revisión visual del propietario; no se avanzó a nuevas funcionalidades.

## Resultado visual

Apariencia oscura única: fondo carbón, superficies escalonadas, texto cálido y dorado mate. Nueva visita mantiene la acción principal sólida. Las selecciones usan dorado tenue; éxito y anulación/error conservan colores semánticos y texto explícito. Dashboard presenta un panel de métricas sin borde, ventas destacadas y listas abiertas para el resto de información. Historial, detalle y catálogos usan superficies sin marcos decorativos.

Arial/Helvetica se conserva sin dependencias nuevas; no se fija como identidad definitiva. La jerarquía usa tamaños, peso, tracking y espaciado. Mi aparece en blanco cálido y Barbería en dorado.

## Tokens y componentes compartidos

- `src/app/globals.css`: background #0B0C0E, card #131519, surface-elevated #1C1F24, foreground #F5F2EA, muted-foreground #A5A6AD, primary #C9A66B, primary-foreground #111216, border #343840, success #83C59B y destructive #F08D88. Input/scrollbar #747982 y ring derivado de primary. Color-scheme dark y tipografía/navegación centralizadas.
- `src/components/ui/button.tsx`: acción primaria dorada y variante selected; estados de foco, deshabilitado y destructivo.
- `src/components/ui/input.tsx`: superficie elevada y límite visible.
- `src/components/ui/wordmark.tsx`: marca compartida nueva, sin recursos externos.
- `src/features/catalog/navigation.tsx`: misma navegación inferior con iconos SVG y estado activo dorado.
- Layout, login, ConfirmAction y pantallas existentes adaptados a la misma jerarquía de superficies.
- DESIGN.md y UX-CONTRACT.md documentan la decisión y el contrato preservado.

## Alcance preservado

Sin cambios en schema, migraciones, RPC, RLS, autenticación, acciones de negocio, validaciones, cálculos ni comportamiento de visitas. Comparación SHA-256 de los 17 archivos protegidos (backend, acciones, validación, periodos y package.json): cero diferencias. Sin nuevas dependencias ni fuentes. Las escrituras de pruebas se limitaron a fixtures temporales de Supabase local y su limpieza.

## Verificación

| Comprobación | Resultado |
|---|---|
| npm run lint | Correcto |
| npm run typecheck | Correcto |
| npm run build | Correcto, ejecutado por el servidor de Playwright antes de las pruebas |
| npm test | 105/105 correctas, ninguna omitida |
| npm run test:e2e | 18/18 correctas |
| Reejecución del test visual tras ajustar la espera de navegación | 1/1 correcto; build repetido correctamente |
| Revisión de imágenes en 360, 390 y 430 px | Ocho vistas y navegación inferior verificadas, sin overflow horizontal |
| Revisión estática independiente | Sin hallazgos accionables |

Las capturas iniciales de algunas rutas a 360 px se adelantaban a la navegación. Se corrigió exclusivamente el test para esperar el encabezado esperado y se regeneraron las 24 capturas.

Contraste calculado: texto del botón primario 8,16:1; texto principal sobre superficie 16,34:1; texto secundario sobre elevada 6,81:1; éxito 9,07:1; destructivo 7,72:1; borde de input sobre elevada 3,78:1. La revisión se realizó en Chromium con viewport móvil; no representa pruebas físicas de Safari/iOS o Android.

La auditoría heurística premium en modo estricto devuelve 20 avisos de botón sin acción, todos sobre Button asChild con Link y href. Se revisaron como falsos positivos del analizador; los enlaces conservan sus destinos y los flujos están cubiertos por E2E. El resultado bruto está en visual-theme-ui-audit.json; no se presenta como una auditoría automática sin advertencias.

## Capturas a 390 × 844 px

Capturas reales con datos temporales de prueba. La vista de servicios seleccionados está desplazada hasta Servicios para mostrar selección, precios, pago y total. Las pantallas largas conservan scroll normal.

- [Login](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/login-390.png)
- [Inicio](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/inicio-390.png)
- [Nueva visita](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/nueva-visita-390.png)
- [Nueva visita con servicios seleccionados](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/visita-seleccionada-390.png)
- [Historial](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/historial-390.png)
- [Detalle](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/detalle-390.png)
- [Barberos](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/barberos-390.png)
- [Servicios](/Users/checho/Documents/Code/Proyectos/MiBarberia/docs/screenshots/visual-theme/servicios-390.png)

También se conservan las mismas ocho vistas a 360 y 430 px en docs/screenshots/visual-theme/.
